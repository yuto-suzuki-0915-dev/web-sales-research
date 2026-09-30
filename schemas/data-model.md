# v3データモデル

`businesses.jsonl`は1行1事業者のJSON。フィールド軸を混在させない。

## レコード概要

```json
{
  "schema_version": 3,
  "lead_id": "lead-xxxx",
  "identity": {
    "name": "事業者名",
    "aliases": [],
    "region": "地域",
    "address": "住所",
    "industry": "業種",
    "business_status": "active",
    "unit_type": "store",
    "organization_control": "independent"
  },
  "discovery_sources": [],
  "website": {
    "presence": "unconfirmed",
    "url": null,
    "evidence": []
  },
  "visual": {
    "status": "unverified",
    "desktop_checked": false,
    "mobile_checked": false,
    "evidence": []
  },
  "renewal": {
    "opportunity": "not_applicable",
    "reasons": []
  },
  "lead": {
    "status": "candidate",
    "priority": null,
    "proposal_type": null,
    "reasons": [],
    "exclusion_reasons": [],
    "recheck": null
  },
  "contacts": {
    "channels": [],
    "text_outreach_available": false,
    "research_status": "pending",
    "research_checks": {}
  },
  "contactability": "contact_unverified",
  "personalization": {
    "status": "pending",
    "facts": []
  },
  "sales_reason_status": "pending",
  "sales_reason": null,
  "outreach": {
    "status": "pending",
    "message": null,
    "individualized_part": null,
    "reviewed": false
  },
  "workflow": {
    "stage": "discovered",
    "result": "in_progress"
  },
  "legacy_matches": [],
  "observed_at": null,
  "updated_at": null
}
```

確実な重複は別leadとして残さず、`duplicates.jsonl`へprimary、duplicate、根拠、統合日時を記録してコードで統合する。重複を`lead.status=excluded`として母集団に残さない。
import時の自動統合は、入力で既存`lead_id`を明示した更新、または正規化した事業者名・住所が一致し地域に矛盾がない場合に限る。同名・同地域のみ、共通ドメイン、共通電話・SNSは統合根拠にしない。住所等が不足して識別できない場合は別leadのまま保持し、十分な根拠が得られた後に`merge-duplicates`で統合する。

## enum

- website.presence: `confirmed | unconfirmed | confirmed_no_site`
- visual.status: `verified | unverified`
- renewal.opportunity: `large | medium | small | undetermined | not_applicable`
- lead.status: `candidate | excluded | recheck`
- lead.priority: `high | medium | low | null`
- identity.business_status: `active | closed | unknown | conflicting`
- identity.organization_control: `independent | franchise_local_possible | centralized_chain | unknown`
- personalization.status: `pending | ready | missing`
- contactability: `text_ready | phone_only | contact_not_found | contact_unverified`
- contacts.research_status: `pending | in_progress | access_limited | completed`（コードで導出）
- contacts.research_checks.*.status: `found | not_found | inaccessible | not_checked`
- sales_reason_status: `pending | ready | missing`
- outreach.status: `pending | generated | reviewed | blocked_personalization | review_failed`
- workflow.stage: `discovered | triaged | lead_ready | outreach_generated | reviewed`
- workflow.result: `in_progress | completed | excluded | personalization_missing | review_failed`

## visual.evidence

```json
{
  "viewport": "mobile",
  "page_type": "top",
  "page_url": "https://example.com/",
  "observation": "横スクロールが発生",
  "evidence_ref": "evidence/visual/lead-id/top-mobile.png",
  "captured_at": "ISO-8601"
}
```

`verified`ではdesktop/mobileの両方と証拠参照が必要。視覚未確認でもlead.statusはcandidateにできる。

## recheck

```json
{
  "reason_code": "business_identity_ambiguity",
  "reason": "同名店舗を識別できない",
  "attempted_sources": [],
  "retry_count": 1,
  "next_action": "所在地を公式情報で確認"
}
```

許可reason code:

- サイトやスクリーンショットへのアクセス失敗はrecheck理由にしない。`visual.status=unverified`とし、必要に応じてリニューアル余地や優先度で不確実性を表す。
- アクセス不能によって事業者同定そのものができない場合のみ、`business_identity_ambiguity`または`official_source_ambiguity`など実際に該当する理由を使う。
- `operating_status_conflict`
- `business_identity_ambiguity`
- `official_source_ambiguity`
- `business_existence_ambiguity`

## contact channel

```json
{
  "type": "contact_form",
  "value": "https://example.com/contact",
  "official": true,
  "purpose": "general",
  "sales_prohibited": false,
  "source_url": "https://example.com/",
  "checked_at": "ISO-8601"
}
```

旧版で作った営業文は、文章送信先が未確認でも`outreach.legacy=true`、`outreach.reason_version=2`として履歴に保持する。新規運用では`text_ready`かつ営業理由`ready`の候補だけ通常の初回営業文を作る。送信キューは具体的な文章窓口と新基準の営業理由・レビュー済み文面が揃った候補だけを掲載する。移行のみでは追加調査を実施した扱いにせず、再評価前の理由は`pending`とする。

`channels[]`は実際に見つかった連絡先、`research_checks`は見つからなかった経路も含む調査証跡として分ける。後者は`instagram_dm`、`email`、`contact_form`、`official_line`、`other_text_channel`の5キーを持つ。各キーに`status`、`value`、`source_url`、`checked_at`、`notes`を保存し、未確認は`not_checked`。`not_found`/`inaccessible`には確認元URLと日時を必須とする。`found`は利用可能な同種の`channels[]`と一致する。`other_text_channel`の実際のチャネル型は`other`。

```json
"research_checks": {
  "instagram_dm": {"status":"found","value":"https://www.instagram.com/example/","source_url":"https://www.instagram.com/example/","checked_at":"2026-09-27T00:00:00Z","notes":"公式サイトからリンク"},
  "email": {"status":"not_checked","value":null,"source_url":null,"checked_at":null,"notes":null},
  "contact_form": {"status":"not_checked","value":null,"source_url":null,"checked_at":null,"notes":null},
  "official_line": {"status":"not_checked","value":null,"source_url":null,"checked_at":null,"notes":null},
  "other_text_channel": {"status":"not_checked","value":null,"source_url":null,"checked_at":null,"notes":null}
}
```

`contactability`と`research_status`はコードで導出する。公式性、営業禁止でないこと、送信先、出典URL、確認日時の揃う文章窓口が1件あれば`text_ready`/`completed`で、残りチャネルは未確認でよい。Instagramの`@handle`は保存時にプロフィールURLへ正規化する。メール、公式Instagram DM、URLで辿れる公式LINE、一般・事業用フォーム、公式のその他文章窓口を対象とし、予約専用・営業禁止窓口は含めない。窓口の用途が公式情報で`recruitment`、`reservation`、`booking`、`personal`と明示される場合は、文章を送れる仕組みでも制作営業先としては使わない。用途が未確認の窓口を事業者全体からの除外理由にはしない。文章窓口が0件で5種類すべて根拠付き`not_found`なら、公式電話の有無で`phone_only`/`contact_not_found`。1種類でも`not_checked`や`inaccessible`なら`contact_unverified`。未着手は`pending`、一部確認は`in_progress`、アクセス制約は`access_limited`。旧データの`research_status=completed`だけでは否定判定を継承しない。`text_outreach_available`は互換フィールドとして`text_ready`と一致させる。

送信キューへ掲載するチャネルは`type`、`value`、`source_url`、`checked_at`が必須。これらをキューにも表示する。送信済み行は送信履歴へ移し、再送対象としてキューに残さない。

## personalization fact

```json
{
  "fact": "スマートフォン表示で予約ボタンが画面幅の外に続いている",
  "fact_type": "sales_relevant_web_fact",
  "source_url": "https://example.com/",
  "checked_at": "ISO-8601",
  "safe_for_outreach": true
}
```

`fact_type`は`business_fact | sales_relevant_web_fact`。旧runの事実は根拠を再確認するまで`business_fact`として扱う。住所、距離、営業時間、一般的なメニュー、女性専用、設備、媒体登録、LINE・Instagram・QRコードの存在だけでは営業文用の事実としない。複数媒体の差を理由にする場合は、比較した各媒体の出典を証拠に保存する。

`sales_reason_status=ready`には、Web上の事実、出典URL、確認日、Web制作につながる理由、対応する提案を`営業理由`として保存する。`sales_reason.fact`と同じ出典・内容の`sales_relevant_web_fact`を保存し、営業文の2段落目へ接続する。意味上の因果関係はAIレビューで確認し、コードは参照の一致と状態整合を検証する。見つからなければ1回追加調査し、なお不足なら`missing`。候補は維持する。

## 整合条件

- website.presenceがconfirmed以外ならrenewal.opportunityはnot_applicable。
- verifiedならdesktop/mobile証拠が必要。
- recheckには許可reason codeと具体的理由が必要。
- candidateは連絡手段を先に確認する。通常の文章営業文はtext_readyかつ営業理由readyの場合だけ生成し、phone_only・文章窓口未確認なら生成せず候補として保持する。
- 個別事実不足はcandidateをexcludedへ変えない。
- `公式サイトがないため`等の断定をunconfirmed向け営業文に入れない。
