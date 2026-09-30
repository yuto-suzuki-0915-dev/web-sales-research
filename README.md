# Web Sales Research

地域と業種・Segmentを指定すると、事業者の発見、浅い一次判定、選んだ候補の追加調査、根拠付きの初回営業文まで進めるClaude Code用プロジェクトです。新規runはv4の4工程（DISCOVER / TRIAGE / QUALIFY / OUTREACH）を使用します。

## 使い方

```powershell
Set-Location 'C:\Users\suzuy\web-sales-research'
claude
```

```text
/web-sales 尼崎市のパーソナルジムを調べて、Web制作の営業候補と初回営業文を作って
```

既存runの続きは「run IDを指定し、新規探索はしない」と明記してください。既存v3 runの営業履歴やキューは、新しい選定基準へ自動変換しません。現行仕様は`SPEC-v4.md`、旧v3仕様は`SPEC.md`です。

件数を先に5社、10社へ固定せず、基本探索を終えた後に追加探索が3回連続で新規1件以下となるまでを探索飽和の目安にします。利用者指定上限または技術上限で終了した場合は、飽和とは区別して記録します。

## 出力

新規runは次に保存されます。

```text
research/market-runs/<run-id>/
  manifest.json
  businesses.jsonl
  search-paths.jsonl
  duplicates.jsonl
  market-summary.json
  summary.md
  prospects.csv
  outreach.md
  send-queue.md
  sent-history.md
  unable-to-send.md
  skipped-leads.md
  outreach-events.jsonl
  phone-only-leads.md
  contact-research-needed.md
  evidence/visual/
  work/
```

`summary.md`には次を表示します。

- 今回の探索で発見できた重複除去後の事業者数
- 公式サイト確認・未確認・なし確認済み
- リニューアル余地 大・中・小・判定不能
- candidate・excluded・recheck
- 新規v4 runでは`triage_pass`・`pursue/watch/drop`・営業順P1/P2/P3（旧v3 runでは高・中・低）
- 文章送信先確認済み・電話のみ・連絡先要確認
- 連絡先判定完了件数と、発見→候補→文章送信先→営業理由→レビュー→送信キューの営業ファネル
- Web制作の営業理由確認済み・確認待ち・不足
- 新基準の営業文生成済み・旧文面の保管件数
- 重複として統合した件数

Webサイト状態、営業判断、視覚確認、連絡手段、営業文生成は別フィールドです。たとえば次の状態を許可します。

```text
visual_status = unverified
lead_status = candidate

text_outreach_available = false
outreach.status = pending
```

## 安全な運用

- 営業文は生成・保存のみ。外部送信はしません。
- 検索で公式サイトを発見できない場合は「公式サイト未確認」とします。
- 公式サイト未確認の相手へ「公式サイトがないため」と書きません。
- 視覚確認は、原則として公式サイトのトップページをデスクトップとスマートフォンで確認し、スクリーンショット参照と観察内容を保存します。
- 単なる住所・営業時間・一般的なサービス等は個別化事実にしません。Web制作を提案する理由に直接つながる事実がなければ捏造せず、追加調査後に`sales_reason_status=missing`とします。
- 旧文面は履歴として保持しますが、新基準の理由と具体的な文章送信先を確認し、文面をレビューするまで送信キューに載せません。
- 文章窓口が1件確認できれば追加探索は不要です。見つからなかった場合だけ、5種類の文章窓口の探索証跡が揃うまで`phone_only`や`contact_not_found`にしません。
- 送信キューには使用する窓口の種類、実際の送信先、出典URL、確認日時を表示します。
- 新規v4 runでは`pursue`かつ文章窓口・営業理由・レビュー済み文面が揃った候補だけを送信キューに載せます。`watch`は理由・次の確認事項・再確認日を持ち、無期限の保留にしません。
- 文面作成前に`node scripts/web-sales-store.mjs plan-drafts --run <DIR> [--limit N]`で今回の対象IDを読み取り専用で選びます。既定は優先順10件です。送信済み、見送り、使える文章窓口なし、既存文面ありの候補は新しい文面を作らず、理由別の件数として返します。
- 店舗行のチェックは送信済み、内側の「送信不可」はその窓口だけ使えない記録、「営業見送り」はその事業者に別窓口からも営業しない判断です。各理由を記入し、複数同時にはチェックしません。旧runの過去の「送信不可」は自動で見送りへ変換しません。
- チェックを履歴へ移すだけなら`node scripts/web-sales-store.mjs settle-queue --run <DIR>`で事前確認し、問題なければ`--apply`を付けて確定します。未チェックは残り、市場調査・候補再選定・キュー補充・summary再生成はしません。チェック欄の表記揺れ、理由空欄、二重チェックなどは書き込み前に停止します。
- 旧形式のキューにある「送信不可」は意味が曖昧なため、`--apply`で一旦停止します。窓口だけの不可と確認できた場合のみ`--allow-legacy-unable`を追加します。営業自体の見送りなら旧行に「営業見送り」欄と理由を追加し、チェックをそちらへ移します。
- `summarize`は引き続き市場成果物とキューを再生成しますが、未仕分けのチェックがあれば上書きせず停止します。窓口単位の「送信不可」の後は、別の確認済み窓口があればその窓口を提示します。事業者単位の「営業見送り」は再投入しません。実送信日時が分かる場合はキューの`送信日時`にISO日時を記入できます。空欄なら当日の実送信件数には算入しません。
- 送信結果は`record-outcome`でも記録できます。`unable`は実際に送信先を使えなかった場合だけの窓口単位、`lead_skip`は事業者単位、`lead_reopen`は見送り解除です。過去に送信したことが後から分かった場合は`previously_sent`と確認根拠を記録し、再送を止めます。文面の差し戻しは送信不可として記録せず、レビュー状態へ戻します。実際の送信日時が不明なら記録日時だけを保存し、送信日時を捏造しません。
- Skillの変更・テストだけでは、既存の市場調査runや営業リストを再生成しません。再調査はClaudeでSkillを実行する際に別途行います。
- `.claude/settings.json`は、run保存、2本のローカル補助スクリプト、5つの定義済みAgent、WebSearch/WebFetchだけを事前許可します。権限全体のbypassは使用しません。初回はClaude Codeのworkspace trust画面で内容を確認してください。

## 旧版との関係

旧版のSkill、Agent、schemaは `archive/legacy-v1/` に保存されています。過去の `research/leads/` と `research/runs/` は変更していません。v2は旧leadを照合には使いますが、旧版の判定やゲートを新しい候補判定へ引き継ぎません。

新規v4 runの詳細は`SPEC-v4.md`と`schemas/*-v4.md`、旧v3 runの詳細は`SPEC.md`と旧schemaを参照してください。
