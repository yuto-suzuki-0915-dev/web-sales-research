import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCRIPT = path.join(ROOT, 'scripts', 'web-sales-store.mjs');
const CHECKED_AT = '2026-09-29T00:00:00Z';

function command(args, expected = 0) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  assert.equal(result.status, expected, `stderr: ${result.stderr}\nstdout: ${result.stdout}`);
  return expected ? result.stderr : JSON.parse(result.stdout);
}

function fixture(t, names) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-settle-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const runDir = path.join(root, 'run');
  command(['init', '--run', runDir, '--run-id', 'settle-test', '--region', '例市', '--industry', 'サロン']);
  const records = names.map((name) => {
    const fact = `${name}のサイトに予約導線の事実がある`;
    const source = 'https://example.com/';
    return {
      lead_id: name, identity: { name, industry: 'サロン' },
      lead: { status: 'candidate', priority: 'medium' },
      contacts: { channels: [
        { type: 'email', value: `${name}@example.com`, official: true, source_url: source, checked_at: CHECKED_AT },
        { type: 'contact_form', value: `https://example.com/${name}/contact`, official: true,
          source_url: source, checked_at: CHECKED_AT, purpose: 'general' }
      ] },
      sales_reason_status: 'ready',
      sales_reason: { fact, source_url: source, checked_at: CHECKED_AT, why_web: '予約先を探しやすくできる', proposal: '案内ページ' },
      personalization: { status: 'ready', facts: [{ fact, fact_type: 'sales_relevant_web_fact', source_url: source,
        checked_at: CHECKED_AT, safe_for_outreach: true }] },
      outreach: { status: 'reviewed', reviewed: true, reason_version: 3, message: `${name}への文面です。` }
    };
  });
  fs.writeFileSync(path.join(runDir, 'businesses.jsonl'), records.map((record) => JSON.stringify(record)).join('\n') + '\n');
  const manifestPath = path.join(runDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.schema_version = 3;
  delete manifest.qualification_rules_version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return runDir;
}

function row(name, { sent = false, unable = false, skip = false, reason = '', skipReason = '' } = {}) {
  const fence = String.fromCharCode(96).repeat(3);
  return `- [${sent ? 'x' : ' '}] ${name}
  - lead_id: ${name}
  - 送信チャネル: email
  - 送信先: ${name}@example.com
  - [${unable ? 'x' : ' '}] 送信不可
  - 送信不可理由: ${reason}
  - [${skip ? 'x' : ' '}] 営業見送り
  - 見送り理由: ${skipReason}
  - 送信日時: 
  - 営業文（コピー用）:

${fence}text
${name}への文面です。
${fence}`;
}

test('settle-queue previews, archives three distinct results, preserves pending, and is idempotent', (t) => {
  const runDir = fixture(t, ['sent', 'unable', 'skip', 'pending']);
  const queuePath = path.join(runDir, 'send-queue.md');
  const queue = '# 文章営業 送信キュー\n\n' + [
    row('sent', { sent: true }),
    row('unable', { unable: true, reason: 'DM画面に進めない\n    公式窓口が閉鎖されている' }),
    row('skip', { skip: true, skipReason: '営業・勧誘を断る明記がある' }),
    row('pending')
  ].join('\n\n') + '\n';
  fs.writeFileSync(queuePath, queue);
  const preview = command(['settle-queue', '--run', runDir]);
  assert.deepEqual([preview.checked_sent, preview.checked_unable, preview.checked_lead_skip], [1, 1, 1]);
  assert.deepEqual(preview.actions.map((action) => action.lead_id), ['sent', 'unable', 'skip']);
  assert.equal(preview.mode, 'preview');
  assert.equal(fs.readFileSync(queuePath, 'utf8'), queue);
  assert.match(command(['summarize', '--run', runDir], 1), /先に settle-queue/);
  assert.equal(fs.readFileSync(queuePath, 'utf8'), queue);
  const applied = command(['settle-queue', '--run', runDir, '--apply']);
  assert.deepEqual([applied.newly_recorded_sent, applied.newly_recorded_unable, applied.newly_recorded_lead_skip], [1, 1, 1]);
  const after = fs.readFileSync(queuePath, 'utf8');
  assert.match(after, /- \[ \] pending/);
  assert.doesNotMatch(after, /lead_id: (sent|unable|skip)\b/);
  assert.match(fs.readFileSync(path.join(runDir, 'sent-history.md'), 'utf8'), /- \[x\] sent/);
  assert.match(fs.readFileSync(path.join(runDir, 'unable-to-send.md'), 'utf8'), /公式窓口が閉鎖されている/);
  assert.match(fs.readFileSync(path.join(runDir, 'skipped-leads.md'), 'utf8'), /営業・勧誘を断る明記がある/);
  const eventsPath = path.join(runDir, 'outreach-events.jsonl');
  const events = fs.readFileSync(eventsPath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map((event) => event.result), ['sent', 'unable', 'lead_skip']);
  assert.match(events[1].reason, /DM画面に進めない\n公式窓口が閉鎖されている/);
  assert.equal(events[0].occurred_at, null);
  command(['settle-queue', '--run', runDir, '--apply']);
  assert.equal(fs.readFileSync(eventsPath, 'utf8').trim().split('\n').length, 3);
});

test('settle-queue rejects malformed and double-checked rows without writing anything', (t) => {
  const runDir = fixture(t, ['bad']);
  const queuePath = path.join(runDir, 'send-queue.md');
  const eventsPath = path.join(runDir, 'outreach-events.jsonl');
  const bad = row('bad', { sent: true }).replace('- [x] bad', '- [] bad');
  fs.writeFileSync(queuePath, bad);
  assert.match(command(['settle-queue', '--run', runDir, '--apply'], 1), /send-queue\.md:1/);
  assert.equal(fs.readFileSync(eventsPath, 'utf8'), '');
  const double = row('bad', { sent: true, unable: true, reason: '不可' });
  fs.writeFileSync(queuePath, double);
  assert.match(command(['settle-queue', '--run', runDir, '--apply'], 1), /二重チェック/);
  assert.equal(fs.readFileSync(queuePath, 'utf8'), double);
  assert.equal(fs.readFileSync(eventsPath, 'utf8'), '');
});

test('preflight rejects missing reasons, duplicate IDs, and invalid send dates', (t) => {
  const runDir = fixture(t, ['bad']);
  const queuePath = path.join(runDir, 'send-queue.md');
  const eventsPath = path.join(runDir, 'outreach-events.jsonl');
  fs.writeFileSync(queuePath, row('bad', { unable: true }));
  assert.match(command(['settle-queue', '--run', runDir, '--apply'], 1), /送信不可理由が空/);
  fs.writeFileSync(queuePath, `${row('bad')}\n\n${row('bad')}`);
  assert.match(command(['settle-queue', '--run', runDir, '--apply'], 1), /重複/);
  fs.writeFileSync(queuePath, row('bad', { sent: true }).replace('送信日時: ', '送信日時: 昨日'));
  assert.match(command(['settle-queue', '--run', runDir, '--apply'], 1), /ISO日時/);
  assert.equal(fs.readFileSync(eventsPath, 'utf8'), '');
});

test('a known actual send time is stored and counted separately from checkbox time', (t) => {
  const runDir = fixture(t, ['timed']);
  const queuePath = path.join(runDir, 'send-queue.md');
  const timestamp = new Date().toISOString();
  fs.writeFileSync(queuePath, row('timed', { sent: true }).replace('送信日時: ', `送信日時: ${timestamp}`));
  const report = command(['settle-queue', '--run', runDir, '--apply']);
  assert.equal(report.sent_today_confirmed, 1);
  assert.equal(report.sent_without_actual_date, 0);
  const event = JSON.parse(fs.readFileSync(path.join(runDir, 'outreach-events.jsonl'), 'utf8'));
  assert.equal(event.occurred_at, timestamp);
});

test('previously sent is recorded without inventing a send date or blocking a contact as unavailable', (t) => {
  const runDir = fixture(t, ['known-before']);
  command(['summarize', '--run', runDir]);
  assert.match(fs.readFileSync(path.join(runDir, 'send-queue.md'), 'utf8'), /lead_id: known-before/);
  const recorded = command(['record-outcome', '--run', runDir, '--lead-id', 'known-before',
    '--result', 'previously_sent', '--reason', '手元の送信履歴で確認']);
  assert.equal(recorded.funnel.previously_sent, 1);
  assert.equal(recorded.funnel.sent_today_confirmed, 0);
  assert.doesNotMatch(fs.readFileSync(path.join(runDir, 'send-queue.md'), 'utf8'), /lead_id: known-before/);
  assert.match(fs.readFileSync(path.join(runDir, 'sent-history.md'), 'utf8'), /過去の送信を確認/);
  const event = JSON.parse(fs.readFileSync(path.join(runDir, 'outreach-events.jsonl'), 'utf8'));
  assert.equal(event.result, 'previously_sent');
  assert.equal(event.occurred_at, null);
  assert.equal(event.reason, '手元の送信履歴で確認');
  const again = command(['record-outcome', '--run', runDir, '--lead-id', 'known-before',
    '--result', 'previously_sent', '--reason', '同じ履歴']);
  assert.equal(again.already_recorded, true);
  assert.equal(fs.readFileSync(path.join(runDir, 'outreach-events.jsonl'), 'utf8').trim().split('\n').length, 1);
});

test('legacy rows without a skip field still settle as channel-only unavailable', (t) => {
  const runDir = fixture(t, ['legacy']);
  const queuePath = path.join(runDir, 'send-queue.md');
  fs.writeFileSync(queuePath, row('legacy', { unable: true, reason: '窓口が使用不可' })
    .replace('  - [ ] 営業見送り\n  - 見送り理由: \n  - 送信日時: \n', ''));
  assert.match(command(['settle-queue', '--run', runDir, '--apply'], 1), /--allow-legacy-unable/);
  const report = command(['settle-queue', '--run', runDir, '--apply', '--allow-legacy-unable']);
  assert.equal(report.newly_recorded_unable, 1);
  assert.equal(report.newly_recorded_lead_skip, 0);
  assert.match(report.warnings[0], /窓口単位/);
});

test('lead_skip prevents another-channel requeue; lead_reopen reverses it', (t) => {
  const runDir = fixture(t, ['target']);
  command(['summarize', '--run', runDir]);
  const queuePath = path.join(runDir, 'send-queue.md');
  let queue = fs.readFileSync(queuePath, 'utf8');
  assert.match(queue, /送信先: target@example.com/);
  queue = queue.replace('  - [ ] 営業見送り', '  - [x] 営業見送り')
    .replace('  - 見送り理由: ', '  - 見送り理由: 営業お断り');
  fs.writeFileSync(queuePath, queue);
  command(['settle-queue', '--run', runDir, '--apply']);
  command(['summarize', '--run', runDir]);
  assert.doesNotMatch(fs.readFileSync(queuePath, 'utf8'), /lead_id: target/);
  command(['record-outcome', '--run', runDir, '--lead-id', 'target', '--result', 'lead_reopen']);
  assert.match(fs.readFileSync(queuePath, 'utf8'), /lead_id: target/);
  command(['record-outcome', '--run', runDir, '--lead-id', 'target', '--result', 'lead_skip',
    '--reason', '再検討後も見送り']);
  const history = fs.readFileSync(path.join(runDir, 'skipped-leads.md'), 'utf8');
  assert.match(history, /営業お断り/);
  assert.match(history, /再検討後も見送り/);
  assert.equal((history.match(/event_id:/g) ?? []).length, 2);
  assert.doesNotMatch(fs.readFileSync(queuePath, 'utf8'), /lead_id: target/);
});

test('unavailable is channel-only and alternative appears only on full regeneration', (t) => {
  const runDir = fixture(t, ['target']);
  command(['summarize', '--run', runDir]);
  const queuePath = path.join(runDir, 'send-queue.md');
  let queue = fs.readFileSync(queuePath, 'utf8');
  queue = queue.replace('  - [ ] 送信不可', '  - [x] 送信不可')
    .replace('  - 送信不可理由: ', '  - 送信不可理由: メールが不達');
  fs.writeFileSync(queuePath, queue);
  command(['settle-queue', '--run', runDir, '--apply']);
  assert.doesNotMatch(fs.readFileSync(queuePath, 'utf8'), /lead_id: target/);
  command(['summarize', '--run', runDir]);
  assert.match(fs.readFileSync(queuePath, 'utf8'), /送信先: https:\/\/example\.com\/target\/contact/);
  assert.doesNotMatch(fs.readFileSync(queuePath, 'utf8'), /送信先: target@example.com/);
});
