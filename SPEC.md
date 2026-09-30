# Web制作営業支援Skill 最終仕様

Status: Approved for implementation  
Schema version: 3 (既存v2データは保持して移行)

## 1. 目的

指定された地域・業種について、公開情報から可能な範囲で事業者を広く発見し、Webサイト保有状況と制作提案余地の全体像を把握する。明確な対象外だけを除外し、候補へ営業順の優先度を付ける。文章で接触できる候補を先に調べ、Web制作を提案する理由が確認できた事業者の初回営業文を作る。

営業成功可能性、制作予算、外注意欲、担当者、サイトへの不満を公開情報から証明することは目的にしない。

## 2. 利用者体験

利用者向け入口は `/web-sales` の1つ。1回の依頼で、探索、重複除去、公式サイト確認、視覚確認、市場集計、候補判定、個別調査、営業文生成、レビュー、保存まで自動進行する。工程ごとの再実行を求めない。外部への送信は行わない。

## 3. Discovery

基本探索として、通常Web検索、地図検索、主要予約・業界媒体、地域名の表記違い、駅名・町名による地域分割、業種名の言い換えを一通り実行する。適用不能な経路は理由付きで記録する。基本探索完了前に件数だけで終了しない。

基本探索後、異なる追加探索経路を確認する。初期値では、新規の重複除去後事業者が1件以下の状態が3探索連続した場合を探索飽和の目安とする。閾値は `config/web-sales.json` で変更可能にする。割合条件は初期実装では使わない。

終了理由は `saturated`、`user_limit`、`technical_limit`、`access_limited`、`interrupted`を区別する。技術上限を市場の候補数上限として扱わない。最終表示は「今回の探索で発見できた重複除去後の事業者数」とし、地域内総数と断定しない。

## 4. 分離するデータ軸

### website_presence

- `confirmed`
- `unconfirmed`
- `confirmed_no_site`

検索で見つからない場合は`unconfirmed`。`confirmed_no_site`は通常調査中に直接的で信頼できる根拠を得た特殊ケースのみ。不存在を証明するための追加調査はしない。

### renewal_opportunity

- `large`
- `medium`
- `small`
- `undetermined`
- `not_applicable`

サイト未確認・なし確認済みは`not_applicable`。サイトを採点するのではなく、制作サービスの提案余地を判断する。

### lead_status

- `candidate`
- `excluded`
- `recheck`

迷った場合の既定は`candidate`。`recheck`は営業候補判定自体を妨げる重要な矛盾または識別不能に限定する。

使用可能なrecheck理由は、`operating_status_conflict`、`business_identity_ambiguity`、`official_source_ambiguity`、`business_existence_ambiguity`。サイトやスクリーンショットへのアクセス失敗はrecheck理由にしない。アクセス不能によって事業者同定そのものができない場合は、該当する識別不能理由を使う。

予算、制作関心、刷新意欲、効果、外注意欲、担当者、現在サイトへの不満が不明でも`recheck`にしない。

### visual_status

- `verified`
- `unverified`

視覚確認に失敗しても、事業実態と候補判定に重大な矛盾がなければ、`visual_status=unverified`、`renewal_opportunity=undetermined`、`lead_status=candidate`を許可する。

### contact_channelsとtext_outreach_available

連絡手段は`email`、`contact_form`、`instagram_dm`、`official_line`、`phone`、`other`をすべて保存する。文章営業に利用できる窓口の有無を`text_outreach_available`として別管理する。個人LINE、予約専用フォーム、営業禁止窓口は文章営業先にしない。

候補と文章で営業できる状態を分離する。`contactability`は`text_ready | phone_only | contact_not_found | contact_unverified`。公式性・営業利用可能性・送信先・出典URL・確認日時が揃う文章窓口を1件確認すれば`text_ready`とし、他チャネルの探索は不要。文章窓口が見つからない場合だけ、`instagram_dm`、`email`、`contact_form`、`official_line`、`other_text_channel`の5種類を根拠付きで調査する。5種類すべて`not_found`なら公式電話の有無で`phone_only`/`contact_not_found`を導出する。`not_checked`や`inaccessible`が残れば`contact_unverified`。`research_status`は`pending | in_progress | access_limited | completed`をコードで導出し、`completed`の自己申告だけでは否定判定しない。`text_outreach_available`は互換フィールドとして保持し、`text_ready`と一致させる。詳細な証跡構造と探索範囲は`schemas/data-model.md`と`schemas/workflow.md`を正とする。

## 5. 視覚確認と証拠

公式サイト確認済み事業者は原則全社で、トップページのデスクトップ表示とスマートフォン表示を浅く確認する。レスポンシブ、レイアウト、余白、文字、写真、情報階層、予約・問い合わせ導線、明確な古さ、極端な簡素さを見る。

`visual_status=verified`では、viewport、ページ種別、URL、観察内容、スクリーンショット等の参照、確認日時を`visual_evidence`へ保存する。目的は採点ではなく、候補理由を後から人間が確認できること。下層ページは候補または一次確認で判断不能な事業者を中心に確認する。

## 6. リニューアル余地

- `large`: 明確な営業材料が1つ以上あり、制作例を見せた提案が自然。
- `medium`: 現在利用可能だが、デザイン、写真、情報設計、導線等に提案余地がある。
- `small`: 十分整っており営業理由が弱い。別の提案理由があれば候補、なければ除外可能。
- `undetermined`: 視覚情報等が不足して判断できない。

## 7. 候補・除外・チェーン

現在営業し、実態を確認でき、直接営業が不自然でなく、少しでも制作提案余地があれば広く候補に残す。明確な対象外は、閉業、実態なし、対象業種外、制作会社、提案余地がほぼなく別理由もない、本部一括管理で店舗独自施策・問い合わせがない場合等。

チェーン名だけで除外しない。店舗独自サイト、SNS、問い合わせ、サービス、料金、発信があればフランチャイズ・独立運営の可能性として候補に残せる。決定権の証明は不要。

## 8. 優先度

`high`、`medium`、`low`は営業順を決める。低優先度を理由に候補を削らない。文章営業の処理順では、優先度とともに`contactability=text_ready`を考慮する。

## 9. 個別化と営業文

個別事実は`business_fact`と`sales_relevant_web_fact`に分ける。営業文には、確認可能なWeb上の事実から「そのためWeb制作を提案する」と説明できる後者のみを使う。住所、駅からの距離、営業時間、一般的なサービス内容、女性専用、設備、媒体登録、LINE・Instagram・QRコードの存在だけでは採用しない。事実からWeb上の差・導線・情報整理上の提案余地を経て、具体的な制作提案まで説明できることを条件にする。事実を削っても提案理由が変わらないなら不採用。出典、確認日、事実からWeb制作につながる理由、具体的な提案を保存する。追加調査を1回行っても適切な事実が見つからなければ`sales_reason_status=missing`とし、候補は維持する。

公式サイト未確認の場合、「公式サイトがないため」と断定しない。SNSや予約媒体の具体的な発信・情報分散など、Web制作につながる確認事実がある場合だけ提案する。SNSや媒体を利用しているという事実だけでは営業理由にしない。営業理由の採用前に`schemas/proposal-opportunity-review.md`を参照し、提案予定の役割が実装済みでないか、顧客の判断場面との因果があるか、営業・勧誘禁止の明示がないかを確認する。

営業文は相手を批判せず、現在Web上にある写真・発信・サービス情報等から作れるものと、その提案のため連絡した理由を一つの流れにする。事実の調査報告と突然の制作提案を別々に並べない。2段落目は確認事実・対応する提案・連絡理由を自然につなぐ。「拝見しました」は禁止しないが固定テンプレートにしない。「活かしながら」も確認した素材に応じて言い換える。売上・集客保証、技術スタック、長い自己紹介、根拠のない称賛、初回打ち合わせ要求を入れない。空行で挨拶と自己紹介、連絡理由、対応範囲、制作例3件、軽いCTAを分ける。詳細は`schemas/outreach-guide.md`を正とする。

初回営業文の制作例は業種や送信先を問わず次の3件をラベル付きでこの順序にする。Instagram投稿URLは使用しない。

- 【サービスサイト・予約機能の制作例】 https://yuto-suzuki-0915-dev-lp-renai.vercel.app/
- 【管理画面の実装例】 https://yuto-suzuki-0915-dev-lp-renai.vercel.app/admin
- 【デザイン・LP制作例】 https://lp-dryer.vercel.app/

## 10. 処理状態

`workflow.stage`は`discovered`、`triaged`、`lead_ready`、`outreach_generated`、`reviewed`。`workflow.result`は`in_progress`、`completed`、`excluded`、`personalization_missing`、`review_failed`。途中結果を保存し、失敗時は保存地点から再開する。

## 11. AIとコード

コードは重複除去、ID、既存lead照合、状態、保存、集計、並べ替え、サマリー、整合性検証を担当する。探索時の新規件数はimport結果から自動記録し、Agentに転記させない。自動統合は明示された既存lead_idまたは同名・同住所かつ地域に矛盾がない場合に限る。同名・同地域、共通ドメイン・電話・SNSだけでは統合しない。曖昧なものは別候補で保持し、後から確実な重複と判明した場合にコードでprimaryへ統合する。AI workerは探索、視覚判断、重複候補の提示、個別事実、提案タイプ、優先度、営業文、事実確認を担当する。集計専用Agentは作らない。

## 12. 最終集計

母集団、website_presence、renewal_opportunity、lead_status、優先度、contactability、sales_reason_status、営業文生成・レビュー件数を別軸で集計する。`summary.md`と`market-summary.json`には`discovered`、`candidate`、`contact_checked`、`text_ready`、`phone_only`、`contact_unverified`、`sales_reason_ready`、新基準の`outreach_reviewed`、`send_queue_ready`を営業ファネルとして別々に表示する。`contact_checked`は有効な文章窓口を1件確保した候補、または5種類すべて根拠付きで不在確認した候補の数とする。全候補をprospectsへ保存し、`candidate`・`text_ready`・営業理由`ready`・文面`reviewed`を現在もすべて満たす新基準文面だけを`send-queue.md`に載せる。使用する窓口のtype/value/source_url/checked_atを表示する。`phone_only`は`phone-only-leads.md`、連絡先未発見・要確認は`contact-research-needed.md`へ保存する。営業理由が`missing`でも候補から削らない。送信キューは優先度順の未送信チェックリストとし、チェック済み行と当時の文面は`sent-history.md`へ保持して再送対象に残さない。

## 13. 旧版からの移行

過去の`research/leads`と`research/runs`を変更しない。旧Skill・Agent・schemaは`archive/legacy-v1`へ退避する。v2は旧leadを名称、URL、住所等で照合するが、旧判定を新しい判定へ自動変換しない。

旧版の厳格なゲート、過剰な反対仮説検証、特定ランクでなければ営業文を作らない条件、少数件後の途中確認、不明情報による保留を現行の動作に持ち込まない。

## 14. 受け入れ条件

- 基本探索と探索飽和を区別できる。
- 全事業者を重複除去後の観測母集団として保存する。
- 再開時に前回の停止理由を持ち越さない。
- Webサイト状態、営業判断、視覚状態、連絡手段、営業文状態が独立している。
- 視覚未確認でも候補化できる。
- 電話のみの候補を除外せず、通常送信キューに混ぜない。
- Web制作提案と因果関係のないプロフィール情報を営業文用事実としない。
- 送信済みチェックを再生成で失わない。
- `recheck`が限定理由以外で付かない。
- 文章送信先とWeb制作の提案理由を確認できた候補だけ通常の初回営業文を作り、レビュー済みだけを送信キューに載せる。未確認や不足の場合は候補を維持して状態を保存する。
- Skill改修・テストと既存地域runの再調査・再評価を混同せず、後者は別途利用者が依頼した場合だけ実行する。
- 旧データが保持され、新旧の実行規約が混在しない。
- スクリプトテストは隔離された一時データで実行する。Skill改修だけの依頼で既存の地域runを再調査・再生成しない。
