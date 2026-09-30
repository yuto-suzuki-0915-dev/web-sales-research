import fs from 'node:fs';
import crypto from 'node:crypto';

// This module moves user decisions only. It never discovers leads or rebuilds a queue.
function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function parseQueue(raw) {
  const lines = raw.split(/\r?\n/);
  const starts = [];
  const errors = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced || !/^- \[/.test(line)) continue;
    const match = line.match(/^- \[([ xX])\] (.+)$/);
    if (!match) errors.push(`send-queue.md:${i + 1}: 店舗チェック欄の表記が不正です（例: - [ ] 店舗名）`);
    else starts.push({ index: i, checked: /[xX]/.test(match[1]), name: match[2].trim() });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const prefix = lines.slice(0, starts[0]?.index ?? lines.length).join('\n').trimEnd();
  const rows = starts.map((start, index) => {
    const end = starts[index + 1]?.index ?? lines.length;
    const blockLines = lines.slice(start.index, end);
    const block = blockLines.join('\n').trimEnd();
    const lineNumber = start.index + 1;
    const field = (name) => blockLines.find((line) => line.startsWith(`  - ${name}:`))?.slice(`  - ${name}:`.length).trim() ?? null;
    const id = field('lead_id');
    const channel = field('送信チャネル');
    const destination = field('送信先');
    const actionMarks = (label) => blockLines.filter((line) => new RegExp(`^  - \\[([ xX])\\] ${label}\\s*$`).test(line));
    const unableMarks = actionMarks('送信不可');
    const skipMarks = actionMarks('営業見送り');
    const malformedAction = blockLines.findIndex((line) => /^  - \[/.test(line) &&
      !/^  - \[[ xX]\] (送信不可|営業見送り)\s*$/.test(line));
    const markedUnable = unableMarks.some((line) => /\[[xX]\]/.test(line));
    const markedSkip = skipMarks.some((line) => /\[[xX]\]/.test(line));
    const reason = (name) => {
      const at = blockLines.findIndex((line) => line.startsWith(`  - ${name}:`));
      if (at < 0) return '';
      const first = blockLines[at].slice(`  - ${name}:`.length).trim();
      const continuation = [];
      for (let i = at + 1; i < blockLines.length; i += 1) {
        if (/^  - \S/.test(blockLines[i]) || /^```/.test(blockLines[i])) break;
        continuation.push(blockLines[i].trim());
      }
      return [first, ...continuation].join('\n').trim();
    };
    const message = block.match(/^```text\r?\n([\s\S]*?)\r?\n```/m)?.[1] ?? null;
    return { id, name: start.name, line: lineNumber, checked: start.checked,
      block, channel, destination, unableMarks, skipMarks, markedUnable, markedSkip,
      malformedActionLine: malformedAction < 0 ? null : lineNumber + malformedAction,
      unableReason: reason('送信不可理由'), skipReason: reason('見送り理由'),
      occurredAt: field('送信日時'), message };
  });
  return { prefix, rows };
}

function blocksByKey(raw, keyOf) {
  const result = new Set();
  for (const block of raw.split(/(?=^- \[[ xX]\] )/m)) {
    const id = block.match(/^  - lead_id:\s*(\S+)/m)?.[1];
    if (id) result.add(keyOf(block, id));
  }
  return result;
}

function key(row) {
  return `${row.id}|${row.channel}|${row.destination.toLowerCase()}`;
}

function appendBlocks(raw, blocks, heading) {
  if (!blocks.length) return raw;
  const base = raw.trimEnd() || heading;
  return `${base}\n\n${blocks.join('\n\n')}\n`;
}

function atomicReplace(file, content) {
  const temp = `${file}.tmp-${process.pid}-${crypto.randomUUID()}`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

function tokyoDate(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const item = (type) => parts.find((part) => part.type === type).value;
  return `${item('year')}-${item('month')}-${item('day')}`;
}

export function settleQueue({ files, records, apply = false, allowLegacyUnable = false,
  isOfficialContact = null }) {
  const original = {
    queue: read(files.sendQueue), events: read(files.outcomeEvents),
    sent: read(files.sentHistory), unable: read(files.unableHistory),
    skipped: read(files.skippedHistory)
  };
  const parsed = parseQueue(original.queue);
  const byId = new Map(records.map((record) => [record.lead_id, record]));
  const events = original.events.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const seenIds = new Set();
  const errors = [];
  const decisions = [];
  for (const row of parsed.rows) {
    const label = `send-queue.md:${row.line} (${row.name || row.id || 'ID不明'})`;
    if (!row.id || !byId.has(row.id)) errors.push(`${label}: lead_id が不明または未登録です`);
    if (row.id && seenIds.has(row.id)) errors.push(`${label}: lead_id がキュー内で重複しています`);
    seenIds.add(row.id);
    if (row.unableMarks.length !== 1) errors.push(`${label}: 送信不可チェック欄は1つ必要です`);
    if (row.skipMarks.length > 1) errors.push(`${label}: 営業見送りチェック欄が重複しています`);
    if (row.malformedActionLine) errors.push(`send-queue.md:${row.malformedActionLine}: 内側のチェック欄が不正です`);
    const checkedCount = Number(row.checked) + Number(row.markedUnable) + Number(row.markedSkip);
    if (checkedCount > 1) errors.push(`${label}: 結果が二重チェックされています`);
    if (!checkedCount) continue;
    if (!row.channel || !row.destination) errors.push(`${label}: 送信チャネル・送信先が必要です`);
    if (isOfficialContact && row.channel && row.destination && byId.has(row.id) &&
      !isOfficialContact(byId.get(row.id), row.channel, row.destination)) {
      errors.push(`${label}: 送信先が保存済みの公式連絡先と一致しません`);
    }
    if (row.markedUnable && !row.unableReason) errors.push(`${label}: 送信不可理由が空です`);
    if (row.markedSkip && !row.skipReason) errors.push(`${label}: 見送り理由が空です`);
    if (row.checked && row.occurredAt && Number.isNaN(Date.parse(row.occurredAt))) {
      errors.push(`${label}: 送信日時はISO日時で記入してください`);
    }
    const oldSent = events.some((event) => event.result === 'sent' && event.lead_id === row.id);
    const oldSkip = events.reduce((status, event) => event.lead_id === row.id &&
      ['lead_skip', 'lead_reopen'].includes(event.result) ? event.result === 'lead_skip' : status, false);
    if ((row.markedUnable || row.markedSkip) && oldSent) errors.push(`${label}: 送信済みの事業者を送信不可・見送りにはできません`);
    if (row.checked && oldSkip) errors.push(`${label}: 見送り済みの事業者を送信済みにするには再開記録が必要です`);
    decisions.push({ ...row, result: row.checked ? 'sent' : row.markedSkip ? 'lead_skip' : 'unable' });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const existingSent = new Set(events.filter((event) => event.result === 'sent').map((event) => event.lead_id));
  const existingUnable = new Set(events.filter((event) => event.result === 'unable')
    .map((event) => `${event.lead_id}|${event.channel}|${String(event.destination).toLowerCase()}`));
  const existingSkip = new Set();
  for (const event of events) {
    if (event.result === 'lead_skip') existingSkip.add(event.lead_id);
    if (event.result === 'lead_reopen') existingSkip.delete(event.lead_id);
  }
  const sentHistoryKeys = blocksByKey(original.sent, (_, id) => id);
  const unableHistoryKeys = blocksByKey(original.unable, (block, id) =>
    `${id}|${block.match(/^  - 送信チャネル:\s*(.+)$/m)?.[1]}|${String(block.match(/^  - 送信先:\s*(.+)$/m)?.[1]).toLowerCase()}`);
  const skippedHistoryEventIds = new Set([...original.skipped.matchAll(/^  - event_id:\s*(\S+)/gm)].map((match) => match[1]));
  const added = [];
  const sentBlocks = [];
  const unableBlocks = [];
  const skippedBlocks = [];
  const recordedAt = new Date().toISOString();
  for (const row of decisions) {
    const exists = row.result === 'sent' ? existingSent.has(row.id)
      : row.result === 'unable' ? existingUnable.has(key(row)) : existingSkip.has(row.id);
    const newEvent = !exists ? { event_id: crypto.randomUUID(), recorded_at: recordedAt,
      lead_id: row.id, result: row.result, channel: row.channel, destination: row.destination,
      reason: row.result === 'unable' ? row.unableReason : row.result === 'lead_skip' ? row.skipReason : null,
      occurred_at: row.result === 'sent' ? row.occurredAt || null : null,
      source: 'queue_checkbox', message_snapshot: row.message } : null;
    if (newEvent) added.push(newEvent);
    if (row.result === 'sent' && !sentHistoryKeys.has(row.id)) sentBlocks.push(row.block);
    if (row.result === 'unable' && !unableHistoryKeys.has(key(row))) unableBlocks.push(row.block);
    if (row.result === 'lead_skip') {
      const event = newEvent ?? [...events].reverse().find((item) => item.result === 'lead_skip' && item.lead_id === row.id);
      if (event && !skippedHistoryEventIds.has(event.event_id)) skippedBlocks.push(`${row.block}\n  - event_id: ${event.event_id}`);
    }
  }
  const decidedIds = new Set(decisions.map((row) => row.id));
  const remaining = parsed.rows.filter((row) => !decidedIds.has(row.id));
  const next = {
    events: original.events.trimEnd() + (added.length ? `${original.events.trim() ? '\n' : ''}${added.map((event) => JSON.stringify(event)).join('\n')}\n` : original.events ? '\n' : ''),
    sent: appendBlocks(original.sent, sentBlocks, '# 送信済み履歴（現行キュー対象外）'),
    unable: appendBlocks(original.unable, unableBlocks, '# 送信不可の履歴（窓口単位）'),
    skipped: appendBlocks(original.skipped, skippedBlocks, '# 営業見送りの履歴（事業者単位）'),
    queue: `${parsed.prefix}${remaining.length ? '\n\n' + remaining.map((row) => row.block).join('\n\n') : ''}\n`
  };
  const report = {
    actions: decisions.map((row) => ({ lead_id: row.id, name: row.name, result: row.result,
      channel: row.channel, destination: row.destination,
      reason: row.result === 'unable' ? row.unableReason : row.result === 'lead_skip' ? row.skipReason : null })),
    warnings: decisions.filter((row) => row.result === 'unable' && !row.skipMarks.length)
      .map((row) => `${row.name} (${row.id}): 旧形式の「送信不可」は窓口単位として記録されます。営業そのものの見送りなら、送信不可を外し「営業見送り」欄と理由を追加してから確定してください`),
    checked_sent: decisions.filter((row) => row.result === 'sent').length,
    checked_unable: decisions.filter((row) => row.result === 'unable').length,
    checked_lead_skip: decisions.filter((row) => row.result === 'lead_skip').length,
    pending: remaining.map((row) => ({ lead_id: row.id, name: row.name })),
    newly_recorded_sent: added.filter((event) => event.result === 'sent').length,
    newly_recorded_unable: added.filter((event) => event.result === 'unable').length,
    newly_recorded_lead_skip: added.filter((event) => event.result === 'lead_skip').length,
    sent_total: new Set([...sentHistoryKeys, ...[...events, ...added].filter((event) => event.result === 'sent').map((event) => event.lead_id)]).size,
    sent_without_actual_date: [...events, ...added].filter((event) => event.result === 'sent' && !event.occurred_at).length,
    sent_today_confirmed: [...events, ...added].filter((event) => event.result === 'sent' && event.occurred_at &&
      tokyoDate(event.occurred_at) === tokyoDate(recordedAt)).length,
    mode: apply ? 'applied' : 'preview'
  };
  if (apply && report.warnings.length && !allowLegacyUnable) {
    throw new Error(`旧形式の送信不可が${report.warnings.length}件あります。営業見送りならチェックを修正してください。窓口だけの不可と確認済みなら --allow-legacy-unable を指定してください`);
  }
  if (apply && decisions.length) {
    for (const [name, file] of Object.entries({ queue: files.sendQueue, events: files.outcomeEvents,
      sent: files.sentHistory, unable: files.unableHistory, skipped: files.skippedHistory })) {
      if (read(file) !== original[name]) throw new Error(`${file}: 確認後に変更されました。もう一度実行してください`);
    }
    // The queue is last: after an interrupted write, rerunning repairs missing views without duplicate events.
    for (const name of ['events', 'sent', 'unable', 'skipped', 'queue']) {
      const file = { events: files.outcomeEvents, sent: files.sentHistory, unable: files.unableHistory,
        skipped: files.skippedHistory, queue: files.sendQueue }[name];
      if (original[name] !== next[name]) atomicReplace(file, next[name]);
    }
  }
  return report;
}
