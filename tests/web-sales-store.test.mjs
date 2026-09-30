import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCRIPT = path.join(ROOT, 'scripts', 'web-sales-store.mjs');

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  assert.equal(result.status, expected, `stderr: ${result.stderr}\nstdout: ${result.stdout}`);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

function writeJsonl(file, records) {
  fs.writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');
}

function markLegacyRun(runDir) {
  const file = path.join(runDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  manifest.schema_version = 3;
  delete manifest.qualification_rules_version;
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

const CHECK_KEYS = ['instagram_dm', 'email', 'contact_form', 'official_line', 'other_text_channel'];
const CHECKED_AT = '2026-09-27T00:00:00Z';
function negativeChecks() {
  return Object.fromEntries(CHECK_KEYS.map((key) => [key, {
    status: 'not_found', value: null, source_url: `https://example.com/check/${key}`,
    checked_at: CHECKED_AT, notes: '公式サイトと公式媒体を確認'
  }]));
}
function sourced(channel) {
  return { ...channel, source_url: 'https://example.com/contact', checked_at: CHECKED_AT };
}

test('v2 store keeps axes independent, deduplicates, saturates, and summarizes', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-store-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'test-run', '--region', 'テスト市', '--industry', 'テスト業']);
    const batch = path.join(temp, 'batch.jsonl');
    writeJsonl(batch, [
      {
        identity: { name: '未確認サイト店', region: 'テスト市', address: '1-1', industry: 'テスト業', business_status: 'active' },
        website: { presence: 'unconfirmed', url: null },
        contacts: { channels: [{ type: 'phone', value: '000-111-2222', official: true }], text_outreach_available: false },
        personalization: { status: 'ready', facts: [{ fact: 'Instagramでサービスを発信', source_url: 'https://instagram.com/example', checked_at: '2026-09-24T00:00:00Z', safe_for_outreach: true }] },
        outreach: { status: 'generated', message: 'Instagramでサービス内容を発信されているのを拝見し、ご連絡しました。サービス内容をまとめた公式サイトの制作も可能です。', individualized_part: 'Instagramでサービス内容を発信', reviewed: false },
        workflow: { stage: 'outreach_generated', result: 'in_progress' },
        lead: { status: 'candidate', priority: 'medium', proposal_type: 'new_site' }
      },
      {
        identity: { name: '未確認サイト店', region: 'テスト市', address: '1-1', industry: 'テスト業', business_status: 'active' },
        discovery_sources: [{ route_id: 'map-01', url: 'https://example.com/map', source_type: 'map' }]
      },
      {
        identity: { name: '視覚確認店', region: 'テスト市', address: '2-2', industry: 'テスト業', business_status: 'active' },
        website: { presence: 'confirmed', url: 'https://visual.example.com/' },
        visual: { status: 'verified', desktop_checked: true, mobile_checked: true, evidence: [
          { viewport: 'desktop', observation: 'トップページ確認', evidence_ref: 'desktop.png' },
          { viewport: 'mobile', observation: '横スクロール確認', evidence_ref: 'mobile.png' }
        ] },
        renewal: { opportunity: 'large', reasons: ['mobile layout'] },
        lead: { status: 'candidate', priority: 'high', proposal_type: 'redesign' },
        contacts: { channels: [sourced({ type: 'email', value: 'info@example.com', official: true, sales_prohibited: false })], text_outreach_available: true },
        personalization: { status: 'ready', facts: [{ fact: '料金ページを掲載', source_url: 'https://visual.example.com/price', checked_at: '2026-09-24T00:00:00Z', safe_for_outreach: true }] },
        outreach: { status: 'reviewed', message: '料金やサービスを案内されているのを拝見し、現在の内容に合わせたサイト制作をご提案できればと思いました。', individualized_part: '料金やサービスを案内', reviewed: true },
        workflow: { stage: 'reviewed', result: 'completed' }
      },
      {
        identity: { name: '視覚未確認候補', region: 'テスト市', address: '3-3', industry: 'テスト業', business_status: 'active' },
        website: { presence: 'confirmed', url: 'https://unverified.example.com/' },
        visual: { status: 'unverified', desktop_checked: false, mobile_checked: false, evidence: [] },
        renewal: { opportunity: 'undetermined', reasons: ['capture failed'] },
        lead: { status: 'candidate', priority: 'low', proposal_type: 'redesign' },
        contacts: { channels: [{ type: 'phone', value: '000-333-4444', official: true }], text_outreach_available: false },
        personalization: { status: 'ready', facts: [{ fact: '予約媒体を利用', source_url: 'https://booking.example.com/', checked_at: '2026-09-24T00:00:00Z', safe_for_outreach: true }] },
        outreach: { status: 'generated', message: '予約媒体でサービスをご案内されているのを拝見し、現在の媒体を活かしたWebサイト制作も可能です。', individualized_part: '予約媒体でサービスをご案内', reviewed: false },
        workflow: { stage: 'outreach_generated', result: 'in_progress' }
      },
      {
        identity: { name: '除外店', region: 'テスト市', address: '4-4', industry: 'テスト業', business_status: 'active' },
        website: { presence: 'confirmed', url: 'https://polished.example.com/' },
        visual: { status: 'unverified', desktop_checked: false, mobile_checked: false, evidence: [] },
        renewal: { opportunity: 'small', reasons: ['提案余地がほぼない'] },
        lead: { status: 'excluded', priority: null, proposal_type: null, exclusion_reasons: ['提案余地がほぼない'] },
        workflow: { stage: 'triaged', result: 'excluded' }
      },
      {
        identity: { name: '同名識別不能店', region: 'テスト市', address: '', industry: 'テスト業', business_status: 'conflicting' },
        website: { presence: 'unconfirmed', url: null },
        lead: { status: 'recheck', priority: null, proposal_type: null, recheck: { reason_code: 'business_identity_ambiguity', reason: '同名店舗を識別できない', attempted_sources: [], retry_count: 1, next_action: '住所確認' } },
        workflow: { stage: 'triaged', result: 'in_progress' }
      }
    ].map((record) => ({ ...record, schema_version: 2 })));
    const imported = run(['import', '--run', runDir, '--input', batch, '--route-id', 'web-01', '--route-type', 'web', '--phase', 'basic']);
    assert.equal(imported.input, 6);
    assert.equal(imported.added, 5);
    assert.equal(imported.updated, 1);
    assert.equal(imported.unique_total, 5);

    const basic = ['map','industry_media','region_variant','station_area','industry_synonym'];
    for (const route of basic) run(['search-log','--run',runDir,'--route-id',`${route}-01`,'--route-type',route,'--phase','basic','--new-unique','2']);
    for (let i = 1; i <= 3; i += 1) run(['search-log','--run',runDir,'--route-id',`extra-${i}`,'--route-type','additional','--phase','additional','--new-unique','1']);

    const manifest = JSON.parse(fs.readFileSync(path.join(runDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.discovery.basic_discovery_completed, true);
    assert.equal(manifest.discovery.saturated, true);
    assert.equal(manifest.stop_reason, 'saturated');

    const validation = run(['validate', '--run', runDir]);
    assert.equal(validation.valid, true);
    run(['complete', '--run', runDir, '--stop-reason', 'saturated']);

    const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'market-summary.json'), 'utf8'));
    assert.equal(summary.discovery.observed_unique_businesses, 5);
    assert.equal(summary.discovery.merged_duplicates, 0);
    assert.equal(summary.website_presence.confirmed, 3);
    assert.equal(summary.website_presence.unconfirmed, 2);
    assert.equal(summary.lead_status.candidate, 3);
    assert.equal(summary.lead_status.excluded, 1);
    assert.equal(summary.lead_status.recheck, 1);
    assert.equal(summary.candidates.text_outreach_available, 1);
    assert.equal(summary.funnel.discovered, 5);
    assert.equal(summary.funnel.candidate, 3);
    assert.equal(summary.funnel.contact_checked, 1);
    assert.equal(summary.funnel.text_ready, 1);
    assert.equal(summary.funnel.send_queue_ready, 0);
    assert.equal(summary.candidates.text_outreach_unavailable, 2);
    assert.equal(summary.candidates.outreach_generated, 3);

    const records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    const unverified = records.find((record) => record.identity.name === '視覚未確認候補');
    assert.equal(unverified.visual.status, 'unverified');
    assert.equal(unverified.lead.status, 'candidate');
    assert.equal(unverified.contacts.text_outreach_available, false);
    assert.equal(unverified.outreach.status, 'generated');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('active runtime files do not contain legacy gating rules', () => {
  const files = [
    path.join(ROOT, 'CLAUDE.md'),
    ...walk(path.join(ROOT, '.claude')),
    ...walk(path.join(ROOT, 'schemas'))
  ];
  const forbidden = [/G1[〜~-]G5/, /A\/B\/C/, /有望\/保留\/除外/, /最も強い反対仮説/];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(content, pattern, `${file} contains ${pattern}`);
  }
});

test('proposal review rules are shared by v3 and v4 workers without treating send failure as self-improvement', () => {
  const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
  const skill = read('.claude/skills/web-sales/SKILL.md');
  const opportunity = read('schemas/proposal-opportunity-review.md');
  const outreach = read('.claude/agents/outreach-worker.md');
  const review = read('.claude/agents/review-worker.md');
  assert.match(skill, /schemas\/proposal-opportunity-review\.md/);
  assert.match(skill, /旧v3 runは`qualification\.status`を持たない/);
  assert.match(outreach, /旧v3 runは`qualification\.status`を要求せず/);
  assert.match(review, /営業・勧誘禁止/);
  assert.match(opportunity, /同じ役割が既に果たされ、意味のある改善差分もなければ.*撤回する/);
  assert.match(opportunity, /送信不可理由.*Claudeの自己評価を記入しない/);
  assert.match(opportunity, /Skill改善フィードバック.*自己判断で書き換えない/s);
  assert.doesNotMatch(read('schemas/data-model-v4.md'), /料金と予約先が別ページで案内されている/);
});

test('technical stop preserves a partial resumable run', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-stop-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'partial-run', '--region', 'テスト市', '--industry', 'テスト業']);
    run(['set-stop', '--run', runDir, '--reason', 'technical_limit']);
    const manifest = JSON.parse(fs.readFileSync(path.join(runDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.state, 'partial');
    assert.equal(manifest.stop_reason, 'technical_limit');
    run(['resume', '--run', runDir]);
    const resumed = JSON.parse(fs.readFileSync(path.join(runDir, 'manifest.json'), 'utf8'));
    assert.equal(resumed.state, 'running');
    assert.equal(resumed.stop_reason, null);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('confirmed duplicates are merged into one observed business', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-merge-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'merge-run', '--region', 'テスト市', '--industry', 'テスト業']);
    const batch = path.join(temp, 'batch.jsonl');
    writeJsonl(batch, [
      { identity: { name: 'Studio Alpha', region: 'テスト市', address: '駅前1', industry: 'テスト業', business_status: 'active' }, discovery_sources: [{ route_id: 'web-01', url: 'https://example.com/a' }] },
      { identity: { name: 'スタジオアルファ本店', region: 'テスト市', address: '駅前ビル1階', industry: 'テスト業', business_status: 'active' }, discovery_sources: [{ route_id: 'map-01', url: 'https://example.com/b' }] }
    ].map((record) => ({ schema_version: 2, ...record })));
    run(['import', '--run', runDir, '--input', batch]);
    let records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records.length, 2);
    const decision = path.join(temp, 'duplicates.jsonl');
    writeJsonl(decision, [{ primary_lead_id: records[0].lead_id, duplicate_lead_ids: [records[1].lead_id], reason: '公式情報で同一店舗と確認' }]);
    const merged = run(['merge-duplicates', '--run', runDir, '--input', decision]);
    assert.equal(merged.merged_duplicates, 1);
    assert.equal(merged.unique_total, 1);
    records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records.length, 1);
    assert.ok(records[0].identity.aliases.includes('スタジオアルファ本店'));
    const summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.discovery.merged_duplicates, 1);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('import keeps branches on one domain and same-name stores at different addresses separate', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-dedupe-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'dedupe-test', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [
      { identity: { name: 'チェーン例店A', region: '例市', address: '一丁目1-1' }, website: { presence: 'confirmed', url: 'https://chain.example.com/a' }, contacts: { channels: [{ type: 'phone', value: '06-1111-1111', official: true }] } },
      { identity: { name: 'チェーン例店B', region: '例市', address: '二丁目2-2' }, website: { presence: 'confirmed', url: 'https://chain.example.com/b' }, contacts: { channels: [{ type: 'phone', value: '06-1111-1111', official: true }] } },
      { identity: { name: '同名サロン', region: '例市', address: '三丁目3-3' } },
      { identity: { name: '同名サロン', region: '例市', address: '四丁目4-4' } },
      { identity: { name: '同名サロン', region: '例市' }, discovery_sources: [{ route_id: 'web-01', url: 'https://listing.example.com/one' }] },
      { identity: { name: '同名サロン', region: '例市' }, discovery_sources: [{ route_id: 'map-01', url: 'https://listing.example.com/two' }] },
      { identity: { name: '同名サロン', region: '例市', address: '三丁目3-3' }, discovery_sources: [{ route_id: 'map-02', url: 'https://listing.example.com/three' }] }
    ]);
    const result = run(['import', '--run', runDir, '--input', input]);
    assert.equal(result.added, 6);
    assert.equal(result.updated, 1);
    const records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(new Set(records.map((record) => record.lead_id)).size, 6);
    assert.equal(records.filter((record) => record.identity.name === '同名サロン').length, 4);
    assert.equal(records.find((record) => record.identity.address === '三丁目3-3').discovery_sources.length, 1);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('site access failure cannot be used as a recheck reason', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-invalid-recheck-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'invalid-recheck', '--region', '例市', '--industry', '例業種']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [{
      identity: { name: '表示未確認スタジオ', region: '例市', industry: '例業種', business_status: 'active' },
      website: { presence: 'confirmed', url: 'https://access.example.com/' },
      visual: { status: 'unverified', desktop_checked: false, mobile_checked: false, evidence: [] },
      renewal: { opportunity: 'undetermined', reasons: ['サイトへ一時的にアクセスできない'] },
      lead: { status: 'recheck', priority: null, proposal_type: null, recheck: { reason_code: 'site_access_failure', reason: '表示取得失敗' } }
    }]);
    run(['import', '--run', runDir, '--input', input]);
    const result = spawnSync(process.execPath, [SCRIPT, 'validate', '--run', runDir], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /invalid or missing recheck reason_code/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('reassessment separates sendable leads, preserves legacy copy and sent history', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-v3-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'v3-test', '--region', '例市', '--industry', 'サロン']);
    markLegacyRun(runDir);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [
      { lead_id: 'sendable', identity: { name: '送信可能店', region: '例市' }, lead: { status: 'candidate', priority: 'high' }, contacts: { channels: [sourced({ type: 'instagram_dm', value: '@sendable', official: true, sales_prohibited: false })], text_outreach_available: true }, personalization: { status: 'ready', facts: [{ fact: '駅から徒歩3分', safe_for_outreach: true }] }, outreach: { status: 'reviewed', message: '旧文面', reviewed: true } },
      { lead_id: 'phone', identity: { name: '電話のみ店', region: '例市' }, lead: { status: 'candidate', priority: 'medium' }, contacts: { channels: [{ type: 'phone', value: '06-1234-5678', official: true }], text_outreach_available: true, research_status: 'completed', research_checks: negativeChecks() }, outreach: { status: 'reviewed', message: '旧文面', reviewed: true } },
      { lead_id: 'unknown', identity: { name: '確認不足店', region: '例市' }, lead: { status: 'candidate', priority: 'low' }, contacts: { channels: [{ type: 'official_line', value: '公式LINE', official: true }], text_outreach_available: true } },
      { lead_id: 'no-sales', identity: { name: '営業お断り店', region: '例市' }, lead: { status: 'candidate', priority: 'medium' }, contacts: { channels: [{ type: 'instagram_dm', value: '@no_sales', official: true }], text_outreach_available: true } }
    ].map((record) => ({ schema_version: 2, ...record })));
    run(['import', '--run', runDir, '--input', input]);
    const decisions = path.join(temp, 'decisions.jsonl');
    writeJsonl(decisions, [{ lead_id: 'sendable', sales_reason_status: 'ready', sales_reason: { fact: 'スマートフォンの予約先が分かれています', source_url: 'https://example.com/', why_web: '予約導線を整理できる', proposal: '導線整理', checked_at: '2026-09-26' }, message: 'Web上の予約導線を整理するご提案です。', reviewed: true }, { lead_id: 'no-sales', sales_prohibited_all: true, exclude_reason: '公式サイトに営業・勧誘お断りと明記', contact_research_status: 'completed', contact_research_checks: negativeChecks() }]);
    run(['reassess', '--run', runDir, '--decisions', decisions]);
    const records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records.find((r) => r.lead_id === 'phone').contactability, 'phone_only');
    assert.equal(records.find((r) => r.lead_id === 'phone').contacts.text_outreach_available, false);
    assert.equal(records.find((r) => r.lead_id === 'unknown').contactability, 'contact_unverified');
    assert.equal(records.find((r) => r.lead_id === 'no-sales').lead.status, 'excluded');
    assert.equal(records.find((r) => r.lead_id === 'no-sales').contactability, 'contact_not_found');
    assert.equal(records.find((r) => r.lead_id === 'sendable').personalization.facts[0].fact_type, 'business_fact');
    assert.equal(records.find((r) => r.lead_id === 'sendable').sales_reason_status, 'ready');
    assert.equal(records.find((r) => r.lead_id === 'phone').sales_reason_status, 'pending');
    const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'market-summary.json'), 'utf8'));
    assert.equal(summary.candidates.current_outreach_generated, 1);
    assert.equal(summary.candidates.legacy_outreach_preserved, 1);
    assert.equal(summary.reassessment.status, 'partial');
    const queue = path.join(runDir, 'send-queue.md');
    assert.match(fs.readFileSync(queue, 'utf8'), /- \[ \] 送信可能店/);
    assert.doesNotMatch(fs.readFileSync(queue, 'utf8'), /電話のみ店/);
    assert.match(fs.readFileSync(path.join(runDir, 'phone-only-leads.md'), 'utf8'), /電話のみ店/);
    assert.match(fs.readFileSync(path.join(runDir, 'contact-research-needed.md'), 'utf8'), /確認不足店/);
    fs.writeFileSync(queue, fs.readFileSync(queue, 'utf8').replace('- [ ] 送信可能店', '- [x] 送信可能店'));
    run(['settle-queue', '--run', runDir, '--apply']);
    run(['reassess', '--run', runDir, '--decisions', decisions]);
    assert.equal(JSON.parse(fs.readFileSync(path.join(runDir, 'market-summary.json'), 'utf8')).funnel.send_queue_ready, 0);
    assert.doesNotMatch(fs.readFileSync(queue, 'utf8'), /送信可能店/);
    assert.match(fs.readFileSync(path.join(runDir, 'sent-history.md'), 'utf8'), /- \[x\] 送信可能店/);
    assert.match(fs.readFileSync(path.join(runDir, 'sent-history.md'), 'utf8'), /Web上の予約導線を整理するご提案です。/);
    const rerunRecords = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(rerunRecords.find((r) => r.lead_id === 'sendable').outreach.reason_version, 3);
    assert.equal(rerunRecords.find((r) => r.lead_id === 'sendable').outreach.legacy, undefined);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('send queue requires reviewed text outreach with a matching web-sales reason', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-queue-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'queue-test', '--region', '例市', '--industry', 'サロン']);
    markLegacyRun(runDir);
    const input = path.join(temp, 'input.jsonl');
    const reason = { fact: 'スマートフォン表示で予約ボタンが画面幅の外に続く', source_url: 'https://example.com/', checked_at: '2026-09-26', why_web: '予約導線の表示を整えられる', proposal: 'スマートフォンの予約導線を整理する' };
    const relevantFact = { fact: reason.fact, fact_type: 'sales_relevant_web_fact', source_url: reason.source_url, checked_at: reason.checked_at, safe_for_outreach: true };
    const base = (id, name, channel, status, fact = relevantFact) => ({
      lead_id: id, identity: { name, region: '例市' }, lead: { status: 'candidate', priority: 'medium' },
      contacts: { channels: [channel] }, sales_reason_status: 'ready', sales_reason: reason,
      personalization: { status: 'ready', facts: [fact] },
      outreach: status ? { status, message: '突然のご連絡失礼いたします。\n\n予約導線を整理するご提案です。\n\nよろしくお願いいたします。', reviewed: status === 'reviewed', reason_version: 3 } : { status: 'pending' }
    });
    writeJsonl(input, [
      base('reviewed', 'レビュー済み店', sourced({ type: 'email', value: 'reviewed@example.com', official: true }), 'reviewed'),
      base('draft', '下書き店', sourced({ type: 'email', value: 'draft@example.com', official: true }), 'generated'),
      { ...base('phone', '電話のみ店', { type: 'phone', value: '06-1234-5678', official: true }, null), contacts: { channels: [{ type: 'phone', value: '06-1234-5678', official: true }], research_status: 'completed', research_checks: negativeChecks() } },
      base('profile', 'プロフィールだけ店', sourced({ type: 'email', value: 'profile@example.com', official: true }), 'reviewed', { fact: '駅から460m', fact_type: 'business_fact', source_url: 'https://example.com/', safe_for_outreach: true })
    ]);
    run(['import', '--run', runDir, '--input', input]);
    const summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.candidates.send_queue_ready, 1);
    const queue = fs.readFileSync(path.join(runDir, 'send-queue.md'), 'utf8');
    assert.match(queue, /レビュー済み店/);
    assert.match(queue, /送信先: reviewed@example.com/);
    assert.match(queue, /連絡先出典: https:\/\/example.com\/contact/);
    assert.match(queue, /連絡先確認日: 2026-09-27T00:00:00Z/);
    assert.match(queue, /営業理由出典: https:\/\/example.com\//);
    assert.match(queue, /営業理由確認日: 2026-09-26/);
    assert.match(queue, /送る直前に、営業理由を支える現在の情報/);
    assert.match(queue, /```text\n突然のご連絡失礼いたします。\n\n予約導線を整理するご提案です。\n\nよろしくお願いいたします。\n```/);
    assert.doesNotMatch(queue, /^    (突然のご連絡|予約導線|よろしくお願いいたします)/m);
    assert.doesNotMatch(queue, /下書き店|電話のみ店|プロフィールだけ店/);
    assert.match(fs.readFileSync(path.join(runDir, 'phone-only-leads.md'), 'utf8'), /電話のみ店/);
    const validation = run(['validate', '--run', runDir], 1);
    assert.ok(validation.errors.some((error) => error.includes('profile: ready sales reason requires a matching sourced sales_relevant_web_fact')));
    assert.ok(validation.errors.every((error) => error.startsWith('profile:')));
    const correction = path.join(temp, 'correction.jsonl');
    writeJsonl(correction, [{ lead_id: 'profile', sales_reason_status: 'missing', sales_reason: null,
      personalization: { status: 'missing', facts: [] },
      outreach: { status: 'blocked_personalization', message: null, reviewed: false, reason_version: null },
      workflow: { stage: 'lead_ready', result: 'personalization_missing' } }]);
    run(['import', '--run', runDir, '--input', correction]);
    assert.equal(run(['summarize', '--run', runDir]).candidates.send_queue_ready, 1);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
    const scopeReview = path.join(temp, 'scope-review.jsonl');
    writeJsonl(scopeReview, [{ lead_id: 'reviewed', outreach: { status: 'generated', reviewed: false,
      review_note: '本部サイトの提案を店舗DMへ送ろうとしている。宛先を確認する。' },
      workflow: { stage: 'outreach_generated', result: 'in_progress' } }]);
    run(['import', '--run', runDir, '--input', scopeReview]);
    assert.equal(run(['summarize', '--run', runDir]).candidates.send_queue_ready, 0);
    const paused = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse)
      .find((record) => record.lead_id === 'reviewed');
    assert.equal(paused.qualification.status, 'pending');
    assert.match(paused.outreach.review_note, /宛先を確認/);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
    const resolved = path.join(temp, 'scope-resolved.jsonl');
    writeJsonl(resolved, [{ lead_id: 'reviewed', outreach: { status: 'reviewed', reviewed: true,
      review_note: null }, workflow: { stage: 'reviewed', result: 'completed' } }]);
    run(['import', '--run', runDir, '--input', resolved]);
    const resumed = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse)
      .find((record) => record.lead_id === 'reviewed');
    assert.equal(resumed.outreach.review_note, null);
    assert.equal(run(['summarize', '--run', runDir]).candidates.send_queue_ready, 1);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a phone on a pending contact search remains unverified until text channels are checked', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-contact-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'contact-test', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [
      { lead_id: 'pending-phone', identity: { name: '調査途中店' }, contacts: { channels: [{ type: 'phone', value: '06-1234-5678', official: true }], research_status: 'pending' } },
      { lead_id: 'claimed-phone', identity: { name: '完了自己申告店' }, contacts: { channels: [{ type: 'phone', value: '06-5555-5555', official: true }], research_status: 'completed' } },
      { lead_id: 'checked-phone', identity: { name: '調査済み店' }, contacts: { channels: [{ type: 'phone', value: '06-9999-9999', official: true }], research_status: 'completed', research_checks: negativeChecks() } }
    ]);
    run(['import', '--run', runDir, '--input', input]);
    const records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records.find((r) => r.lead_id === 'pending-phone').contactability, 'contact_unverified');
    assert.equal(records.find((r) => r.lead_id === 'claimed-phone').contactability, 'contact_unverified');
    assert.equal(records.find((r) => r.lead_id === 'checked-phone').contactability, 'phone_only');
    run(['summarize', '--run', runDir]);
    assert.match(fs.readFileSync(path.join(runDir, 'contact-research-needed.md'), 'utf8'), /調査途中店/);
    assert.doesNotMatch(fs.readFileSync(path.join(runDir, 'phone-only-leads.md'), 'utf8'), /調査途中店/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('one sourced official Instagram DM confirms text_ready without checking every channel', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-early-text-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'early-text', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [{ lead_id: 'dm', identity: { name: 'DM確認店' },
      contacts: { channels: [sourced({ type: 'instagram_dm', value: '@official_salon', official: true })] } }]);
    run(['import', '--run', runDir, '--input', input]);
    const record = JSON.parse(fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim());
    assert.equal(record.contactability, 'text_ready');
    assert.equal(record.contacts.research_status, 'completed');
    assert.equal(record.contacts.channels[0].value, 'https://www.instagram.com/official_salon/');
    assert.equal(record.contacts.research_checks.instagram_dm.status, 'found');
    assert.equal(record.contacts.research_checks.email.status, 'not_checked');
    assert.equal(record.contacts.research_checks.contact_form.status, 'not_checked');
    const summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.funnel.contact_checked, 1);
    assert.equal(summary.funnel.text_ready, 1);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('an official recruitment DM is not a general sales contact', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-purpose-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'purpose-test', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [{ lead_id: 'recruitment-dm', identity: { name: '採用DM店' },
      contacts: { channels: [sourced({ type: 'instagram_dm', value: '@recruit_salon',
        official: true, purpose: 'recruitment' })] } }]);
    run(['import', '--run', runDir, '--input', input]);
    const record = JSON.parse(fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim());
    assert.equal(record.lead.status, 'candidate');
    assert.equal(record.contactability, 'contact_unverified');
    assert.equal(record.contacts.research_checks.instagram_dm.status, 'not_checked');
    assert.equal(run(['summarize', '--run', runDir]).funnel.send_queue_ready, 0);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('negative contact decisions need all five sourced checks; inaccessible and partial remain unverified', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-negative-checks-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'negative-checks', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    const partial = negativeChecks();
    partial.official_line = { status: 'not_checked', value: null, source_url: null, checked_at: null, notes: null };
    const limited = negativeChecks();
    limited.instagram_dm = { status: 'inaccessible', value: null, source_url: 'https://www.instagram.com/', checked_at: CHECKED_AT, notes: 'アクセス制限' };
    const unsupported = negativeChecks();
    unsupported.email = { status: 'not_found', value: null, source_url: null, checked_at: CHECKED_AT, notes: '検索したとの自己申告のみ' };
    writeJsonl(input, [
      { lead_id: 'partial', identity: { name: '一部未確認店' }, contacts: { channels: [{ type: 'phone', value: '06-1111-1111', official: true }], research_status: 'completed', research_checks: partial } },
      { lead_id: 'limited', identity: { name: 'アクセス制限店' }, contacts: { channels: [], research_checks: limited } },
      { lead_id: 'none', identity: { name: '連絡先未発見店' }, contacts: { channels: [], research_checks: negativeChecks() } },
      { lead_id: 'unsupported', identity: { name: '根拠不足店' }, contacts: { channels: [{ type: 'phone', value: '06-2222-2222', official: true }], research_status: 'completed', research_checks: unsupported } }
    ]);
    run(['import', '--run', runDir, '--input', input]);
    const records = fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    const get = (id) => records.find((record) => record.lead_id === id);
    assert.equal(get('partial').contactability, 'contact_unverified');
    assert.equal(get('partial').contacts.research_status, 'in_progress');
    assert.equal(get('limited').contactability, 'contact_unverified');
    assert.equal(get('limited').contacts.research_status, 'access_limited');
    assert.equal(get('none').contactability, 'contact_not_found');
    assert.equal(get('none').contacts.research_status, 'completed');
    assert.equal(get('unsupported').contactability, 'contact_unverified');
    const summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.funnel.contact_checked, 1);
    assert.equal(summary.funnel.contact_unverified, 3);
    const validation = run(['validate', '--run', runDir], 1);
    assert.ok(validation.errors.some((error) => error.includes('unsupported: email check requires source_url and checked_at')));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('text destination without provenance cannot become text_ready or enter the queue', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-contact-provenance-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'contact-provenance', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    const reason = { fact: 'メニューと予約情報が媒体に分かれている', source_url: 'https://example.com/', checked_at: CHECKED_AT, why_web: '一つのサイトへ整理できる', proposal: '公式案内サイト' };
    writeJsonl(input, [{ lead_id: 'no-source', identity: { name: '出典なし店' },
      contacts: { channels: [{ type: 'contact_form', value: 'https://example.com/contact', official: true, purpose: 'general' }] },
      sales_reason_status: 'ready', sales_reason: reason,
      personalization: { status: 'ready', facts: [{ fact: reason.fact, fact_type: 'sales_relevant_web_fact', source_url: reason.source_url, checked_at: reason.checked_at, safe_for_outreach: true }] },
      outreach: { status: 'reviewed', reviewed: true, reason_version: 3, message: '公式サイトのご提案です。' } }]);
    run(['import', '--run', runDir, '--input', input]);
    const record = JSON.parse(fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim());
    assert.equal(record.contactability, 'contact_unverified');
    const summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.funnel.send_queue_ready, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(runDir, 'send-queue.md'), 'utf8'), /出典なし店/);
    assert.ok(run(['validate', '--run', runDir], 1).errors.some((error) => error.includes('verified text contact')));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('ineligible checked messages move to sent history without reentering the send queue', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-history-test-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'history-test', '--region', '例市', '--industry', 'サロン']);
    markLegacyRun(runDir);
    const input = path.join(temp, 'input.jsonl');
    const reason = { fact: 'スマートフォンで予約先が画面外にある', source_url: 'https://example.com/', checked_at: '2026-09-26', why_web: '予約導線を整えられる', proposal: 'スマートフォンの導線整理' };
    writeJsonl(input, [{
      lead_id: 'sent', identity: { name: '送信後に条件変更した店' }, lead: { status: 'candidate', priority: 'high' },
      contacts: { channels: [sourced({ type: 'email', value: 'sent@example.com', official: true })], research_status: 'completed' },
      sales_reason_status: 'ready', sales_reason: reason,
      personalization: { status: 'ready', facts: [{ fact: reason.fact, fact_type: 'sales_relevant_web_fact', source_url: reason.source_url, checked_at: reason.checked_at, safe_for_outreach: true }] },
      outreach: { status: 'reviewed', reviewed: true, reason_version: 3, message: '送信当時の営業文です。' }
    }]);
    run(['import', '--run', runDir, '--input', input]);
    run(['summarize', '--run', runDir]);
    const queuePath = path.join(runDir, 'send-queue.md');
    fs.writeFileSync(queuePath, fs.readFileSync(queuePath, 'utf8').replace('- [ ] 送信後に条件変更した店', '- [x] 送信後に条件変更した店'));
    run(['settle-queue', '--run', runDir, '--apply']);
    const correction = path.join(temp, 'correction.jsonl');
    writeJsonl(correction, [{ lead_id: 'sent', sales_reason_status: 'missing', sales_reason: null,
      personalization: { status: 'missing', facts: [] }, outreach: { status: 'blocked_personalization', message: null, reviewed: false, reason_version: null } }]);
    run(['import', '--run', runDir, '--input', correction]);
    run(['summarize', '--run', runDir]);
    assert.doesNotMatch(fs.readFileSync(queuePath, 'utf8'), /送信後に条件変更した店|送信当時の営業文/);
    const historyPath = path.join(runDir, 'sent-history.md');
    assert.match(fs.readFileSync(historyPath, 'utf8'), /- \[x\] 送信後に条件変更した店/);
    assert.match(fs.readFileSync(historyPath, 'utf8'), /送信当時の営業文です。/);
    run(['summarize', '--run', runDir]);
    assert.equal((fs.readFileSync(historyPath, 'utf8').match(/- \[x\] 送信後に条件変更した店/g) ?? []).length, 1);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('v4 qualification gates the queue and preserves unavailable and sent outcomes', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-v4-test-'));
  try {
    const runDir = path.join(temp, 'run');
    const manifest = run(['init', '--run', runDir, '--run-id', 'v4-test', '--region', '例市', '--industry', 'サロン']).manifest;
    assert.equal(manifest.qualification_rules_version, 1);
    const reason = { fact: '現行サイトでサービス情報が複数ページに分かれている', source_url: 'https://example.com/', checked_at: CHECKED_AT,
      why_web: 'サービス情報を一つの導線に整理できる', proposal: 'サービス紹介サイトの情報整理' };
    const evidence = { id: 'web-1', kind: 'web_gap', status: 'observed', observation: reason.fact,
      source_url: reason.source_url, checked_at: CHECKED_AT };
    const qualified = {
      lead_id: 'qualified', identity: { name: '提案対象店', industry: 'サロン', segment: '美容室' },
      website: { presence: 'confirmed', url: 'https://example.com/' },
      triage: { decision: 'advance', reason: '追加確認に進める', checked_at: CHECKED_AT },
      activity: { status: 'active', evidence_ids: ['web-1'] }, web_gap: { status: 'moderate', evidence_ids: ['web-1'] }, evidence: [evidence],
      qualification: { status: 'pursue', priority: 'P2', reason: '現在のサービス情報を整理する提案ができる',
        evidence_ids: ['web-1'], web_proposal: 'サービス紹介サイトを整理する', business_use: '比較時にサービス内容を確認できる', checked_at: CHECKED_AT },
      contacts: { channels: [sourced({ type: 'email', value: 'first@example.com', official: true }),
        sourced({ type: 'contact_form', value: 'https://example.com/contact', official: true, purpose: 'general' })] },
      sales_reason_status: 'ready', sales_reason: reason,
      personalization: { status: 'ready', facts: [{ fact: reason.fact, fact_type: 'sales_relevant_web_fact', source_url: reason.source_url, checked_at: CHECKED_AT, safe_for_outreach: true }] },
      outreach: { status: 'reviewed', reviewed: true, reason_version: 3, message: '提案対象店への文面です。' },
      workflow: { stage: 'reviewed', result: 'completed' }
    };
    const watch = { lead_id: 'watch', identity: { name: '再確認店', industry: 'サロン', segment: '美容室' },
      qualification: { status: 'watch', reason: '情報不足', next_action: '公式サイトを再確認', review_after: '2026-10-28' },
      contacts: { channels: [sourced({ type: 'email', value: 'watch@example.com', official: true })] },
      workflow: { stage: 'qualified', result: 'completed' } };
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [qualified, watch]);
    run(['import', '--run', runDir, '--input', input]);
    let summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.qualification.status.pursue, 1);
    assert.equal(summary.qualification.status.watch, 1);
    assert.equal(summary.funnel.send_queue_ready, 1);
    assert.equal(summary.segments['美容室'].qualified_investigated, 2);
    const queue = path.join(runDir, 'send-queue.md');
    assert.match(fs.readFileSync(queue, 'utf8'), /送信先: first@example.com/);
    assert.doesNotMatch(fs.readFileSync(queue, 'utf8'), /再確認店/);
    const beforeAction = fs.readFileSync(queue, 'utf8');
    fs.writeFileSync(queue, beforeAction.replace('- [ ] 提案対象店', '- [x] 提案対象店').replace('  - [ ] 送信不可', '  - [x] 送信不可'));
    run(['summarize', '--run', runDir], 1);
    assert.equal(fs.readFileSync(path.join(runDir, 'outreach-events.jsonl'), 'utf8'), '');
    fs.writeFileSync(queue, beforeAction);
    fs.writeFileSync(queue, fs.readFileSync(queue, 'utf8').replace('  - [ ] 送信不可\n  - 送信不可理由: ', '  - [x] 送信不可\n  - 送信不可理由: メールが不達'));
    run(['settle-queue', '--run', runDir, '--apply']);
    summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.funnel.unable, 1);
    assert.match(fs.readFileSync(path.join(runDir, 'unable-to-send.md'), 'utf8'), /メールが不達/);
    assert.match(fs.readFileSync(queue, 'utf8'), /送信先: https:\/\/example.com\/contact/);
    assert.doesNotMatch(fs.readFileSync(queue, 'utf8'), /送信先: first@example.com/);
    fs.writeFileSync(queue, fs.readFileSync(queue, 'utf8').replace('- [ ] 提案対象店', '- [x] 提案対象店'));
    run(['settle-queue', '--run', runDir, '--apply']);
    summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.funnel.sent, 1);
    assert.equal(summary.funnel.send_queue_ready, 0);
    assert.match(fs.readFileSync(path.join(runDir, 'sent-history.md'), 'utf8'), /提案対象店/);
    assert.doesNotMatch(fs.readFileSync(queue, 'utf8'), /提案対象店/);
    run(['record-outcome', '--run', runDir, '--lead-id', 'qualified', '--result', 'reply']);
    summary = run(['summarize', '--run', runDir]);
    assert.equal(summary.funnel.reply, 1);
    assert.equal(fs.readFileSync(path.join(runDir, 'outreach-events.jsonl'), 'utf8').trim().split(/\r?\n/).length, 3);
    assert.equal(run(['validate', '--run', runDir]).valid, true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('v4 pursue requires sourced evidence and watch needs a next action', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-v4-validation-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'v4-validation', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [
      { lead_id: 'unsupported', identity: { name: '根拠なし店' }, qualification: { status: 'pursue', priority: 'P1', reason: '予算がありそう', web_proposal: 'サイト制作', business_use: '売上向上', checked_at: CHECKED_AT } },
      { lead_id: 'graveyard', identity: { name: '保留店' }, qualification: { status: 'watch', reason: '不明' } }
    ]);
    run(['import', '--run', runDir, '--input', input]);
    const result = run(['validate', '--run', runDir], 1);
    assert.ok(result.errors.some((error) => error.includes('pursue requires observed sourced evidence')));
    assert.ok(result.errors.some((error) => error.includes('watch requires reason, next_action, and review_after')));
    assert.equal(run(['summarize', '--run', runDir]).funnel.send_queue_ready, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('plan-drafts selects only unsent, qualified, contactable leads without an existing message', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-draft-plan-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'draft-plan', '--region', '例市', '--industry', 'サロン']);
    const make = (id, priority = 'P2', contact = true) => ({
      lead_id: id, identity: { name: `${id}店`, region: '例市', address: `${id}番地` },
      lead: { status: 'candidate' }, triage: { decision: 'advance', reason: '確認済み', checked_at: CHECKED_AT },
      evidence: [{ id: `${id}-evidence`, kind: 'web_gap', status: 'observed', observation: '限定した導線に改善余地',
        source_url: `https://example.com/${id}`, checked_at: CHECKED_AT }],
      qualification: { status: 'pursue', priority, reason: '顧客の選択に関わる導線',
        evidence_ids: [`${id}-evidence`], web_proposal: '既存サイト内の限定した導線改善',
        business_use: 'サービスを選びやすくする', rules_version: 1, checked_at: CHECKED_AT },
      contacts: { channels: contact ? [sourced({ type: 'email', value: `${id}@example.com`, official: true })] : [] }
    });
    const readyHigh = make('ready-high', 'P1');
    const readyLow = make('ready-low', 'P3');
    const alreadyDrafted = make('already-drafted');
    alreadyDrafted.outreach = { status: 'generated', reviewed: false, message: '既存の下書き' };
    const watch = make('watch');
    watch.qualification = { status: 'watch', reason: '確認待ち', next_action: '導線を確認', review_after: '2026-10-30', rules_version: 1 };
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [readyHigh, readyLow, alreadyDrafted, watch, make('no-contact', 'P1', false),
      make('already-sent'), make('skipped'), make('blocked-channel')]);
    run(['import', '--run', runDir, '--input', input]);
    run(['record-outcome', '--run', runDir, '--lead-id', 'already-sent', '--result', 'previously_sent',
      '--reason', '過去の送信記録で確認']);
    run(['record-outcome', '--run', runDir, '--lead-id', 'skipped', '--result', 'lead_skip', '--reason', '営業見送り']);
    run(['record-outcome', '--run', runDir, '--lead-id', 'blocked-channel', '--result', 'unable',
      '--channel', 'email', '--destination', 'blocked-channel@example.com', '--reason', '不達']);
    const file = path.join(runDir, 'businesses.jsonl');
    const before = fs.readFileSync(file, 'utf8');
    const plan = run(['plan-drafts', '--run', runDir, '--limit', '1']);
    assert.equal(plan.eligible_total, 2);
    assert.deepEqual(plan.selected.map((item) => item.lead_id), ['ready-high']);
    assert.equal(plan.held_counts.message_exists, 1);
    assert.equal(plan.held_counts.not_qualified, 1);
    assert.equal(plan.held_counts.no_text_contact, 1);
    assert.equal(plan.held_counts.already_sent, 1);
    assert.equal(plan.held_counts.lead_skipped, 1);
    assert.equal(plan.held_counts.no_usable_channel, 1);
    assert.deepEqual(run(['plan-drafts', '--run', runDir, '--limit', '2']).selected.map((item) => item.lead_id),
      ['ready-high', 'ready-low']);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
    run(['plan-drafts', '--run', runDir, '--limit', '0'], 1);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('duplicate merge refuses to orphan an outreach outcome', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-outcome-merge-'));
  try {
    const runDir = path.join(temp, 'run');
    run(['init', '--run', runDir, '--run-id', 'outcome-merge', '--region', '例市', '--industry', 'サロン']);
    const input = path.join(temp, 'input.jsonl');
    writeJsonl(input, [
      { lead_id: 'primary', identity: { name: '同一店', address: '例市1' } },
      { lead_id: 'duplicate', identity: { name: '同じ店', address: '例市2' },
        contacts: { channels: [sourced({ type: 'phone', value: '09000000000', official: true })] } }
    ]);
    run(['import', '--run', runDir, '--input', input]);
    run(['record-outcome', '--run', runDir, '--lead-id', 'duplicate', '--result', 'unable',
      '--channel', 'phone', '--destination', '09000000000', '--reason', '通話不可']);
    const decisions = path.join(temp, 'decisions.jsonl');
    writeJsonl(decisions, [{ primary_lead_id: 'primary', duplicate_lead_ids: ['duplicate'], reason: '同一事業者を確認' }]);
    run(['merge-duplicates', '--run', runDir, '--input', decisions], 1);
    assert.equal(fs.readFileSync(path.join(runDir, 'businesses.jsonl'), 'utf8').trim().split(/\r?\n/).length, 2);
    assert.equal(fs.readFileSync(path.join(runDir, 'outreach-events.jsonl'), 'utf8').trim().split(/\r?\n/).length, 1);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}
