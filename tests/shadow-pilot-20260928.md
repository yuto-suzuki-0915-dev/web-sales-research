# 旧美容室runの読み取り専用シャドー確認

対象: `research/market-runs/amagasaki-salon-20260924/businesses.jsonl`。2026-09-28時点の899件から、`workflow.stage`ごとに`lead_id`昇順で discovered 15、triaged 10、lead_ready 10、reviewed 10、outreach_generated 5 の計50件を抽出した。元ファイル、送信キュー、営業履歴は変更していない。これはv4実行ではなく、移行可能性の監査である。

| 観測項目 | 50件中 |
|---|---:|
| 旧`lead.status=candidate` | 49 |
| 公式サイト確認済み | 21 |
| PC・スマホの視覚確認済み | 9 |
| 出典・Web提案との接続を持つ旧営業理由 | 5 |
| 旧`contactability=text_ready` | 15 |
| v4の`evidence[]`を既に持つ | 0 |

旧candidateを新`pursue`へ自動昇格することはできない。特にv4 Evidenceが0件なので、50件についてSEND_NOW/WATCH/DROPに相当する新判定数を作らない。新SkillをClaudeで使う際は、元データを参照しつつ必要な範囲だけ追加確認し、別runまたは明示的な再評価手順で比較する。旧送信済み・送信不可履歴を引き継ぐ設計確認も必要。

この確認で判明したリスク: 旧`candidate`は非常に広く、旧`text_ready`だけでは新資格判定を意味しない。逆に、v4 Evidence不在を`drop`や`watch`の根拠にもしてはならない。
