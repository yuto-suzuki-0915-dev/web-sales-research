# v4追加データモデル

新規runの`manifest.schema_version=4`、`qualification_rules_version=1`。`businesses.jsonl`は従来どおり1行1事業者で、既存の`lead.status`、`website`、`visual`、`renewal`、`contacts`、`sales_reason`、`outreach`、`workflow`を消さない。旧v3 runは資格判定ゲートを持たず、データ移行だけで`pursue`へ昇格しない。

## 追加する独立軸

```json
{
  "identity": { "segment": "美容室" },
  "activity": { "status": "active", "evidence_ids": ["activity-1"] },
  "web_gap": { "status": "moderate", "evidence_ids": ["web-1"] },
  "triage": { "decision": "advance", "reason": "活動とWeb提案余地を簡易確認", "checked_at": "2026-09-28T00:00:00Z" },
  "evidence": [
    { "id": "web-1", "kind": "web_gap", "status": "observed", "observation": "スタイル事例の詳細から担当者プロフィールと店舗別予約先へ辿るリンクがない（確認範囲: 事例・担当者・予約ページ）", "source_url": "https://example.com/styles", "checked_at": "2026-09-28T00:00:00Z" },
    { "id": "activity-1", "kind": "activity", "status": "observed", "observation": "公式のお知らせが更新されている", "source_url": "https://example.com/news", "checked_at": "2026-09-28T00:00:00Z" }
  ],
  "qualification": {
    "status": "pursue", "priority": "P2", "reason": "気になった事例から担当者と予約先を選ぶ判断を支える接続を提案できる",
    "evidence_ids": ["web-1", "activity-1"],
    "web_proposal": "既存サイトの事例から担当者・店舗別予約先へつなぐ導線",
    "business_use": "初めて訪れる人が気に入った事例の担当者を確認して予約先を選べる",
    "next_action": null, "review_after": null,
    "rules_version": 1, "checked_at": "2026-09-28T00:00:00Z"
  }
}
```

- `activity.status`: `active | uncertain | inactive`。口コミ・営業時間だけで事業者の活動を断定しない。
- `web_gap.status`: `strong | moderate | none | unknown`。主観的な見た目だけで`strong`にしない。`website.presence=unconfirmed`はそれだけではgapの証拠にならない。
- `triage.decision`: `pending | advance | defer | stop`。`advance`はQUALIFYへ進める一次判断、`defer`は後日確認、`stop`は今回深掘りしない判断。`pending`以外は理由と確認日時を残す。hard exclusionや最終資格判定とは別軸にする。
- `evidence[].status`: `observed | not_observed | not_checked | inaccessible`。確認済み項目は出典URLと確認日時、`observed`は観察内容、`not_observed`は確認範囲`scope`を持つ。未確認と不存在を混同しない。triggerには発生日`event_at`を任意で記録する。別媒体との比較は両方の出典を別Evidenceにする。
- `qualification.status`: `pending | pursue | watch | drop`。既存の`lead.status`や`contactability`を置き換えない。
- `pursue`は`triage.decision=advance`、根拠ID、具体的な`web_proposal`、`business_use`、理由、P1/P2/P3、確認日時を必須とする。商業シグナルやtriggerは必須条件ではない。
- `watch`は理由、次の確認事項`next_action`、再確認日`review_after`を必須とする。情報不足だけを理由に永久保留へしない。
- `drop`は理由必須。低単価・商業シグナル未発見だけでは不十分。明確な対象外は既存の`lead.status=excluded`でも表す。
- `qualification.priority`は`P1 | P2 | P3 | null`。推測の点数を保存しない。`workflow.stage=qualified`を追加するが、UI工程は4つのまま。

Evidenceは観測と解釈を分離する。写真、料金、求人等の観測を「予算がある」「外注する」と言い換えない。上の架空例も、実際には既存サイト・予約先で同じ役割が実現済みでないことを確認してから使う。Evidenceから営業理由へ進むときは、`sales_reason.fact / why_web / proposal`へ参照できる内容だけを使う。個別化に無関係なプロフィール情報を入れない。境界例は`schemas/proposal-opportunity-review.md`を参照する。

## 文章営業と結果

`SEND_NOW`は保存する資格判定ではなく、`pursue`・公式文章窓口・営業理由`ready`・文面`reviewed`・未送信・利用可能な送信先が揃った`send_queue_ready`の表示である。`phone_only`や送信不可のチャネルがあっても`pursue`を自動的に削除しない。

`outreach-events.jsonl`は結果の追記履歴。各行に`event_id`、`lead_id`、`result`、`recorded_at`、任意の`occurred_at`、`channel`、`destination`、`reason`、`source`を保存する。結果は`sent | previously_sent | unable | reopen | lead_skip | lead_reopen | reply | meeting | proposal | won | lost`。`previously_sent`は、今回の作業より前に送った事実を後から確認したときだけ使い、確認根拠`reason`を必須とする。送信済みとして再キューを止めるが、本日の送信件数には加えない。実際の送信日時が分からなければ`occurred_at=null`であり、記録日時を送信日時と偽らない。`unable`は実際に使用できなかった送信先だけを再キュー対象から外し、文面差し戻しには使わない。別の確認済み窓口があれば通常のキュー再生成時にそちらへ進める。`lead_skip`は理由付きの事業者単位の見送りで、`lead_reopen`のみ解除する。`reopen`は送信不可の送信先を再び利用候補にする。過去の`unable`は理由文から自動再分類しない。送信済みは自動で再送対象に戻さない。

提案対象と窓口の不一致などで文面を差し戻す場合は、送信結果イベントではなく`outreach.status=generated`、`reviewed=false`、任意の`outreach.review_note`で記録する。解消後のレビューでは`review_note=null`として消せる。既存の`qualification.status`は、営業理由自体が反証されない限り維持する。

既存`sent-history.md`のチェック済み行は引き続き再送防止に使う。旧v3の`send-queue.md`は新しい資格判定なしで維持し、既存runを明示的に再評価するまで新基準のキューへ置き換えない。新規v4 runでは`qualification.status=pursue`を送信キューの追加条件とする。
