#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { settleQueue } from './queue-settlement.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'web-sales.json');
const REQUIRED_BASIC_ROUTES = [
  'web',
  'map',
  'industry_media',
  'region_variant',
  'station_area',
  'industry_synonym'
];
const ENUMS = {
  websitePresence: ['confirmed', 'unconfirmed', 'confirmed_no_site'],
  renewalOpportunity: ['large', 'medium', 'small', 'undetermined', 'not_applicable'],
  leadStatus: ['candidate', 'excluded', 'recheck'],
  leadPriority: ['high', 'medium', 'low', null],
  visualStatus: ['verified', 'unverified'],
  businessStatus: ['active', 'closed', 'unknown', 'conflicting'],
  organizationControl: ['independent', 'franchise_local_possible', 'centralized_chain', 'unknown'],
  personalizationStatus: ['pending', 'ready', 'missing'],
  contactability: ['text_ready', 'phone_only', 'contact_not_found', 'contact_unverified'],
  salesReasonStatus: ['pending', 'ready', 'missing'],
  outreachStatus: ['pending', 'generated', 'reviewed', 'blocked_personalization', 'review_failed'],
  workflowStage: ['discovered', 'triaged', 'qualified', 'lead_ready', 'outreach_generated', 'reviewed'],
  workflowResult: ['in_progress', 'completed', 'excluded', 'personalization_missing', 'review_failed']
};
const ACTIVITY_STATUSES = ['active', 'uncertain', 'inactive'];
const WEB_GAP_STATUSES = ['strong', 'moderate', 'none', 'unknown'];
const TRIAGE_DECISIONS = ['pending', 'advance', 'defer', 'stop'];
const QUALIFICATION_STATUSES = ['pending', 'pursue', 'watch', 'drop'];
const QUALIFICATION_PRIORITIES = ['P1', 'P2', 'P3', null];
const EVIDENCE_STATUSES = ['observed', 'not_observed', 'not_checked', 'inaccessible'];
const OUTCOME_RESULTS = ['sent', 'previously_sent', 'unable', 'reopen', 'lead_skip', 'lead_reopen', 'reply', 'meeting', 'proposal', 'won', 'lost'];
const RECHECK_REASONS = [
  'operating_status_conflict',
  'business_identity_ambiguity',
  'official_source_ambiguity',
  'business_existence_ambiguity'
];
const REQUIRED_TEXT_CHECKS = ['instagram_dm', 'email', 'contact_form', 'official_line', 'other_text_channel'];
const CONTACT_CHECK_STATUSES = ['found', 'not_found', 'inaccessible', 'not_checked'];
const CONTACT_RESEARCH_STATUSES = ['pending', 'in_progress', 'access_limited', 'completed'];

function now() {
  return new Date().toISOString();
}

function tokyoDate(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const item = (type) => parts.find((part) => part.type === type).value;
  return `${item('year')}-${item('month')}-${item('day')}`;
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      result._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) result[key] = true;
    else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonAtomic(file, value) {
  ensureDir(path.dirname(file));
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
    });
}

function writeJsonlAtomic(file, records) {
  ensureDir(path.dirname(file));
  const temp = `${file}.tmp-${process.pid}`;
  const body = records.map((record) => JSON.stringify(record)).join('\n');
  fs.writeFileSync(temp, body ? `${body}\n` : '', 'utf8');
  fs.renameSync(temp, file);
}

function appendJsonl(file, record) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function loadConfig() {
  return readJson(CONFIG_PATH);
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeHost(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function stableKey(record) {
  const identity = record.identity ?? {};
  return `${normalizeText(identity.name)}|${normalizeText(identity.address || identity.region)}`;
}

function leadIdFor(record) {
  const identity = record.identity ?? {};
  const ascii = String(identity.name ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  const digest = crypto.createHash('sha256').update(stableKey(record)).digest('hex').slice(0, 10);
  return `${ascii || 'lead'}-${digest}`;
}

function sameBusinessForAutoMerge(left, right) {
  const a = left.identity ?? {};
  const b = right.identity ?? {};
  const name = normalizeText(a.name);
  const address = normalizeText(a.address);
  const otherRegion = normalizeText(b.region);
  const region = normalizeText(a.region);
  return Boolean(name && address && name === normalizeText(b.name) &&
    address === normalizeText(b.address) &&
    (!region || !otherRegion || region === otherRegion));
}

function availableLeadId(base, records) {
  const ids = new Set(records.map((record) => record.lead_id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function uniqueArray(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeEvidence(existing, incoming) {
  const byId = new Map();
  for (const item of [...(existing ?? []), ...(incoming ?? [])]) {
    if (item?.id) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function deepMerge(base, incoming) {
  if (incoming === undefined || incoming === null || incoming === '') return base;
  if (Array.isArray(base) || Array.isArray(incoming)) {
    const left = Array.isArray(base) ? base : [];
    const right = Array.isArray(incoming) ? incoming : [];
    return uniqueArray([...left, ...right]);
  }
  if (typeof base === 'object' && base && typeof incoming === 'object' && incoming) {
    const result = { ...base };
    for (const [key, value] of Object.entries(incoming)) result[key] = deepMerge(result[key], value);
    return result;
  }
  return incoming;
}

function defaultRecord(input) {
  const created = now();
  const base = {
    schema_version: input.schema_version ?? 4,
    lead_id: input.lead_id || null,
    identity: {
      name: '', aliases: [], region: '', address: '', industry: '', segment: '',
      business_status: 'unknown', unit_type: 'business', organization_control: 'unknown'
    },
    discovery_sources: [],
    website: { presence: 'unconfirmed', url: null, evidence: [] },
    visual: { status: 'unverified', desktop_checked: false, mobile_checked: false, evidence: [] },
    renewal: { opportunity: 'not_applicable', reasons: [] },
    triage: { decision: 'pending', reason: null, checked_at: null },
    activity: { status: 'uncertain', evidence_ids: [] },
    web_gap: { status: 'unknown', evidence_ids: [] },
    evidence: [],
    qualification: {
      status: 'pending', priority: null, reason: null, evidence_ids: [],
      web_proposal: null, business_use: null, next_action: null, review_after: null,
      rules_version: 1, checked_at: null
    },
    lead: {
      status: 'candidate', priority: null, proposal_type: null,
      reasons: [], exclusion_reasons: [], recheck: null
    },
    contacts: { channels: [], text_outreach_available: false, research_status: 'pending', research_checks: {} },
    contactability: 'contact_unverified',
    personalization: { status: 'pending', facts: [] },
    sales_reason_status: 'pending',
    sales_reason: null,
    outreach: { status: 'pending', message: null, individualized_part: null, reviewed: false },
    workflow: { stage: 'discovered', result: 'in_progress' },
    legacy_matches: [],
    observed_at: created,
    updated_at: created
  };
  const record = deepMerge(base, input);
  record.lead_id ||= leadIdFor(record);
  record.identity.segment ||= record.identity.industry;
  if (record.website.presence !== 'confirmed') record.renewal.opportunity = 'not_applicable';
  else if (record.renewal.opportunity === 'not_applicable') record.renewal.opportunity = 'undetermined';
  updateContactState(record);
  record.updated_at = created;
  return record;
}

function httpUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(String(value ?? '')).protocol); }
  catch { return false; }
}

function checkedAt(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value));
}

function normalizeChannel(channel) {
  const value = String(channel.value ?? '').trim();
  if (channel.type === 'instagram_dm' && /^@[\w.]+$/.test(value)) {
    return { ...channel, value: `https://www.instagram.com/${value.slice(1)}/` };
  }
  return channel;
}

function checkKey(channel) {
  return channel.type === 'other' ? 'other_text_channel' : channel.type;
}

function usableTextChannel(channel) {
  if (channel.official !== true || channel.sales_prohibited === true ||
    !httpUrl(channel.source_url) || !checkedAt(channel.checked_at)) return false;
  if (['recruitment', 'reservation', 'booking', 'personal'].includes(channel.purpose)) return false;
  const value = String(normalizeChannel(channel).value ?? '').trim();
  if (channel.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (channel.type === 'instagram_dm') return /^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?(?:\?.*)?$/.test(value);
  if (channel.type === 'official_line') return /^https:\/\/(lin\.ee|line\.me|accountpage\.line\.me|line\.naver\.jp)\//.test(value);
  if (channel.type === 'contact_form') return httpUrl(value) && ['general', 'business'].includes(channel.purpose);
  return channel.type === 'other' && channel.text_capable === true && httpUrl(value) && ['general', 'business'].includes(channel.purpose);
}

function effectiveResearchChecks(contacts) {
  const checks = Object.fromEntries(REQUIRED_TEXT_CHECKS.map((key) =>
    [key, { status: 'not_checked', value: null, source_url: null, checked_at: null, notes: null, ...(contacts?.research_checks?.[key] ?? {}) }]));
  // Existing channels with full positive evidence remain usable without a new search.
  for (const channel of contacts?.channels ?? []) {
    if (!usableTextChannel(channel)) continue;
    const key = checkKey(channel);
    const normalized = normalizeChannel(channel);
    checks[key] = { status: 'found', value: normalized.value, source_url: channel.source_url,
      checked_at: channel.checked_at, notes: checks[key].notes };
  }
  return checks;
}

function completedNegativeCheck(check) {
  return check.status === 'not_found' && httpUrl(check.source_url) && checkedAt(check.checked_at);
}

function assessContacts(contacts) {
  const checks = effectiveResearchChecks(contacts);
  const usable = (contacts?.channels ?? []).filter(usableTextChannel).map(normalizeChannel);
  const negativeComplete = REQUIRED_TEXT_CHECKS.every((key) => completedNegativeCheck(checks[key]));
  const researchStatus = usable.length || negativeComplete ? 'completed'
    : REQUIRED_TEXT_CHECKS.some((key) => checks[key].status === 'inaccessible') ? 'access_limited'
      : REQUIRED_TEXT_CHECKS.some((key) => checks[key].status !== 'not_checked') ? 'in_progress' : 'pending';
  const officialPhone = (contacts?.channels ?? []).some((channel) =>
    channel.type === 'phone' && channel.official === true && channel.sales_prohibited !== true &&
    normalizePhone(channel.value).length >= 9);
  const contactability = usable.length ? 'text_ready'
    : negativeComplete ? (officialPhone ? 'phone_only' : 'contact_not_found') : 'contact_unverified';
  return { checks, researchStatus, contactability };
}

function updateContactState(record) {
  record.contacts.channels = (record.contacts.channels ?? []).map(normalizeChannel);
  const assessment = assessContacts(record.contacts);
  record.contacts.research_checks = assessment.checks;
  record.contacts.research_status = assessment.researchStatus;
  record.contactability = assessment.contactability;
  record.contacts.text_outreach_available = assessment.contactability === 'text_ready';
}

function legacyMatches(record, legacyRoot) {
  if (!legacyRoot || !fs.existsSync(legacyRoot)) return [];
  const name = normalizeText(record.identity?.name);
  const host = normalizeHost(record.website?.url);
  if (!name && !host) return [];
  const matches = [];
  for (const entry of fs.readdirSync(legacyRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const full = path.join(legacyRoot, entry.name);
    const text = fs.readFileSync(full, 'utf8');
    const normalized = normalizeText(text.slice(0, 8000));
    if ((name && normalized.includes(name)) || (host && text.toLowerCase().includes(host))) {
      matches.push({ path: full, matched_at: now(), imported: false });
    }
  }
  return matches;
}

function runFiles(runDir) {
  return {
    manifest: path.join(runDir, 'manifest.json'),
    businesses: path.join(runDir, 'businesses.jsonl'),
    searchPaths: path.join(runDir, 'search-paths.jsonl'),
    duplicates: path.join(runDir, 'duplicates.jsonl'),
    summaryJson: path.join(runDir, 'market-summary.json'),
    summaryMd: path.join(runDir, 'summary.md'),
    prospectsCsv: path.join(runDir, 'prospects.csv'),
    outreachMd: path.join(runDir, 'outreach.md')
    ,sendQueue: path.join(runDir, 'send-queue.md')
    ,sentHistory: path.join(runDir, 'sent-history.md')
    ,unableHistory: path.join(runDir, 'unable-to-send.md')
    ,skippedHistory: path.join(runDir, 'skipped-leads.md')
    ,outcomeEvents: path.join(runDir, 'outreach-events.jsonl')
    ,phoneOnly: path.join(runDir, 'phone-only-leads.md')
    ,contactResearch: path.join(runDir, 'contact-research-needed.md')
  };
}

function assertRun(runDir) {
  const files = runFiles(runDir);
  if (!fs.existsSync(files.manifest)) throw new Error(`Run not initialized: ${runDir}`);
  return files;
}

function commandInit(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = runFiles(runDir);
  if (fs.existsSync(files.manifest)) throw new Error(`Run already exists: ${runDir}`);
  ensureDir(path.join(runDir, 'evidence', 'visual'));
  ensureDir(path.join(runDir, 'work'));
  const manifest = {
    schema_version: 4,
    qualification_rules_version: 1,
    run_id: required(args, 'run-id'),
    region: required(args, 'region'),
    industry: required(args, 'industry'),
    segment: args.segment || args.industry,
    state: 'running',
    workflow_stage: 'discovered',
    started_at: now(),
    updated_at: now(),
    stop_reason: null,
    limits: {
      user_business_limit: args['business-limit'] ? Number(args['business-limit']) : null,
      technical: loadConfig().technical_limits
    },
    discovery: {
      basic_routes_required: REQUIRED_BASIC_ROUTES,
      basic_discovery_completed: false,
      low_yield_streak: 0,
      saturated: false
    }
  };
  writeJsonAtomic(files.manifest, manifest);
  writeJsonlAtomic(files.businesses, []);
  writeJsonlAtomic(files.searchPaths, []);
  writeJsonlAtomic(files.duplicates, []);
  writeJsonlAtomic(files.outcomeEvents, []);
  console.log(JSON.stringify({ run_dir: runDir, manifest }, null, 2));
}

function commandImport(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const manifest = readJson(files.manifest);
  const inputFile = path.resolve(required(args, 'input'));
  const legacyRoot = args['legacy-root'] ? path.resolve(args['legacy-root']) : null;
  const existing = readJsonl(files.businesses);
  const incoming = readJsonl(inputFile);
  let added = 0;
  let updated = 0;
  for (const raw of incoming) {
    const candidate = defaultRecord({ schema_version: manifest.schema_version, ...raw });
    candidate.identity.segment ||= manifest.segment || manifest.industry;
    let targetIndex = -1;
    // Only a supplied lead_id is authoritative. The generated ID may collide for
    // same-name stores without addresses and must not cause an automatic merge.
    if (raw.lead_id) targetIndex = existing.findIndex((item) => item.lead_id === raw.lead_id);
    if (targetIndex < 0) {
      const matches = existing.flatMap((item, index) => sameBusinessForAutoMerge(item, candidate) ? [index] : []);
      if (matches.length === 1) targetIndex = matches[0];
    }
    if (targetIndex >= 0) {
      const merged = defaultRecord(deepMerge(existing[targetIndex], raw));
      if (Array.isArray(raw.evidence)) merged.evidence = mergeEvidence(existing[targetIndex].evidence, raw.evidence);
      if (raw.qualification) {
        for (const [key, value] of Object.entries(raw.qualification)) {
          if (value === null || key === 'evidence_ids') merged.qualification[key] = value;
        }
        if (raw.qualification.status && raw.qualification.status !== 'pursue') {
          merged.qualification.priority = null;
          merged.qualification.web_proposal = null;
          merged.qualification.business_use = null;
        }
      }
      if (Array.isArray(raw.activity?.evidence_ids)) merged.activity.evidence_ids = raw.activity.evidence_ids;
      if (Array.isArray(raw.web_gap?.evidence_ids)) merged.web_gap.evidence_ids = raw.web_gap.evidence_ids;
      // A review may withdraw a draft and its reason. The general discovery merge
      // retains nonempty values, so these explicit review corrections must clear them.
      if (raw.sales_reason_status === 'missing') {
        if (raw.sales_reason === null) merged.sales_reason = null;
        if (raw.personalization?.status === 'missing' && Array.isArray(raw.personalization.facts)) merged.personalization.facts = raw.personalization.facts;
        if (raw.outreach?.message === null) merged.outreach.message = null;
        if (raw.outreach?.reason_version === null) merged.outreach.reason_version = null;
      }
      if (Object.hasOwn(raw.outreach ?? {}, 'review_note')) merged.outreach.review_note = raw.outreach.review_note;
      merged.lead_id = existing[targetIndex].lead_id;
      merged.legacy_matches = uniqueArray([...merged.legacy_matches, ...legacyMatches(merged, legacyRoot)]);
      existing[targetIndex] = merged;
      updated += 1;
    } else {
      candidate.lead_id = availableLeadId(candidate.lead_id, existing);
      candidate.legacy_matches = uniqueArray([...candidate.legacy_matches, ...legacyMatches(candidate, legacyRoot)]);
      existing.push(candidate);
      added += 1;
    }
  }
  writeJsonlAtomic(files.businesses, existing);
  manifest.updated_at = now();
  manifest.observed_unique_businesses = existing.length;
  writeJsonAtomic(files.manifest, manifest);
  if (args['route-id']) {
    recordSearchEntry(runDir, {
      route_id: args['route-id'],
      route_type: required(args, 'route-type'),
      phase: required(args, 'phase'),
      status: args.status || 'completed',
      query_or_condition: args.query || null,
      source: args.source || null,
      discovered_raw: incoming.length,
      new_unique_count: added,
      discovery_unique_after: existing.length,
      executed_at: now()
    });
  }
  console.log(JSON.stringify({ input: incoming.length, added, updated, unique_total: existing.length }, null, 2));
}

function updateDiscoveryState(files) {
  const logs = readJsonl(files.searchPaths);
  const manifest = readJson(files.manifest);
  const basicDone = REQUIRED_BASIC_ROUTES.every((route) => logs.some((item) =>
    item.phase === 'basic' && item.route_type === route && ['completed', 'not_applicable'].includes(item.status)
  ));
  const config = loadConfig();
  const additions = logs.filter((item) => item.phase === 'additional' && item.status === 'completed');
  const requiredStreak = config.saturation.consecutive_low_yield_routes;
  const threshold = config.saturation.max_new_unique_per_additional_route;
  let streak = 0;
  for (let i = additions.length - 1; i >= 0; i -= 1) {
    if (additions[i].new_unique_count <= threshold) streak += 1;
    else break;
  }
  const saturated = basicDone && streak >= requiredStreak;
  manifest.discovery = {
    ...manifest.discovery,
    basic_discovery_completed: basicDone,
    low_yield_streak: streak,
    saturated,
    saturation_threshold: threshold,
    saturation_streak_required: requiredStreak
  };
  if (saturated) manifest.stop_reason = 'saturated';
  manifest.updated_at = now();
  writeJsonAtomic(files.manifest, manifest);
  return { basic_discovery_completed: basicDone, low_yield_streak: streak, saturated };
}

function recordSearchEntry(runDir, entry) {
  const files = assertRun(runDir);
  appendJsonl(files.searchPaths, entry);
  return updateDiscoveryState(files);
}

function commandSearchLog(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const entry = {
    route_id: required(args, 'route-id'),
    route_type: required(args, 'route-type'),
    phase: required(args, 'phase'),
    status: args.status || 'completed',
    query_or_condition: args.query || null,
    source: args.source || null,
    discovered_raw: Number(args['discovered-raw'] || 0),
    new_unique_count: Number(required(args, 'new-unique')),
    discovery_unique_after: readJsonl(files.businesses).length,
    executed_at: now()
  };
  const state = recordSearchEntry(runDir, entry);
  console.log(JSON.stringify({ entry, ...state }, null, 2));
}

function commandResume(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const manifest = readJson(files.manifest);
  manifest.state = 'running';
  manifest.stop_reason = null;
  manifest.resumed_at = now();
  manifest.updated_at = manifest.resumed_at;
  writeJsonAtomic(files.manifest, manifest);
  console.log(JSON.stringify({ resumed: true, workflow_stage: manifest.workflow_stage, run_id: manifest.run_id }, null, 2));
}

function commandMergeDuplicates(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const decisions = readJsonl(path.resolve(required(args, 'input')));
  let records = readJsonl(files.businesses);
  let mergedCount = 0;
  const outcomeLeadIds = new Set(readJsonl(files.outcomeEvents).map((event) => event.lead_id));
  const sentLeadIds = new Set(checkedQueueBlocks(files.sentHistory).keys());
  const checkedQueueIds = new Set(checkedQueueBlocks(files.sendQueue).keys());
  const duplicateLog = [];
  for (const decision of decisions) {
    const primaryId = decision.primary_lead_id;
    const duplicateIds = decision.duplicate_lead_ids ?? [];
    const primaryIndex = records.findIndex((record) => record.lead_id === primaryId);
    if (primaryIndex < 0) throw new Error(`Primary lead not found: ${primaryId}`);
    let primary = records[primaryIndex];
    for (const duplicateId of duplicateIds) {
      const duplicateIndex = records.findIndex((record) => record.lead_id === duplicateId);
      if (duplicateIndex < 0) throw new Error(`Duplicate lead not found: ${duplicateId}`);
      if (duplicateId === primaryId) throw new Error(`Primary cannot duplicate itself: ${primaryId}`);
      if (outcomeLeadIds.has(duplicateId) || sentLeadIds.has(duplicateId) || checkedQueueIds.has(duplicateId)) {
        throw new Error(`Cannot merge ${duplicateId}: outcome or checked-send history needs explicit migration`);
      }
      const duplicate = records[duplicateIndex];
      primary = defaultRecord(deepMerge(duplicate, primary));
      primary.evidence = mergeEvidence(duplicate.evidence, primary.evidence);
      primary.lead_id = primaryId;
      primary.identity.aliases = uniqueArray([
        ...(primary.identity.aliases ?? []),
        duplicate.identity?.name,
        ...(duplicate.identity?.aliases ?? [])
      ].filter(Boolean));
      duplicateLog.push({
        primary_lead_id: primaryId,
        duplicate_lead_id: duplicateId,
        duplicate_name: duplicate.identity?.name ?? null,
        reason: decision.reason || 'confirmed duplicate',
        merged_at: now()
      });
      records.splice(duplicateIndex, 1);
      mergedCount += 1;
    }
    const refreshedPrimaryIndex = records.findIndex((record) => record.lead_id === primaryId);
    records[refreshedPrimaryIndex] = primary;
  }
  writeJsonlAtomic(files.businesses, records);
  for (const entry of duplicateLog) appendJsonl(files.duplicates, entry);
  const manifest = readJson(files.manifest);
  manifest.observed_unique_businesses = records.length;
  manifest.updated_at = now();
  writeJsonAtomic(files.manifest, manifest);
  console.log(JSON.stringify({ decisions: decisions.length, merged_duplicates: mergedCount, unique_total: records.length }, null, 2));
}

function commandReassess(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  if (readJson(files.manifest).qualification_rules_version === 1) throw new Error('reassess is for legacy v3 runs only; use import for v4 qualification updates');
  const original = readJsonl(files.businesses);
  const decisions = args.decisions ? readJsonl(path.resolve(args.decisions)) : [];
  const byId = new Map(decisions.map((item) => [item.lead_id, item]));
  if (byId.size !== decisions.length) throw new Error('Duplicate lead_id in reassessment decisions');
  for (const id of byId.keys()) if (!original.some((record) => record.lead_id === id)) throw new Error(`Unknown reassessment lead_id: ${id}`);
  const updated = original.map((old) => {
    const record = defaultRecord(old);
    record.schema_version = 3;
    if ((old.schema_version ?? 2) < 3) {
      record.personalization.facts = (record.personalization.facts ?? []).map((fact) => ({ fact_type: 'business_fact', ...fact }));
      // Migration alone is not the required extra source check. Leave undecided reasons pending.
      record.sales_reason_status = 'pending';
      record.sales_reason = null;
      if (record.outreach?.message) {
        record.outreach.reason_version = 2;
        record.outreach.legacy = true;
      }
    }
    updateContactState(record);
    const decision = byId.get(record.lead_id);
    if (decision) {
      if (decision.sales_prohibited_all === true) record.contacts.channels = record.contacts.channels.map((channel) => ({ ...channel, sales_prohibited: true }));
      if (decision.exclude_reason) {
        record.lead.status = 'excluded';
        record.lead.exclusion_reasons = [...new Set([...(record.lead.exclusion_reasons ?? []), decision.exclude_reason])];
        record.workflow = { stage: record.workflow?.stage ?? 'triaged', result: 'excluded' };
      }
      // A legacy completed flag alone is not negative-search evidence.
      if (decision.contact_research_status) record.contacts.research_status = decision.contact_research_status;
      if (decision.channels) record.contacts.channels = decision.channels;
      if (decision.contact_research_checks) record.contacts.research_checks = deepMerge(record.contacts.research_checks, decision.contact_research_checks);
      if (decision.contacts?.research_checks) record.contacts.research_checks = deepMerge(record.contacts.research_checks, decision.contacts.research_checks);
      if (decision.general_contact_form_url) record.contacts.channels = record.contacts.channels.map((channel) =>
        channel.type === 'contact_form' && channel.value === decision.general_contact_form_url ? { ...channel, purpose: 'general' } : channel
      );
      updateContactState(record);
      record.sales_reason_status = decision.sales_reason_status ?? 'pending';
      if (decision.sales_reason_status === 'ready') {
        const reason = decision.sales_reason;
        if (!reason?.fact || !reason?.source_url || !reason?.proposal || !reason?.why_web || !reason?.checked_at) throw new Error(`Incomplete sales reason: ${record.lead_id}`);
        record.sales_reason = reason;
        record.personalization.facts.push({ fact: reason.fact, fact_type: 'sales_relevant_web_fact', source_url: reason.source_url, checked_at: reason.checked_at, safe_for_outreach: true });
        if (decision.message) {
          if (record.contactability !== 'text_ready') throw new Error(`Text contact not verified for outreach: ${record.lead_id}`);
          const reviewed = decision.reviewed === true;
          record.outreach = { status: reviewed ? 'reviewed' : 'generated', message: decision.message, individualized_part: decision.individualized_part ?? reason.fact, reviewed, reason_version: 3 };
          record.workflow = { stage: reviewed ? 'reviewed' : 'outreach_generated', result: reviewed ? 'completed' : 'in_progress' };
        }
      }
    }
    return record;
  });
  const timestamp = now().replace(/[:.]/g, '-');
  const backup = path.join(runDir, `businesses.pre-v3-${timestamp}.jsonl`);
  fs.copyFileSync(files.businesses, backup);
  writeJsonlAtomic(files.businesses, updated);
  const manifest = readJson(files.manifest);
  manifest.schema_version = 3;
  manifest.reassessment = {
    rules_version: 3,
    updated_at: now(),
    reviewed_ready: updated.filter((record) => record.sales_reason_status === 'ready').length,
    pending: updated.filter((record) => record.lead?.status === 'candidate' && record.sales_reason_status === 'pending').length,
    status: updated.some((record) => record.lead?.status === 'candidate' && record.sales_reason_status === 'pending') ? 'partial' : 'complete'
  };
  writeJsonAtomic(files.manifest, manifest);
  const summary = buildSummary(runDir);
  console.log(JSON.stringify({ backup, records: updated.length, text_ready: summary.candidates.contactability.text_ready, sales_reason_ready: summary.candidates.sales_reason_status.ready }, null, 2));
}

function commandSetStop(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const allowed = ['saturated', 'user_limit', 'technical_limit', 'access_limited', 'interrupted'];
  const reason = required(args, 'reason');
  if (!allowed.includes(reason)) throw new Error(`Invalid stop reason: ${reason}`);
  const manifest = readJson(files.manifest);
  manifest.stop_reason = reason;
  if (reason !== 'saturated' && manifest.state === 'running') manifest.state = 'partial';
  manifest.updated_at = now();
  writeJsonAtomic(files.manifest, manifest);
  console.log(JSON.stringify({ stop_reason: reason }, null, 2));
}

function countBy(records, getter, values) {
  return Object.fromEntries(values.map((value) => [String(value), records.filter((r) => getter(r) === value).length]));
}

function buildSummary(runDir) {
  const files = assertRun(runDir);
  const manifest = readJson(files.manifest);
  const records = readJsonl(files.businesses);
  requireSettledQueue(files, records);
  const outcome = outcomeState(files);
  const candidates = records.filter((r) => r.lead?.status === 'candidate');
  const contactCount = (status) => candidates.filter((r) => assessContacts(r.contacts).contactability === status).length;
  const currentReviewed = candidates.filter((r) => r.outreach?.reason_version === 3 &&
    r.outreach?.status === 'reviewed' && r.outreach?.reviewed === true && Boolean(r.outreach?.message)).length;
  const funnel = {
    discovered: records.length,
    candidate: candidates.length,
    triage_pass: records.filter((r) => r.triage?.decision === 'advance').length,
    qualified_investigated: records.filter((r) =>
      ['qualified', 'lead_ready', 'outreach_generated', 'reviewed'].includes(r.workflow?.stage) &&
      (r.qualification?.status ?? 'pending') !== 'pending').length,
    contact_checked: candidates.filter((r) => assessContacts(r.contacts).researchStatus === 'completed').length,
    text_ready: contactCount('text_ready'),
    actionable_text_ready: candidates.filter((r) => Boolean(preferredTextChannel(r, outcome))).length,
    phone_only: contactCount('phone_only'),
    contact_unverified: contactCount('contact_unverified'),
    sales_reason_ready: candidates.filter((r) => r.sales_reason_status === 'ready').length,
    outreach_reviewed: currentReviewed,
    qualified_pursue: candidates.filter((r) => r.qualification?.status === 'pursue').length,
    send_queue_ready: candidates.filter((r) => queueEligible(r, manifest, outcome)).length,
    sent: outcome.sent.size,
    previously_sent: new Set(outcome.events.filter((e) => e.result === 'previously_sent').map((e) => e.lead_id)).size,
    unable: new Set(outcome.events.filter((e) => e.result === 'unable').map((e) => e.lead_id)).size,
    lead_skipped: outcome.skipped.size,
    sent_actual_date_unknown: outcome.events.filter((e) => e.result === 'sent' && !e.occurred_at).length,
    sent_today_confirmed: outcome.events.filter((e) => e.result === 'sent' && e.occurred_at &&
      tokyoDate(e.occurred_at) === tokyoDate(now())).length,
    reply: new Set(outcome.events.filter((e) => e.result === 'reply').map((e) => e.lead_id)).size,
    meeting: new Set(outcome.events.filter((e) => e.result === 'meeting').map((e) => e.lead_id)).size,
    proposal: new Set(outcome.events.filter((e) => e.result === 'proposal').map((e) => e.lead_id)).size,
    won: new Set(outcome.events.filter((e) => e.result === 'won').map((e) => e.lead_id)).size
  };
  const segments = [...new Set(records.map((r) => r.identity?.segment || r.identity?.industry || manifest.industry))];
  const segmentSummary = Object.fromEntries(segments.map((segment) => {
    const group = records.filter((r) => (r.identity?.segment || r.identity?.industry || manifest.industry) === segment);
    const ids = new Set(group.map((r) => r.lead_id));
    const events = outcome.events.filter((e) => ids.has(e.lead_id));
    const unique = (result) => new Set(events.filter((e) => e.result === result).map((e) => e.lead_id)).size;
    return [segment, {
      discovered: group.length,
      triaged: group.filter((r) => r.workflow?.stage !== 'discovered').length,
      triage_pass: group.filter((r) => r.triage?.decision === 'advance').length,
      qualified_investigated: group.filter((r) =>
        ['qualified', 'lead_ready', 'outreach_generated', 'reviewed'].includes(r.workflow?.stage) &&
        (r.qualification?.status ?? 'pending') !== 'pending').length,
      pursue: group.filter((r) => r.qualification?.status === 'pursue').length,
      contactable: group.filter((r) => Boolean(preferredTextChannel(r, outcome))).length,
      sent: group.filter((r) => outcome.sent.has(r.lead_id)).length,
      unable: unique('unable'), reply: unique('reply'), meeting: unique('meeting'),
      proposal: unique('proposal'), won: unique('won')
    }];
  }));
  const summary = {
    schema_version: manifest.schema_version,
    run_id: manifest.run_id,
    region: manifest.region,
    industry: manifest.industry,
    generated_at: now(),
    discovery: {
      observed_unique_businesses: records.length,
      merged_duplicates: readJsonl(files.duplicates).length,
      stop_reason: manifest.stop_reason,
      basic_discovery_completed: manifest.discovery?.basic_discovery_completed ?? false,
      saturated: manifest.discovery?.saturated ?? false
    },
    reassessment: manifest.reassessment ?? null,
    funnel,
    qualification: {
      rules_version: manifest.qualification_rules_version ?? null,
      status: countBy(records, (r) => r.qualification?.status ?? 'pending', QUALIFICATION_STATUSES),
      priority: countBy(records.filter((r) => r.qualification?.status === 'pursue'), (r) => r.qualification?.priority, ['P1', 'P2', 'P3'])
    },
    triage: countBy(records, (r) => r.triage?.decision ?? 'pending', TRIAGE_DECISIONS),
    segments: segmentSummary,
    website_presence: countBy(records, (r) => r.website?.presence, ENUMS.websitePresence),
    renewal_opportunity: countBy(records, (r) => r.renewal?.opportunity, ENUMS.renewalOpportunity),
    lead_status: countBy(records, (r) => r.lead?.status, ENUMS.leadStatus),
    candidates: {
      total: candidates.length,
      priority: countBy(candidates, (r) => r.lead?.priority, ['high', 'medium', 'low']),
      qualification_priority: countBy(candidates.filter((r) => r.qualification?.status === 'pursue'), (r) => r.qualification?.priority, ['P1', 'P2', 'P3']),
      contactability: countBy(candidates, (r) => assessContacts(r.contacts).contactability, ENUMS.contactability),
      contact_research_status: countBy(candidates, (r) => assessContacts(r.contacts).researchStatus, CONTACT_RESEARCH_STATUSES),
      sales_reason_status: countBy(candidates, (r) => r.sales_reason_status ?? 'pending', ENUMS.salesReasonStatus),
      text_outreach_available: funnel.text_ready,
      text_outreach_unavailable: candidates.length - funnel.text_ready,
      personalization_missing: candidates.filter((r) => r.personalization?.status === 'missing').length,
      outreach_generated: candidates.filter((r) => ['generated', 'reviewed'].includes(r.outreach?.status)).length,
      outreach_reviewed: candidates.filter((r) => r.outreach?.status === 'reviewed' || r.outreach?.reviewed === true).length,
      current_outreach_generated: candidates.filter((r) => r.outreach?.reason_version === 3 && Boolean(r.outreach?.message)).length,
      current_outreach_reviewed: currentReviewed,
      legacy_outreach_preserved: candidates.filter((r) => r.outreach?.legacy === true && Boolean(r.outreach?.message)).length,
      send_queue_ready: funnel.send_queue_ready
    }
  };
  writeJsonAtomic(files.summaryJson, summary);
  writeSummaryMarkdown(files.summaryMd, summary, records);
  writeProspectsCsv(files.prospectsCsv, candidates, outcome);
  writeOutreachMarkdown(files.outreachMd, candidates);
  writeActionQueues(files, candidates, manifest, outcome);
  return summary;
}

function writeSummaryMarkdown(file, summary, records) {
  const top = [...records]
    .filter((r) => r.lead?.status === 'candidate')
    .sort((a, b) => priorityRank(summary.qualification.rules_version === 1 ? a.qualification?.priority : a.lead?.priority) -
      priorityRank(summary.qualification.rules_version === 1 ? b.qualification?.priority : b.lead?.priority));
  const lines = [
    `# ${summary.region} × ${summary.industry} Web営業調査`, '',
    `今回の探索で発見できた重複除去後の事業者数: **${summary.discovery.observed_unique_businesses}**`,
    `重複として統合: ${summary.discovery.merged_duplicates}`,
    `探索終了理由: ${summary.discovery.stop_reason ?? '未完了'}`, '',
    ...(summary.reassessment ? [`新基準での既存候補再評価: ${summary.reassessment.status}（未確認 ${summary.reassessment.pending}件）`, ''] : []),
    '## 市場全体', '',
    `- 公式サイト確認: ${summary.website_presence.confirmed}`,
    `- 公式サイト未確認: ${summary.website_presence.unconfirmed}`,
    `- 公式サイトなし確認済み: ${summary.website_presence.confirmed_no_site}`,
    `- リニューアル余地 大: ${summary.renewal_opportunity.large}`,
    `- リニューアル余地 中: ${summary.renewal_opportunity.medium}`,
    `- リニューアル余地 小: ${summary.renewal_opportunity.small}`,
    `- リニューアル余地 判定不能: ${summary.renewal_opportunity.undetermined}`,
    `- 営業候補: ${summary.lead_status.candidate}`,
    `- 除外: ${summary.lead_status.excluded}`,
    `- 再確認: ${summary.lead_status.recheck}`, '',
    '## 営業ファネル（各段階は別集計）', '',
    `- 発見事業者 discovered: ${summary.funnel.discovered}`,
    `- 営業候補 candidate: ${summary.funnel.candidate}`,
    ...(summary.qualification.rules_version === 1 ? [`- QUALIFYへ進めた triage_pass: ${summary.funnel.triage_pass}`] : []),
    ...(summary.qualification.rules_version === 1 ? [`- 追加調査済み qualified_investigated: ${summary.funnel.qualified_investigated}`] : []),
    `- 連絡先判定完了 contact_checked: ${summary.funnel.contact_checked}`,
    `- 文章送信先確認 text_ready: ${summary.funnel.text_ready}`,
    `- 電話のみ phone_only: ${summary.funnel.phone_only}`,
    `- 連絡先要確認 contact_unverified: ${summary.funnel.contact_unverified}`,
    `- 営業理由確認 sales_reason_ready: ${summary.funnel.sales_reason_ready}`,
    `- 新基準文面レビュー済み outreach_reviewed: ${summary.funnel.outreach_reviewed}`,
    `- 送信キュー準備完了 send_queue_ready: ${summary.funnel.send_queue_ready}`,
    `- 現在利用可能な文章窓口 actionable_text_ready: ${summary.funnel.actionable_text_ready}`,
    `- 送信済み（過去送信判明分を含む） sent: ${summary.funnel.sent}`,
    `- 過去送信を後から確認 previously_sent: ${summary.funnel.previously_sent}`,
    `- 送信不可を記録 unable: ${summary.funnel.unable}`,
    `- 事業者単位の営業見送り lead_skipped: ${summary.funnel.lead_skipped}`,
    `- 実送信日時未記録 sent_actual_date_unknown: ${summary.funnel.sent_actual_date_unknown}`,
    `- 本日の実送信日時確認済み sent_today_confirmed: ${summary.funnel.sent_today_confirmed}（日時未記録分は含まない）`,
    `- 返信 reply: ${summary.funnel.reply}`,
    `- 商談 meeting: ${summary.funnel.meeting}`, '',
    ...(summary.qualification.rules_version === 1 ? [
      '## 新しい営業判断（連絡可能性とは別軸）', '',
      `- 追加調査対象 pursue: ${summary.qualification.status.pursue}`,
      `- 再確認 watch: ${summary.qualification.status.watch}`,
      `- 提案見送り drop: ${summary.qualification.status.drop}`,
      `- 未判定 pending: ${summary.qualification.status.pending}`,
      `- P1 / P2 / P3: ${summary.qualification.priority.P1} / ${summary.qualification.priority.P2} / ${summary.qualification.priority.P3}`, ''
    ] : []),
    '## 営業対象', '',
    `- 営業候補総数: ${summary.candidates.total}`,
    ...(summary.qualification.rules_version === 1 ? [
      `- 営業順 P1: ${summary.candidates.qualification_priority.P1}`,
      `- 営業順 P2: ${summary.candidates.qualification_priority.P2}`,
      `- 営業順 P3: ${summary.candidates.qualification_priority.P3}`
    ] : [
      `- 優先度 高: ${summary.candidates.priority.high}`,
      `- 優先度 中: ${summary.candidates.priority.medium}`,
      `- 優先度 低: ${summary.candidates.priority.low}`
    ]),
    `- 文章営業可能: ${summary.candidates.text_outreach_available}`,
    `- 現時点で文章送信先未確認: ${summary.candidates.text_outreach_unavailable}`,
    `- 個別化材料不足（旧基準）: ${summary.candidates.personalization_missing}`,
    `- 新基準の営業文生成済み: ${summary.candidates.current_outreach_generated}`,
    `- 新基準のレビュー済み: ${summary.candidates.current_outreach_reviewed}`,
    `- 旧基準の営業文（履歴として保存・送信キュー対象外）: ${summary.candidates.legacy_outreach_preserved}`, '',
    '## 送信準備', '',
    `- 文章送信先確認済み: ${summary.candidates.contactability.text_ready}`,
    `- 電話のみ: ${summary.candidates.contactability.phone_only}`,
    `- 連絡先未発見: ${summary.candidates.contactability.contact_not_found}`,
    `- 連絡先要確認: ${summary.candidates.contactability.contact_unverified}`,
    `- 連絡先調査 未着手: ${summary.candidates.contact_research_status.pending}`,
    `- 連絡先調査 途中: ${summary.candidates.contact_research_status.in_progress}`,
    `- 連絡先調査 アクセス制約: ${summary.candidates.contact_research_status.access_limited}`,
    `- 連絡先判定完了: ${summary.candidates.contact_research_status.completed}`,
    `- Web制作の営業理由確認済み: ${summary.candidates.sales_reason_status.ready}`,
    `- 営業理由不足（追加調査済み）: ${summary.candidates.sales_reason_status.missing}`,
    `- 営業理由の確認待ち: ${summary.candidates.sales_reason_status.pending}`, '',
    `- 新基準の送信キュー掲載: ${summary.candidates.send_queue_ready}`, '',
    '## 営業候補一覧', '',
    '| 事業者 | サイト状況 | リニューアル余地 | 優先度 | 文章送信 | 営業理由 | 営業文 |',
    '|---|---|---|---|---|---|---|'
  ];
  for (const record of top) {
    const outreachState = record.outreach?.reason_version === 3 ? (record.outreach?.status === 'reviewed' && record.outreach?.reviewed === true ? '新基準・レビュー済み' : '新基準・下書き') : record.outreach?.legacy ? '旧基準・要再評価' : (record.outreach?.status ?? '未生成');
    lines.push(`| ${escapeMarkdown(record.identity?.name)} | ${record.website?.presence} | ${record.renewal?.opportunity} | ${summary.qualification.rules_version === 1 ? record.qualification?.priority ?? '-' : record.lead?.priority ?? '-'} | ${assessContacts(record.contacts).contactability === 'text_ready' ? '可' : '未確認'} | ${record.sales_reason_status ?? 'pending'} | ${outreachState} |`);
  }
  if (summary.qualification.rules_version === 1) {
    lines.push('', '## Segment別の営業ファネル', '',
      '| Segment | 発見 | 一次判定 | QUALIFYへ | 追加調査済み | pursue | 文章窓口 | 送信 | 送信不可 | 返信 | 商談 | 提案 | 成約 |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const [segment, value] of Object.entries(summary.segments)) {
      lines.push(`| ${escapeMarkdown(segment)} | ${value.discovered} | ${value.triaged} | ${value.triage_pass} | ${value.qualified_investigated} | ${value.pursue} | ${value.contactable} | ${value.sent} | ${value.unable} | ${value.reply} | ${value.meeting} | ${value.proposal} | ${value.won} |`);
    }
    lines.push('', '率を比較する際は各段階の分母、送信日、返信待ち期間を揃えてください。調査途中の件数を返信率に混ぜないでください。');
  }
  lines.push('', '> 各集計軸は別の概念です。公式サイト確認数、リニューアル余地、営業判断を相互に足し合わせないでください。', '');
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

function priorityRank(value) {
  return ({ high: 0, medium: 1, low: 2, P1: 0, P2: 1, P3: 2 })[value] ?? 3;
}

function csv(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function writeProspectsCsv(file, candidates, outcome) {
  const rows = [['lead_id','name','segment','website_presence','website_url','renewal_opportunity','activity_status','web_gap_status','qualification_status','qualification_priority','qualification_reason','qualification_next_action','qualification_review_after','priority','proposal_type','text_outreach_available','contactability','sales_reason_status','personalization_status','outreach_status','outreach_reason_version','outreach_legacy','contact_research_status','send_channel','send_destination','send_source_url','send_checked_at']];
  for (const record of [...candidates].sort((a, b) => priorityRank(a.qualification?.priority ?? a.lead?.priority) - priorityRank(b.qualification?.priority ?? b.lead?.priority))) {
    const contact = assessContacts(record.contacts);
    const channel = preferredTextChannel(record, outcome);
    rows.push([
      record.lead_id, record.identity?.name, record.identity?.segment || record.identity?.industry,
      record.website?.presence, record.website?.url,
      record.renewal?.opportunity, record.activity?.status, record.web_gap?.status,
      record.qualification?.status, record.qualification?.priority, record.qualification?.reason,
      record.qualification?.next_action, record.qualification?.review_after,
      record.lead?.priority, record.lead?.proposal_type,
      contact.contactability === 'text_ready', contact.contactability, record.sales_reason_status ?? 'pending', record.personalization?.status, record.outreach?.status, record.outreach?.reason_version, record.outreach?.legacy === true,
      contact.researchStatus, channel?.type, channel?.value, channel?.source_url, channel?.checked_at
    ]);
  }
  fs.writeFileSync(file, `${rows.map((row) => row.map(csv).join(',')).join('\n')}\n`, 'utf8');
}

function writeOutreachMarkdown(file, candidates) {
  const lines = ['# 初回営業文', ''];
  for (const record of [...candidates].sort((a, b) => priorityRank(a.lead?.priority) - priorityRank(b.lead?.priority))) {
    lines.push(`## ${record.identity?.name}`, '');
    lines.push(`- lead_id: ${record.lead_id}`);
    lines.push(`- 優先度: ${record.lead?.priority ?? '未設定'}`);
    lines.push(`- 現時点で文章送信先: ${assessContacts(record.contacts).contactability === 'text_ready' ? '確認済み' : '未確認'}`);
    lines.push(`- 営業文状態: ${record.outreach?.reason_version === 3 ? (record.outreach?.status === 'reviewed' && record.outreach?.reviewed === true ? '新基準・レビュー済み' : '新基準・下書き（送信不可）') : record.outreach?.legacy ? '旧基準・送信前に要再評価' : record.outreach?.status}`, '');
    lines.push(record.outreach?.message || '営業文未生成', '');
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

function checkedQueueBlocks(file) {
  if (!fs.existsSync(file)) return new Map();
  const blocks = fs.readFileSync(file, 'utf8').split(/(?=^- \[[ xX]\] )/m);
  const result = new Map();
  for (const block of blocks) {
    if (!/^- \[[xX]\] /m.test(block)) continue;
    const id = block.match(/^  - lead_id:\s*(\S+)/m)?.[1];
    if (id) result.set(id, block.trimEnd());
  }
  return result;
}

function unavailableQueueBlocks(file) {
  if (!fs.existsSync(file)) return new Map();
  const blocks = fs.readFileSync(file, 'utf8').split(/(?=^- \[[ xX]\] )/m);
  const result = new Map();
  for (const block of blocks) {
    if (!/^  - \[x\] 送信不可\s*$/im.test(block)) continue;
    const id = block.match(/^  - lead_id:\s*(\S+)/m)?.[1];
    const destination = block.match(/^  - 送信先:\s*(.+)$/m)?.[1];
    if (id && destination) result.set(`${id}|${destination}`, block.trimEnd());
  }
  return result;
}

function destinationKey(type, value) {
  return `${type}|${String(value ?? '').trim().toLowerCase()}`;
}

function outcomeState(files) {
  const events = readJsonl(files.outcomeEvents);
  const sent = new Set([
    ...checkedQueueBlocks(files.sentHistory).keys(),
    ...checkedQueueBlocks(files.sendQueue).keys()
  ]);
  const blocked = new Map();
  const skipped = new Set();
  for (const event of events) {
    if (event.result === 'sent' || event.result === 'previously_sent') sent.add(event.lead_id);
    if (event.result === 'lead_skip') skipped.add(event.lead_id);
    if (event.result === 'lead_reopen') skipped.delete(event.lead_id);
    if (event.result === 'unable' || event.result === 'reopen') {
      const key = destinationKey(event.channel, event.destination);
      if (!blocked.has(event.lead_id)) blocked.set(event.lead_id, new Set());
      if (event.result === 'unable') blocked.get(event.lead_id).add(key);
      else blocked.get(event.lead_id).delete(key);
    }
  }
  return { events, sent, blocked, skipped };
}

function appendOutcome(files, event) {
  appendJsonl(files.outcomeEvents, {
    event_id: crypto.randomUUID(),
    recorded_at: now(),
    ...event
  });
}

function savedOfficialContact(record, channel, destination) {
  return (record.contacts?.channels ?? []).some((item) => item.official === true &&
    item.type === channel && normalizeChannel(item).value === destination);
}

function requireSettledQueue(files, records) {
  const report = settleQueue({ files, records, apply: false, isOfficialContact: savedOfficialContact });
  if (report.actions.length) {
    throw new Error(`送信キューに未仕分けのチェックが${report.actions.length}件あります。先に settle-queue --run <DIR> で確認し、--apply で確定してください`);
  }
}

function preferredTextChannel(record, state = null) {
  const order = ['email', 'contact_form', 'instagram_dm', 'official_line', 'other'];
  return [...(record.contacts?.channels ?? [])].filter(usableTextChannel)
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type)).map(normalizeChannel)
    .find((channel) => !state?.blocked.get(record.lead_id)?.has(destinationKey(channel.type, channel.value))) ?? null;
}

function hasMatchingSalesReasonFact(record) {
  const reason = record.sales_reason;
  if (!reason?.fact || !reason?.source_url || !reason?.checked_at || !reason?.why_web || !reason?.proposal) return false;
  return (record.personalization?.facts ?? []).some((fact) =>
    fact.fact_type === 'sales_relevant_web_fact' && fact.safe_for_outreach === true &&
    fact.source_url === reason.source_url && normalizeText(fact.fact) === normalizeText(reason.fact)
  );
}

function qualifiedPursue(record) {
  const qualification = record.qualification ?? {};
  const evidence = new Map((record.evidence ?? []).map((item) => [item.id, item]));
  return record.lead?.status === 'candidate' && qualification.status === 'pursue' &&
    record.triage?.decision === 'advance' &&
    qualification.rules_version === 1 &&
    ['P1', 'P2', 'P3'].includes(qualification.priority) &&
    Boolean(qualification.reason && qualification.web_proposal && qualification.business_use) &&
    checkedAt(qualification.checked_at) &&
    (qualification.evidence_ids ?? []).some((id) => {
      const item = evidence.get(id);
      return item?.status === 'observed' && Boolean(item.observation) &&
        httpUrl(item.source_url) && checkedAt(item.checked_at);
    });
}

function queueEligible(record, manifest = {}, state = null) {
  return record.lead?.status === 'candidate' && assessContacts(record.contacts).contactability === 'text_ready' &&
    (manifest.qualification_rules_version !== 1 || qualifiedPursue(record)) &&
    Boolean(preferredTextChannel(record, state)) && !state?.sent.has(record.lead_id) &&
    !state?.skipped.has(record.lead_id) &&
    record.sales_reason_status === 'ready' &&
    hasMatchingSalesReasonFact(record) && record.outreach?.status === 'reviewed' &&
    record.outreach?.reviewed === true && record.outreach?.reason_version === 3 &&
    Boolean(record.outreach?.message);
}

function draftReadiness(record, manifest, state) {
  if (record.lead?.status !== 'candidate') return 'not_candidate';
  if (state.sent.has(record.lead_id)) return 'already_sent';
  if (state.skipped.has(record.lead_id)) return 'lead_skipped';
  if (manifest.qualification_rules_version === 1 && !qualifiedPursue(record)) return 'not_qualified';
  if (record.outreach?.message) return 'message_exists';
  if (record.outreach?.review_note || (record.outreach?.status && record.outreach.status !== 'pending') ||
    record.sales_reason_status === 'missing') return 'needs_resolution';
  if (assessContacts(record.contacts).contactability !== 'text_ready') return 'no_text_contact';
  if (!preferredTextChannel(record, state)) return 'no_usable_channel';
  return 'ready';
}

function commandPlanDrafts(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const records = readJsonl(files.businesses);
  requireSettledQueue(files, records);
  const manifest = readJson(files.manifest);
  const state = outcomeState(files);
  const limit = args.limit === undefined ? 10 : Number(args.limit);
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');
  const held = {};
  const ready = [];
  for (const record of records) {
    const reason = draftReadiness(record, manifest, state);
    if (reason !== 'ready') {
      held[reason] = (held[reason] ?? 0) + 1;
      continue;
    }
    ready.push({ lead_id: record.lead_id,
      priority: manifest.qualification_rules_version === 1 ? record.qualification?.priority : record.lead?.priority,
      channel: preferredTextChannel(record, state).type });
  }
  ready.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.lead_id.localeCompare(b.lead_id));
  console.log(JSON.stringify({ eligible_total: ready.length, selected: ready.slice(0, limit), held_counts: held }, null, 2));
}

function writeActionQueues(files, candidates, manifest, state) {
  const previouslySent = new Map([
    ...checkedQueueBlocks(files.sentHistory),
    ...checkedQueueBlocks(files.sendQueue)
  ]);
  const previouslyUnable = new Map([
    ...unavailableQueueBlocks(files.unableHistory),
    ...unavailableQueueBlocks(files.sendQueue)
  ]);
  const ordered = [...candidates].sort((a, b) => priorityRank(a.lead?.priority) - priorityRank(b.lead?.priority));
  if (manifest.qualification_rules_version === 1) ordered.sort((a, b) => priorityRank(a.qualification?.priority) - priorityRank(b.qualification?.priority));
  const send = ['# 文章営業 送信キュー', '', 'この一覧の「レビュー済み」は送信承認ではありません。送る直前に、営業理由を支える現在の情報、営業・勧誘禁止表示、送信先の用途を確認してください。理由や宛先が変わっていたら文面を差し戻し、「送信不可」には記録しません。', '', '送信後は店舗行を `- [x]`。実際に窓口を使えなかった場合だけ「送信不可」、事業者への営業を見送る場合は「営業見送り」を `[x]` にして理由を記入してください。複数同時にはチェックしません。`settle-queue --apply`で履歴へ移します。', ''];
  for (const record of ordered) {
    const channel = preferredTextChannel(record, state);
    if (!queueEligible(record, manifest, state) || !channel) continue;
    send.push(`- [ ] ${record.identity?.name}`,
      `  - lead_id: ${record.lead_id}`,
      `  - 優先度: ${manifest.qualification_rules_version === 1 ? record.qualification?.priority ?? '未設定' : record.lead?.priority ?? '未設定'}`,
      `  - 送信チャネル: ${channel.type}`,
      `  - 送信先: ${channel.value}`,
      `  - 連絡先出典: ${channel.source_url}`,
      `  - 連絡先確認日: ${channel.checked_at}`,
      `  - 営業理由: ${record.sales_reason?.fact ?? ''}`,
      `  - 営業理由出典: ${record.sales_reason?.source_url ?? ''}`,
      `  - 営業理由確認日: ${record.sales_reason?.checked_at ?? ''}`,
      '  - [ ] 送信不可',
      '  - 送信不可理由: ',
      '  - [ ] 営業見送り',
      '  - 見送り理由: ',
      '  - 送信日時: ',
      '  - 営業文（コピー用）:', '',
      '```text',
      record.outreach.message,
      '```', '');
  }
  for (const event of state.events.filter((item) => ['sent', 'previously_sent'].includes(item.result) && !previouslySent.has(item.lead_id))) {
    const label = event.result === 'previously_sent' ? '過去の送信を確認' : '送信済み';
    previouslySent.set(event.lead_id, `- [x] ${candidates.find((item) => item.lead_id === event.lead_id)?.identity?.name ?? event.lead_id}\n  - lead_id: ${event.lead_id}\n  - 状態: ${label}\n  - 送信チャネル: ${event.channel ?? '不明'}\n  - 送信先: ${event.destination ?? '不明'}\n  - 記録日時: ${event.recorded_at}\n  - 送信日時: ${event.occurred_at ?? '未記録'}\n  - 確認根拠: ${event.reason ?? '未記録'}\n\n\`\`\`text\n${event.message_snapshot ?? ''}\n\`\`\``);
  }
  const retired = [...previouslySent.entries()];
  fs.writeFileSync(files.sendQueue, `${send.join('\n')}\n`, 'utf8');
  const history = ['# 送信済み履歴（現行キュー対象外）', '', '送信当時の文面とチェック状態を保持します。', ''];
  for (const [, block] of retired) history.push(block, '');
  fs.writeFileSync(files.sentHistory, `${history.join('\n')}\n`, 'utf8');
  for (const event of state.events.filter((item) => item.result === 'unable')) {
    const key = `${event.lead_id}|${event.destination}`;
    if (!previouslyUnable.has(key)) previouslyUnable.set(key, `- [ ] ${candidates.find((item) => item.lead_id === event.lead_id)?.identity?.name ?? event.lead_id}\n  - lead_id: ${event.lead_id}\n  - 送信チャネル: ${event.channel}\n  - 送信先: ${event.destination}\n  - [x] 送信不可\n  - 送信不可理由: ${event.reason}\n  - 記録日時: ${event.recorded_at}`);
  }
  fs.writeFileSync(files.unableHistory, `# 送信不可の履歴（候補自体は維持）\n\n${[...previouslyUnable.values()].join('\n\n')}\n`, 'utf8');
  let skippedHistory = fs.existsSync(files.skippedHistory)
    ? fs.readFileSync(files.skippedHistory, 'utf8').trimEnd()
    : '# 営業見送りの履歴（事業者単位）';
  const archivedSkipIds = new Set([...skippedHistory.matchAll(/^  - event_id:\s*(\S+)/gm)].map((match) => match[1]));
  for (const event of state.events.filter((item) => item.result === 'lead_skip')) {
    if (archivedSkipIds.has(event.event_id)) continue;
    const name = candidates.find((item) => item.lead_id === event.lead_id)?.identity?.name ?? event.lead_id;
    skippedHistory += `\n\n- [x] ${name}\n  - lead_id: ${event.lead_id}\n  - 見送り理由: ${event.reason}\n  - 記録日時: ${event.recorded_at}\n  - event_id: ${event.event_id}`;
  }
  fs.writeFileSync(files.skippedHistory, `${skippedHistory}\n`, 'utf8');
  const phone = ['# 電話のみ確認できた営業候補', ''];
  const research = ['# 連絡先の追加確認が必要な営業候補', ''];
  for (const record of ordered) {
    const contact = assessContacts(record.contacts);
    if (contact.contactability === 'phone_only') phone.push(`- ${record.identity?.name} (${record.lead_id}) — ${(record.contacts?.channels ?? []).filter((c) => c.type === 'phone').map((c) => c.value).join(' / ')}`);
    if (['contact_not_found', 'contact_unverified'].includes(contact.contactability)) research.push(`- ${record.identity?.name} (${record.lead_id}) — ${contact.contactability} / ${contact.researchStatus}`);
    else if (contact.contactability === 'text_ready' && !preferredTextChannel(record, state)) research.push(`- ${record.identity?.name} (${record.lead_id}) — 確認済みの文章窓口が送信不可。別窓口を要確認`);
  }
  fs.writeFileSync(files.phoneOnly, `${phone.join('\n')}\n`, 'utf8');
  fs.writeFileSync(files.contactResearch, `${research.join('\n')}\n`, 'utf8');
}

function validateRun(runDir) {
  const files = assertRun(runDir);
  const manifest = readJson(files.manifest);
  const records = readJsonl(files.businesses);
  const errors = [];
  const warnings = [];
  const ids = new Set();
  for (const record of records) {
    const label = record.lead_id || record.identity?.name || '<unknown>';
    if (ids.has(record.lead_id)) errors.push(`${label}: duplicate lead_id`);
    ids.add(record.lead_id);
    checkEnum(errors, label, 'website.presence', record.website?.presence, ENUMS.websitePresence);
    checkEnum(errors, label, 'renewal.opportunity', record.renewal?.opportunity, ENUMS.renewalOpportunity);
    checkEnum(errors, label, 'lead.status', record.lead?.status, ENUMS.leadStatus);
    checkEnum(errors, label, 'visual.status', record.visual?.status, ENUMS.visualStatus);
    checkEnum(errors, label, 'workflow.stage', record.workflow?.stage, ENUMS.workflowStage);
    checkEnum(errors, label, 'workflow.result', record.workflow?.result, ENUMS.workflowResult);
    if (manifest.qualification_rules_version === 1 && record.schema_version >= 4) {
      checkEnum(errors, label, 'activity.status', record.activity?.status, ACTIVITY_STATUSES);
      checkEnum(errors, label, 'web_gap.status', record.web_gap?.status, WEB_GAP_STATUSES);
      checkEnum(errors, label, 'triage.decision', record.triage?.decision, TRIAGE_DECISIONS);
      if (record.triage?.decision !== 'pending' && (!record.triage?.reason || !checkedAt(record.triage?.checked_at))) {
        errors.push(`${label}: triage decision needs reason and checked_at`);
      }
      checkEnum(errors, label, 'qualification.status', record.qualification?.status, QUALIFICATION_STATUSES);
      checkEnum(errors, label, 'qualification.priority', record.qualification?.priority, QUALIFICATION_PRIORITIES);
      const evidence = new Map((record.evidence ?? []).map((item) => [item.id, item]));
      if (evidence.size !== (record.evidence ?? []).length) errors.push(`${label}: duplicate evidence id`);
      for (const item of record.evidence ?? []) {
        if (!item.id || !item.kind || !EVIDENCE_STATUSES.includes(item.status)) errors.push(`${label}: invalid evidence item`);
        if (item.status !== 'not_checked' && (!httpUrl(item.source_url) || !checkedAt(item.checked_at))) errors.push(`${label}: checked evidence needs source_url and checked_at`);
        if (item.status === 'observed' && !item.observation) errors.push(`${label}: observed evidence needs observation`);
        if (item.status === 'not_observed' && !item.scope) errors.push(`${label}: not_observed evidence needs checked scope`);
      }
      for (const id of [...(record.activity?.evidence_ids ?? []), ...(record.web_gap?.evidence_ids ?? [])]) {
        if (!evidence.has(id)) errors.push(`${label}: activity or web_gap references unknown evidence ${id}`);
      }
      const qualification = record.qualification ?? {};
      if (qualification.rules_version !== 1) errors.push(`${label}: invalid qualification rules_version`);
      if (qualification.status === 'pursue') {
        if (record.lead?.status !== 'candidate') errors.push(`${label}: pursue requires candidate`);
        if (record.triage?.decision !== 'advance') errors.push(`${label}: pursue requires triage advance`);
        if (record.activity?.status === 'inactive') errors.push(`${label}: inactive business cannot be pursue`);
        if (!qualification.reason || !qualification.web_proposal || !qualification.business_use ||
          !QUALIFICATION_PRIORITIES.slice(0, 3).includes(qualification.priority) || !checkedAt(qualification.checked_at)) {
          errors.push(`${label}: pursue requires reason, specific web proposal, business use, priority, and checked_at`);
        }
        if (!(qualification.evidence_ids ?? []).some((id) => evidence.get(id)?.status === 'observed')) errors.push(`${label}: pursue requires observed sourced evidence`);
      }
      if (qualification.status === 'watch' && (!qualification.reason || !qualification.next_action || !checkedAt(qualification.review_after))) {
        errors.push(`${label}: watch requires reason, next_action, and review_after`);
      }
      if (qualification.status === 'drop' && !qualification.reason) errors.push(`${label}: drop requires reason`);
      if (qualification.status !== 'pursue' && qualification.priority !== null) errors.push(`${label}: only pursue may have a priority`);
      for (const id of qualification.evidence_ids ?? []) if (!evidence.has(id)) errors.push(`${label}: qualification references unknown evidence ${id}`);
      if (['generated', 'reviewed'].includes(record.outreach?.status) && record.outreach?.reason_version === 3 && qualification.status !== 'pursue') {
        errors.push(`${label}: v4 outreach requires pursue qualification`);
      }
    }
    if (record.website?.presence !== 'confirmed' && record.renewal?.opportunity !== 'not_applicable') {
      errors.push(`${label}: non-confirmed website must use renewal.not_applicable`);
    }
    if (record.visual?.status === 'verified') {
      const viewports = new Set((record.visual.evidence ?? []).map((item) => item.viewport));
      if (!viewports.has('desktop') || !viewports.has('mobile')) errors.push(`${label}: verified visual requires desktop and mobile evidence`);
      if ((record.visual.evidence ?? []).some((item) => !item.evidence_ref || !item.observation)) errors.push(`${label}: visual evidence requires evidence_ref and observation`);
    }
    if (record.lead?.status === 'recheck') {
      if (!RECHECK_REASONS.includes(record.lead?.recheck?.reason_code)) errors.push(`${label}: invalid or missing recheck reason_code`);
      if (!record.lead?.recheck?.reason) errors.push(`${label}: recheck requires concrete reason`);
    }
    if (record.schema_version >= 3) {
      checkEnum(errors, label, 'contactability', record.contactability, ENUMS.contactability);
      checkEnum(errors, label, 'sales_reason_status', record.sales_reason_status, ENUMS.salesReasonStatus);
      const contact = assessContacts(record.contacts);
      const hasChecks = Object.hasOwn(record.contacts ?? {}, 'research_checks');
      if (hasChecks) {
        for (const key of REQUIRED_TEXT_CHECKS) {
          const check = record.contacts.research_checks?.[key];
          if (!check || !CONTACT_CHECK_STATUSES.includes(check.status)) {
            errors.push(`${label}: missing or invalid contact research check ${key}`);
            continue;
          }
          if (check.status !== 'not_checked' && (!httpUrl(check.source_url) || !checkedAt(check.checked_at))) {
            errors.push(`${label}: ${key} check requires source_url and checked_at`);
          }
          if (check.status === 'found' && !((record.contacts?.channels ?? []).some((channel) =>
            checkKey(channel) === key && usableTextChannel(channel) &&
            normalizeChannel(channel).value === check.value &&
            channel.source_url === check.source_url && channel.checked_at === check.checked_at))) {
            errors.push(`${label}: ${key} found check requires a matching usable channel`);
          }
        }
        checkEnum(errors, label, 'contacts.research_status', record.contacts?.research_status, CONTACT_RESEARCH_STATUSES);
        if (record.contacts?.research_status !== contact.researchStatus) errors.push(`${label}: research_status does not match channel checks`);
        if (record.contactability !== contact.contactability) errors.push(`${label}: contactability does not match channel evidence`);
        if (record.contacts?.text_outreach_available !== (contact.contactability === 'text_ready')) errors.push(`${label}: text_outreach_available does not match channel evidence`);
      } else if (record.contactability !== contact.contactability || record.contacts?.research_status !== contact.researchStatus) {
        warnings.push(`${label}: legacy contact state needs evidence-based refresh before outreach`);
      }
      if (record.sales_reason_status === 'ready') {
        if (!record.sales_reason?.fact || !record.sales_reason?.source_url || !record.sales_reason?.checked_at || !record.sales_reason?.why_web || !record.sales_reason?.proposal) errors.push(`${label}: ready sales reason requires sourced fact, check date, web rationale, and proposal`);
        if (!hasMatchingSalesReasonFact(record)) errors.push(`${label}: ready sales reason requires a matching sourced sales_relevant_web_fact`);
      }
      if (record.outreach?.reason_version === 3 && record.sales_reason_status !== 'ready') errors.push(`${label}: v3 outreach requires a ready sales reason`);
      if (['generated', 'reviewed'].includes(record.outreach?.status) && record.outreach?.reason_version !== 3 && record.outreach?.legacy !== true) errors.push(`${label}: generated v3 outreach requires reason_version=3`);
      if (['generated', 'reviewed'].includes(record.outreach?.status) && record.outreach?.reason_version === 3 && contact.contactability !== 'text_ready') errors.push(`${label}: v3 text outreach requires a verified text contact`);
      if (record.outreach?.status === 'reviewed' && record.outreach?.reason_version === 3 && record.outreach?.reviewed !== true) errors.push(`${label}: reviewed v3 outreach requires reviewed=true`);
    }
    if (record.lead?.status === 'excluded' && /重複|duplicate/i.test((record.lead?.exclusion_reasons ?? []).join(' '))) {
      errors.push(`${label}: confirmed duplicates must be merged by code, not kept as excluded leads`);
    }
    if (record.personalization?.status === 'ready' && !(record.personalization?.facts ?? []).some((fact) => fact.safe_for_outreach === true)) {
      errors.push(`${label}: ready personalization requires at least one safe fact`);
    }
    if (['generated', 'reviewed'].includes(record.outreach?.status) && !record.outreach?.message) errors.push(`${label}: generated outreach requires message`);
    if (record.website?.presence === 'unconfirmed' && /公式サイトがないため/.test(record.outreach?.message ?? '')) {
      errors.push(`${label}: unconfirmed website outreach asserts site absence`);
    }
    if (record.schema_version < 3 && manifest.state === 'complete' && record.lead?.status === 'candidate' && record.personalization?.status === 'ready' && !['generated', 'reviewed'].includes(record.outreach?.status)) {
      errors.push(`${label}: completed candidate with safe personalization must have outreach`);
    }
  }
  const events = readJsonl(files.outcomeEvents);
  const eventIds = new Set();
  for (const event of events) {
    if (!event.event_id || eventIds.has(event.event_id)) errors.push(`outcome: duplicate or missing event_id`);
    eventIds.add(event.event_id);
    if (!ids.has(event.lead_id)) errors.push(`outcome: unknown lead_id ${event.lead_id}`);
    if (!OUTCOME_RESULTS.includes(event.result)) errors.push(`outcome: invalid result ${event.result}`);
    if (!checkedAt(event.recorded_at)) errors.push(`outcome: invalid recorded_at ${event.event_id}`);
    if (event.occurred_at && !checkedAt(event.occurred_at)) errors.push(`outcome: invalid occurred_at ${event.event_id}`);
    if (event.result === 'unable' && (!event.channel || !event.destination || !event.reason)) errors.push(`outcome: unable needs channel, destination, and reason`);
    if (event.result === 'previously_sent' && !event.reason) errors.push(`outcome: previously_sent needs a reason`);
    if (event.result === 'lead_skip' && !event.reason) errors.push(`outcome: lead_skip needs a reason`);
  }
  return { valid: errors.length === 0, errors, warnings, records: records.length };
}

function checkEnum(errors, label, field, value, allowed) {
  if (!allowed.includes(value)) errors.push(`${label}: invalid ${field}=${value}`);
}

function commandSummarize(args) {
  const runDir = path.resolve(required(args, 'run'));
  console.log(JSON.stringify(buildSummary(runDir), null, 2));
}

function commandSettleQueue(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const records = readJsonl(files.businesses);
  const report = settleQueue({ files, records, apply: args.apply === true,
    allowLegacyUnable: args['allow-legacy-unable'] === true,
    isOfficialContact: savedOfficialContact });
  console.log(JSON.stringify(report, null, 2));
}

function commandValidate(args) {
  const runDir = path.resolve(required(args, 'run'));
  const result = validateRun(runDir);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

function commandRecordOutcome(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const leadId = required(args, 'lead-id');
  const result = required(args, 'result');
  if (!OUTCOME_RESULTS.includes(result)) throw new Error(`Invalid outcome result: ${result}`);
  const record = readJsonl(files.businesses).find((item) => item.lead_id === leadId);
  if (!record) throw new Error(`Unknown lead_id: ${leadId}`);
  requireSettledQueue(files, readJsonl(files.businesses));
  const state = outcomeState(files);
  const channel = args.channel ?? null;
  const destination = args.destination ?? null;
  if (['sent', 'unable', 'reopen'].includes(result) && (!channel || !destination)) throw new Error(`${result} needs --channel and --destination`);
  if (result === 'unable' && !args.reason) throw new Error('unable needs --reason');
  if (result === 'lead_skip' && !args.reason) throw new Error('lead_skip needs --reason');
  if (result === 'previously_sent' && !args.reason) throw new Error('previously_sent needs --reason');
  if (['sent', 'unable'].includes(result) && !(record.contacts?.channels ?? []).some((item) =>
    item.type === channel && normalizeChannel(item).value === destination && item.official === true)) {
    throw new Error(`${result} destination must match a saved official contact channel`);
  }
  if (result === 'sent' && !(record.contacts?.channels ?? []).some((item) =>
    item.type === channel && normalizeChannel(item).value === destination && usableTextChannel(item))) {
    throw new Error('sent requires a currently usable official text channel');
  }
  if (['sent', 'previously_sent'].includes(result) && state.sent.has(leadId)) {
    console.log(JSON.stringify({ already_recorded: true, lead_id: leadId, result }, null, 2));
    return;
  }
  const key = destinationKey(channel, destination);
  if (result === 'previously_sent' && state.skipped.has(leadId)) throw new Error('Reopen a skipped lead before recording previously_sent');
  if (result === 'sent' && state.blocked.get(leadId)?.has(key)) throw new Error('Reopen an unavailable destination before recording sent');
  if (result === 'unable' && state.blocked.get(leadId)?.has(key)) {
    console.log(JSON.stringify({ already_recorded: true, lead_id: leadId, result }, null, 2));
    return;
  }
  if (result === 'reopen' && !state.blocked.get(leadId)?.has(key)) throw new Error('Destination is not marked unable');
  if (result === 'lead_skip' && state.sent.has(leadId)) throw new Error('Cannot skip an already sent lead');
  if (result === 'lead_skip' && state.skipped.has(leadId)) {
    console.log(JSON.stringify({ already_recorded: true, lead_id: leadId, result }, null, 2));
    return;
  }
  if (result === 'lead_reopen' && !state.skipped.has(leadId)) throw new Error('Lead is not skipped');
  if (['reply', 'meeting', 'proposal', 'won', 'lost'].includes(result) && !state.sent.has(leadId)) throw new Error(`${result} needs a recorded sent outcome`);
  const occurredAt = args['occurred-at'] ?? null;
  if (occurredAt && !checkedAt(occurredAt)) throw new Error('Invalid --occurred-at');
  appendOutcome(files, { lead_id: leadId, result, channel, destination, reason: args.reason ?? null,
    occurred_at: occurredAt, source: 'manual_command', message_snapshot: ['sent', 'unable'].includes(result) ? record.outreach?.message ?? null : null });
  const summary = buildSummary(runDir);
  console.log(JSON.stringify({ lead_id: leadId, result, funnel: summary.funnel }, null, 2));
}

// research_checksやchannelsを直接編集した後にcontactability/research_status/
// text_outreach_availableをコードの正規ロジックで再計算する。importの通常経路
// (defaultRecord経由)を通さず修正した場合の後始末に使う。
function commandRecomputeContacts(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const records = readJsonl(files.businesses);
  let changed = 0;
  for (const record of records) {
    const before = JSON.stringify({ contactability: record.contactability, research_status: record.contacts?.research_status, text_outreach_available: record.contacts?.text_outreach_available });
    updateContactState(record);
    const after = JSON.stringify({ contactability: record.contactability, research_status: record.contacts?.research_status, text_outreach_available: record.contacts?.text_outreach_available });
    if (before !== after) changed += 1;
  }
  writeJsonlAtomic(files.businesses, records);
  console.log(JSON.stringify({ records: records.length, changed }, null, 2));
}

function commandComplete(args) {
  const runDir = path.resolve(required(args, 'run'));
  const files = assertRun(runDir);
  const manifest = readJson(files.manifest);
  if (args['stop-reason']) manifest.stop_reason = args['stop-reason'];
  manifest.state = 'complete';
  manifest.updated_at = now();
  writeJsonAtomic(files.manifest, manifest);
  const validation = validateRun(runDir);
  if (!validation.valid) {
    manifest.state = 'partial';
    writeJsonAtomic(files.manifest, manifest);
    console.log(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
    return;
  }
  const summary = buildSummary(runDir);
  console.log(JSON.stringify({ completed: true, summary }, null, 2));
}

function required(args, key) {
  if (args[key] === undefined || args[key] === true || args[key] === '') throw new Error(`Missing --${key}`);
  return args[key];
}

function escapeMarkdown(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function usage() {
  console.log(`Usage:
  web-sales-store.mjs init --run DIR --run-id ID --region REGION --industry INDUSTRY
  web-sales-store.mjs resume --run DIR
  web-sales-store.mjs import --run DIR --input FILE [--legacy-root DIR] [--route-id ID --route-type TYPE --phase basic|additional]
  web-sales-store.mjs merge-duplicates --run DIR --input FILE
  web-sales-store.mjs reassess --run DIR [--decisions FILE]
  web-sales-store.mjs search-log --run DIR --route-id ID --route-type TYPE --phase basic|additional --new-unique N
  web-sales-store.mjs set-stop --run DIR --reason REASON
  web-sales-store.mjs summarize --run DIR
   web-sales-store.mjs plan-drafts --run DIR [--limit N] (read-only; default 10)
  web-sales-store.mjs settle-queue --run DIR [--apply] [--allow-legacy-unable] (default: preview only)
  web-sales-store.mjs record-outcome --run DIR --lead-id ID --result sent|previously_sent|unable|reopen|lead_skip|lead_reopen|reply|meeting|proposal|won|lost [--channel TYPE --destination VALUE] [--reason TEXT] [--occurred-at ISO]
  web-sales-store.mjs validate --run DIR
  web-sales-store.mjs complete --run DIR [--stop-reason REASON]
  web-sales-store.mjs recompute-contacts --run DIR`);
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];
try {
  if (command === 'init') commandInit(args);
  else if (command === 'resume') commandResume(args);
  else if (command === 'import') commandImport(args);
  else if (command === 'merge-duplicates') commandMergeDuplicates(args);
  else if (command === 'reassess') commandReassess(args);
  else if (command === 'search-log') commandSearchLog(args);
  else if (command === 'set-stop') commandSetStop(args);
  else if (command === 'summarize') commandSummarize(args);
  else if (command === 'plan-drafts') commandPlanDrafts(args);
  else if (command === 'settle-queue') commandSettleQueue(args);
  else if (command === 'record-outcome') commandRecordOutcome(args);
  else if (command === 'validate') commandValidate(args);
  else if (command === 'complete') commandComplete(args);
  else if (command === 'recompute-contacts') commandRecomputeContacts(args);
  else usage();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
