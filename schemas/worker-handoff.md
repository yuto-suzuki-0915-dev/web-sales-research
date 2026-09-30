# worker返却契約

workerはファイルを書かず、親が取り込めるJSONLを返す。思考過程、検索結果全文、ページ全文は返さない。

## Discovery worker

1行1事業者で、最低限次を返す。

```json
{"identity":{"name":"名称","aliases":[],"region":"地域","address":"住所","industry":"業種","business_status":"active"},"discovery_sources":[{"route_id":"web-01","url":"https://...","source_type":"web","checked_at":"ISO-8601"}],"website":{"presence":"unconfirmed","url":null,"evidence":[]},"contacts":{"channels":[],"text_outreach_available":false}}
```

営業適性を厳しく審査しない。検索結果だけで公式サイトなしと断定しない。

## Triage worker

既存lead_idを必ず含め、変更する軸だけ返せる。

```json
{"lead_id":"lead-id","website":{},"visual":{},"renewal":{},"lead":{},"contacts":{},"workflow":{"stage":"triaged","result":"in_progress"}}
```

観察は証拠参照へ戻れる形にする。迷った場合の既定はcandidate。視覚失敗、予算不明、外注意欲不明をrecheck理由にしない。

連絡先を調べた場合は、確認済み窓口を`contacts.channels[]`へ、5種類の文章窓口の確認状況を`contacts.research_checks`へ返す。例: `{"contacts":{"channels":[{"type":"instagram_dm","value":"https://www.instagram.com/example/","official":true,"sales_prohibited":false,"source_url":"https://example.com/","checked_at":"2026-09-27T00:00:00Z"}],"research_checks":{"instagram_dm":{"status":"found","value":"https://www.instagram.com/example/","source_url":"https://example.com/","checked_at":"2026-09-27T00:00:00Z","notes":"公式サイトからリンク"}}}}`。残り4種類は未確認のままでよい。見つからない場合だけ、5種類それぞれの`not_found`/`inaccessible`と確認元・日時を返す。`contactability`/`research_status`はコードで導出するので、自己申告の`completed`だけを返さない。

確実な重複を発見した場合は、重複側をexcludedにせず、別のduplicate decision JSONLとして`primary_lead_id`、`duplicate_lead_ids`、`reason`を返す。識別に確信がなければ統合判断を返さない。

## Outreach worker

```json
{"lead_id":"lead-id","sales_reason_status":"ready","sales_reason":{"fact":"...","source_url":"https://...","checked_at":"ISO-8601","why_web":"...","proposal":"..."},"personalization":{"status":"ready","facts":[{"fact":"...","fact_type":"sales_relevant_web_fact","source_url":"https://...","checked_at":"ISO-8601","safe_for_outreach":true}]},"outreach":{"status":"generated","message":"...","individualized_part":"...","reviewed":false,"reason_version":3},"workflow":{"stage":"outreach_generated","result":"in_progress"}}
```

`contactability=text_ready`でなければ通常文面を生成しない。使用するチャネルの`type`、`value`、`source_url`、`checked_at`を確認し、1件有効なら他チャネルの探索は不要。電話のみ・連絡先未確認の候補は維持する。事実が単なる店舗プロフィールや媒体・QRコードの存在で、Web制作の提案理由にならなければ不採用。追加調査1回後も根拠がなければ`sales_reason_status=missing`として候補を残す。

## Review worker

```json
{"lead_id":"lead-id","outreach":{"status":"reviewed","message":"...","individualized_part":"...","reviewed":true},"workflow":{"stage":"reviewed","result":"completed"}}
```

予算・外注意欲などで候補を追加審査しない。ただし提案予定の機能が実装済みなら理由を撤回し、明示的な営業・勧誘禁止があれば出典付きで`lead.status=excluded`、文面なしを親に返す。事実誤認、攻撃的表現、未確認断定、URL誤りを修正する。営業理由の因果が確認できず追加調査でも補えなければ、以下のように送信可能な文面を残さない。

```json
{"lead_id":"lead-id","sales_reason_status":"missing","sales_reason":null,"personalization":{"status":"missing","facts":[]},"outreach":{"status":"blocked_personalization","message":null,"reviewed":false,"reason_version":null},"workflow":{"stage":"lead_ready","result":"personalization_missing"}}
```
