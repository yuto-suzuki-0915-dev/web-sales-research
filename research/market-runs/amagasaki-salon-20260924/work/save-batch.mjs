// usage: node save-batch.mjs <prefix>   (stdin = worker JSONL). prefix e.g. v3-contact
import fs from 'node:fs';
const prefix = process.argv[2];
const text = fs.readFileSync(0, 'utf8');
const rows = text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
const ids = new Set(rows.map((r) => r.lead_id));
const files = fs.readdirSync('.').filter((f) => f.startsWith(prefix + '-in-') && f.endsWith('.json'));
let best = null, bestHit = 0;
for (const f of files) {
  const inp = JSON.parse(fs.readFileSync(f, 'utf8')).map((x) => x.lead_id);
  const hit = inp.filter((i) => ids.has(i)).length;
  if (hit > bestHit) { best = { f, inp }; bestHit = hit; }
}
if (!best) { console.log('NO MATCH'); process.exit(1); }
const n = best.f.match(/-in-(\d+)/)[1];
const missing = best.inp.filter((i) => !ids.has(i));
const extra = [...ids].filter((i) => !best.inp.includes(i));
fs.writeFileSync(`${prefix}-out-${n}.jsonl`, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`batch ${n}: saved ${rows.length}; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
