#!/bin/bash
cd /c/Users/suzuy/web-sales-research
while IFS=$'\t' read -r id url; do
  echo "$id $url"
done < research/market-runs/nishinomiya-eikaiwa-juku-20260930/work/capture-list2.tsv | xargs -P 4 -L1 bash -c 'node scripts/capture-site.mjs --url "$1" --out-dir research/market-runs/nishinomiya-eikaiwa-juku-20260930/evidence/visual/$0 --id $0 > research/market-runs/nishinomiya-eikaiwa-juku-20260930/work/capture-$0.log 2>&1'
echo done > research/market-runs/nishinomiya-eikaiwa-juku-20260930/work/capture2-done.flag
