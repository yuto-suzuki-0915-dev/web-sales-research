// 追加探索workerの返却を、コンパクトなTSV(9列, 区切り "|")からimport用JSONLへ変換する作業用スクリプト
// 列: name|aliases(;)|address|industry|status(a=active,u=unknown)|site|source_urls(;)|evidence|channels(type=value;...)
import fs from 'node:fs';

const TYPES = { phone: 'phone', line: 'official_line', ig: 'instagram_dm', form: 'contact_form', email: 'email' };

export function gen(routeId, tsvFile, outFile) {
  const rows = fs.readFileSync(tsvFile, 'utf8').trim().split('\n').map((l) => l.split('|'));
  const out = rows.map((c) => {
    if (c.length !== 9) throw new Error(`bad column count ${c.length}: ${c[0]}`);
    const [name, alias, address, industry, st, site, srcs, evidence, channels] = c;
    const srcList = srcs.split(';').filter(Boolean);
    return JSON.stringify({
      identity: { name, aliases: alias ? alias.split(';') : [], region: '尼崎市', address, industry, business_status: st === 'a' ? 'active' : 'unknown' },
      discovery_sources: srcList.map((url) => ({ route_id: routeId, url, source_type: 'additional', checked_at: '2026-09-27T00:00:00+09:00' })),
      website: { presence: site ? 'confirmed' : 'unconfirmed', url: site || null, evidence: [evidence] },
      contacts: {
        channels: channels ? channels.split(';').map((x) => {
          const i = x.indexOf('=');
          const t = TYPES[x.slice(0, i)];
          if (!t) throw new Error(`bad channel type: ${x}`);
          return { type: t, value: x.slice(i + 1), official: false, sales_prohibited: false, source_url: srcList[0] };
        }) : [],
        text_outreach_available: false
      }
    });
  });
  fs.writeFileSync(outFile, out.join('\n') + '\n');
  console.log(routeId, out.length);
}

if (process.argv[2]) gen(process.argv[2], process.argv[3], process.argv[4]);
