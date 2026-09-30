# v4 worker返却契約

workerはファイルを書かず、親が既存`lead_id`へ`import`できるJSONLを返す。元ページ全文、検索結果全文、思考過程は返さない。DISCOVER用の返却と旧v3の連絡先・営業文のフィールド形状は旧`worker-handoff.md`を継承する。

## TRIAGE

```json
{"lead_id":"lead-id","activity":{"status":"uncertain","evidence_ids":[]},"web_gap":{"status":"unknown","evidence_ids":[]},"triage":{"decision":"advance","reason":"追加確認で営業判断が変わり得る","checked_at":"2026-09-28T00:00:00Z"},"evidence":[],"website":{"presence":"unconfirmed","url":null},"visual":{"status":"unverified"},"lead":{"status":"candidate"},"workflow":{"stage":"triaged","result":"in_progress"}}
```

既存の`lead.status`はhard exclusion/重要な矛盾だけを扱う。`qualification.status`はこのworkerで確定しない。見つかった文章窓口は保存してよいが、全チャネル調査はしない。

## QUALIFY

```json
{"lead_id":"lead-id","evidence":[{"id":"web-1","kind":"web_gap","status":"observed","observation":"公式のスタイル事例から担当者プロフィールと店舗別予約先へ辿るリンクがない（確認範囲: 事例詳細・担当者・予約ページ）","source_url":"https://example.com/styles","checked_at":"2026-09-28T00:00:00Z"}],"qualification":{"status":"pursue","priority":"P2","reason":"気になった事例から担当者と予約先を選ぶ判断を支える接続を提案できる","evidence_ids":["web-1"],"web_proposal":"既存サイトの事例から担当者・店舗別予約先へつなぐ導線","business_use":"初めて訪れる人が気に入った事例の担当者を確認して予約先を選べる","rules_version":1,"checked_at":"2026-09-28T00:00:00Z"},"workflow":{"stage":"qualified","result":"in_progress"}}
```

`watch`なら理由・`next_action`・`review_after`を返す。`drop`なら明確な理由を返す。`not_observed`には確認元URL、日時、確認範囲`scope`を付ける。求人等の不在を未検索のまま`false`にしない。商業シグナルを予算と読み替えない。P1/P2/P3は説明可能な営業順で、機械的な合計点ではない。
既存機能による反証と、提案するサイト・SNS等が店舗、本部、個人のどの管理範囲かを`evidence[]`と`qualification.reason`で追えるようにする。管理主体が未確認の場合は推測で埋めず、OUTREACHで送信先の用途と照合する。新しい必須フィールドは設けず、現行のEvidence契約を使う。
上の架空例でも、実際には事例・担当者・予約ページの関係を出典で確認し、すでに機能があるなら`pursue`理由にはしない。`pursue`へ進めるのは保存済み`triage.decision=advance`のレコードだけ。未完了のTRIAGEを資格判定で飛び越えない。

## OUTREACH / REVIEW

旧`worker-handoff.md`の`contacts`、`sales_reason`、`personalization`、`outreach`の形を使う。ただしv4では`qualification.status=pursue`が前提。親はEvidenceのID・出典から営業理由へ追跡できるかを確認してから取り込む。営業文に使う事実がBundleに足りなければ必要な出典だけ再確認し、Evidenceへ追加する。`contactability=text_ready`、営業理由`ready`、文面`reviewed`を満たすまでは送信キューに載せない。

REVIEWで明示的な営業・勧誘禁止が見つかった場合は、旧Review返却契約の文面撤回に加え、`lead.status=excluded`と出典付き除外理由を返す。v4の`pursue`根拠も失われた場合は`qualification.status=drop`、理由、`priority=null`、`web_proposal=null`、`business_use=null`を同時に返し、矛盾した`pursue`を残さない。既存機能との重複だけで理由が失われた場合も同様に資格判定の再評価を親へ通知し、文面だけ言い換えて通さない。
提案余地は残るが使用予定の窓口が対象と違う場合は、資格判定を維持し、`outreach.status=generated`、`reviewed=false`、`review_note`に不一致の対象と確認事項を記録して親へ返す。`workflow.stage=outreach_generated`とし、送信キューへ進めない。適切な窓口が確認できてから文面をレビューし直す。`review_note`は診断メモであり、送信結果イベントではない。
