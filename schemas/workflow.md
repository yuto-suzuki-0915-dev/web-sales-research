# v3実行・再開ワークフロー

## 1. run作成

親が検索前にrunを作る。

```powershell
node scripts/web-sales-store.mjs init --run research/market-runs/<run-id> --run-id <run-id> --region "<地域>" --industry "<業種>"
```

同名runを上書きしない。再開時は既存manifestを読み、保存済みのstageから続ける。

再開時は最初に次を実行し、前回の停止理由を現在runへ持ち越さない。

```powershell
node scripts/web-sales-store.mjs resume --run research/market-runs/<run-id>
```

## 2. 基本探索

次のroute_typeをすべて`completed`または`not_applicable`として記録するまで、探索飽和を判定しない。

- `web`
- `map`
- `industry_media`
- `region_variant`
- `station_area`
- `industry_synonym`

探索元ごとに`discovery-worker`へ委任してよい。返却を`work/discovery-*.jsonl`へ保存し、store scriptで取り込む。検索結果の一覧件数ではなく、取り込み後の新規unique件数をsearch logへ記録する。

```powershell
node scripts/web-sales-store.mjs import --run <run-dir> --input <batch.jsonl> --legacy-root research/leads --route-id <id> --route-type <type> --phase basic
```

`import`が実際の追加件数を探索ログへ書く。Agentや親が件数を手で転記しない。適用不能または入力ファイルがない0件経路だけ`search-log`を使う。

## 3. 追加探索と飽和

基本探索後、異なる追加検索経路を1件ずつ記録する。初期設定では新規uniqueが1件以下の追加探索が3回連続すると`saturated`。閾値はconfigから読む。

追加探索のroute_id、検索元、検索語または条件は毎回変える。同一検索の再実行を別経路として数えない。

利用者上限または技術上限ならmanifestのstop_reasonへ`user_limit`または`technical_limit`を記録し、飽和と呼ばない。

## 4. 公式サイト確認

地図・媒体にリンクがなくても、名称、地域、業種、表記揺れで追加検索する。それでも見つからなければ`unconfirmed`。`confirmed_no_site`のためだけの調査は行わない。

## 5. 視覚確認

`confirmed`のトップページについてparentが次を実行する。

```powershell
node scripts/capture-site.mjs --url <url> --out-dir <run-dir>/evidence/visual/<lead-id> --id <lead-id>
```

desktop/mobile画像とmetadataをtriage workerへ渡す。両方を確認できた場合に`verified`。失敗は`unverified`とするが、候補判定とは分離する。

ブラウザsandboxを無効化するオプションは通常使用しない。実行環境自身のsandbox内でChromiumが起動できず、信頼できるローカルfixtureを検証する場合だけ`--no-browser-sandbox true`を使用できる。公開サイト調査では既定のbrowser sandboxを維持し、取得不能なら`unverified`として継続する。

## 6. Triage

全事業者をtriageする。既定はcandidate。除外は明確な根拠がある場合だけ。recheckはcontrolled reason codeを必要とする。

`visual_status=unverified`だけでrecheckにしない。`website_presence=unconfirmed`だけでもrecheckにしない。

Triageで確実な重複を発見した場合は、重複側をexcludedにしない。primaryとduplicateのID、根拠をJSONLへ保存し、コードで統合する。

```powershell
node scripts/web-sales-store.mjs merge-duplicates --run <run-dir> --input <duplicate-decisions.jsonl>
```

識別に確信がなければ統合せず、候補情報として残す。

## 7. 連絡手段・営業理由・営業文

候補の公式サイトのヘッダー・フッター・問い合わせページと公式リンクを起点に、メール、一般・事業用フォーム、公式LINE、その他の文章窓口を確認する。公式Instagramプロフィールまたは店名・地域でのInstagram検索も確認する。文章窓口が見つからない場合だけ、必要な種類について店名・地域を組み合わせた追加検索を行う。`other_text_channel`は公式ページから案内される明らかな代替窓口を1回確認する範囲とし、無期限に検索を広げない。

探索対象は`instagram_dm`、`email`、`contact_form`、`official_line`、`other_text_channel`の5種類。出典URL・確認日時付きの利用可能な公式文章窓口が1件見つかれば`text_ready`として探索を打ち切り、残りは`not_checked`でよい。見つからなかった場合だけ、各種類へ根拠URL・日時付きの`not_found`または`inaccessible`を記録する。アクセス不能を`not_found`としない。5種類すべてが根拠付き`not_found`なら公式電話の有無から`phone_only`/`contact_not_found`をコードで導出する。`not_checked`や`inaccessible`が残る場合は`contact_unverified`として残す。`research_status=completed`だけを返しても確定しない。

電話のみ・文章窓口未確認の事業者は候補として残すが、通常の初回営業文は生成しない。`text_ready`の候補について、下層ページやSNS等を必要な範囲で確認する。`schemas/proposal-opportunity-review.md`に従い、営業・勧誘禁止の明示、提案予定の役割の実装済み状態、確認事実から顧客の判断場面を経た提案の因果を確かめる。ページ分割・共通メニュー自体は問題にしない。店舗プロフィールやQRコードの存在だけなら採用しない。追加確認1回でも見つからなければ`sales_reason_status=missing`とし、文面を無理に作らない。

## 8. レビュー

個別事実と営業文を出典へ照合し、事実を除いても提案理由が変わらない文面を差し戻す。再確認しても適切な理由がなければ`sales_reason_status=missing`、文面なしとする。技術的に確認不能な場合のみ`review_failed`。効果未証明、予算不明、外注意欲不明を理由に候補を削らない。

## 9. 保存と再開

各バッチ取り込み後にmanifestとbusinessesを再読する。中断時はstageを保持する。ほかの事業者は一部のアクセス失敗に影響されず継続する。

最後に実行する。

```powershell
node scripts/web-sales-store.mjs summarize --run <run-dir>
node scripts/web-sales-store.mjs validate --run <run-dir>
```

`summarize`は発見数と営業可能数を混同しない営業ファネルを`summary.md`と`market-summary.json`へ出し、`send-queue.md`、`sent-history.md`、`phone-only-leads.md`、`contact-research-needed.md`も作る。send-queueは現在も`candidate`、`text_ready`、営業理由`ready`、文面`reviewed`をすべて満たし、使用する窓口のtype/value/source_url/checked_atが揃った未送信のものだけ。送信済みのチェックと当時の文面は`sent-history.md`へ保持する。既存runの再評価・再生成は、この通常フローへ自動的に含めない。利用者が別途依頼した場合だけ、元データと送信履歴を保全して実行する。

送信結果の仕分けだけを行う場合は、v3 runでも`settle-queue --run <run-dir>`で事前確認し、`--apply`で確定する。これは調査・営業文・キュー補充を行わない。未仕分けチェックが残る間は`summarize`等の再生成を拒否する。旧キューの「送信不可」は従来どおり窓口単位として扱い、理由文から事業者単位の営業見送りへ自動変換しない。新たな事業者単位の見送りは`record-outcome --result lead_skip --reason <理由>`で記録し、解除は`lead_reopen`で行う。新しいキューには「営業見送り」チェック欄も出る。

過去に送信済みと後から確認した場合は`record-outcome --result previously_sent --reason <確認根拠>`を使い、本日の送信として記録しない。文面差し戻しや提案対象と窓口の不一致は`unable`にせず、`outreach.status=generated`、`reviewed=false`、`review_note`を取り込んで文面レビューへ戻す。人が送る直前には、営業理由と窓口の変動する箇所だけ再確認する。

旧形式の送信不可は`--apply`で一旦停止する。窓口だけの不可と確認した場合に限り`--allow-legacy-unable`を指定する。営業全体の見送りなら旧行に「営業見送り」欄と理由を追加してチェックを移す。
