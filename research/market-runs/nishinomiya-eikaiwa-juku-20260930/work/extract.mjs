import fs from 'node:fs';
const [,, taskFile, outFile] = process.argv;
const raw = fs.readFileSync(taskFile, 'utf8');
const found = new Map();
const scan = (text) => {
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{"lead_id"')) continue;
    try { const o = JSON.parse(t); found.set(o.lead_id, t); } catch {}
  }
};
const walk = (v) => {
  if (typeof v === 'string') scan(v);
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const l of raw.split(/\r?\n/)) { if (!l.trim()) continue; try { walk(JSON.parse(l)); } catch { scan(l); } }
fs.writeFileSync(outFile, [...found.values()].join('\n') + '\n');
console.log(found.size);
