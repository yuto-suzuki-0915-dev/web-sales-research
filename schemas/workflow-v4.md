# v4実行ワークフロー

利用者の指示で新規runと既存runの続きを区別する。既存runが指定された場合、探索の再実行を暗黙に行わない。新規runは`node scripts/web-sales-store.mjs init --run <DIR> --run-id <ID> --region <地域> --industry <業種> [--segment <Segment>]`。途中再開は`resume`してmanifestと各レコードの保存済み段階を読む。旧v3 runは旧`workflow.md`を参照し、新資格判定へ自動移行しない。

## DISCOVER

現行の6種の基本探索と追加探索・飽和判定を維持する。各探索経路の返却をroute情報付き`import`で取り込み、新規unique数をコードで記録する。名称・所在地・業種・発見元等の基本情報だけを中心に集め、詳細な求人・料金・窓口探索を全件で行わない。公式サイト未発見は`unconfirmed`。`confirmed_no_site`の証明探しをしない。重複は確実な同名・同住所または明示的な決定だけで統合する。

## TRIAGE

全件を小バッチで浅く確認する。地図、公式サイト候補、サイト確認済みならトップページdesktop/mobileの取得済み視覚証拠を使う。下層ページ・SNS・求人・競合比較を全件で行わない。取得失敗は`visual.status=unverified`とし、候補から落とさない。`activity`、`website.presence`、`web_gap`、既存の`lead.status`を別軸で保存する。

親はTRIAGE後、活動の手掛かりとWeb上の提案余地がある候補、または追加確認で判断が変わり得る候補をQUALIFYへ渡す。件数を300件等に固定しない。明確な対象外は除外する。後日変化があり得るが今回深掘りを見送る場合は、理由・次の確認事項・再確認日付き`qualification.status=watch`とする。情報不足だけで`drop`にしない。
一次判断は`triage.decision`へ保存し、`advance`だけを`triage_pass`として集計する。`defer`と`stop`は候補の削除ではない。

## QUALIFY

`qualification-worker`は選ばれた候補だけをSegmentに応じて確認する。店舗型ならSNS・予約媒体、施工業なら施工事例、地域BtoBなら会社情報・採用情報を必要な範囲で使う。同一URLの再取得を避け、確認済み内容をEvidenceへ短く保存する。取得済み資料が判断に足りる、技術上限、アクセス制約のいずれかで止め、未調査を否定事実にしない。`pursue`には根拠付きの具体的Web提案と事業用途を必須とし、提案予定の役割が既存サイト・予約先で実現済みでないか、顧客の判断場面とつながるかを`schemas/proposal-opportunity-review.md`で確かめる。商業シグナルやtriggerは主にP1/P2/P3の順序に使う。営業理由の長文はまだ作らない。

## OUTREACH

`pursue`の候補だけ詳細Contact調査する。既存の窓口情報を再利用し、使える公式文章窓口1件で早期終了する。見つからない場合のみ旧`workflow.md`第7節の5チャネルを根拠付きで確認する。未確認・アクセス不能が残れば`contact_unverified`であり、電話を見つけただけで`phone_only`にしない。

文面生成前に`plan-drafts --run <DIR> [--limit N]`で候補を読み取り専用で抽出する。v4では`pursue`の根拠、公式文章窓口、現在利用できるチャネル、未送信・未見送り・文面未作成を揃えたIDだけを次の小バッチへ渡す。既定の表示は優先順10件で、送る見込みの件数に合わせて調整できる。残りは候補情報を保存し、先に営業文を作らない。既存文面は再生成せず、レビュー・資格判定・窓口の修正として扱う。`plan-drafts`は文面の妥当性やキュー投入を保証しない。

`outreach-worker`は選ばれたIDのEvidence Bundleを基本入力に、必要な情報だけを再取得する。提案の役割と既存機能、管理主体と宛先用途を先に照合し、理由が崩れたら文面化せず差し戻す。事実と具体的なWeb提案の因果がなければ`sales_reason_status=missing`。文面生成後に`review-worker`が事実、提案、相手への敬意、関連する制作例、変更対象と送信先の用途を確認する。宛先不一致なら`reviewed`へ進めず、確認事項を`review_note`に残す。`summarize`と`validate`で市場・資格判定・連絡先・文面・送信結果を別々に報告する。外部送信は行わない。

## 送信結果と再開

`send-queue.md`の店舗行を`- [x]`にすると送信済み、内側の「送信不可」と理由はその窓口だけの不可、「営業見送り」と理由は事業者全体への営業停止とする。複数同時チェック、表記揺れ、理由空欄は書き込み前に検出する。仕分けのみは`settle-queue --run <DIR>`で事前確認し、`--apply`で確定する。未チェックを残し、市場・候補・文面や別窓口へのキュー補充を変更しない。未仕分けチェックがある間は`summarize`等の再生成を拒否する。コマンドでも記録可能:

```powershell
node scripts/web-sales-store.mjs record-outcome --run <DIR> --lead-id <ID> --result sent --channel email --destination <宛先> --occurred-at <ISO日時>
node scripts/web-sales-store.mjs record-outcome --run <DIR> --lead-id <ID> --result previously_sent --reason "過去の送信履歴で確認"
node scripts/web-sales-store.mjs record-outcome --run <DIR> --lead-id <ID> --result unable --channel instagram_dm --destination <URL> --reason "DMを送れない"
node scripts/web-sales-store.mjs record-outcome --run <DIR> --lead-id <ID> --result lead_skip --reason "営業・勧誘お断りのため"
node scripts/web-sales-store.mjs record-outcome --run <DIR> --lead-id <ID> --result lead_reopen
node scripts/web-sales-store.mjs record-outcome --run <DIR> --lead-id <ID> --result reply
```

窓口単位の送信不可でも事業者そのものを除外せず、別窓口があれば通常の再生成時に使う。文面差し戻しは`unable`ではなく、`outreach.status=generated`、`reviewed=false`、`review_note`として`import`し、送信キューから外す。既送判明は`previously_sent`で記録し、今回の送信と区別する。事業者単位の見送りは別窓口も止める。`outreach-events.jsonl`、`sent-history.md`、`unable-to-send.md`、`skipped-leads.md`を履歴として保持する。`summary.md`と`market-summary.json`には発見、一次判定、追加調査済み、pursue、文章窓口、送信キュー、送信済み、過去送信判明、送信不可、営業見送り、実送信日時未記録、返信等を別集計する。Segment比較では分母と観測期間が揃わない率を作らない。

統合先ではない重複レコードに結果イベントまたはチェック済み送信履歴がある場合、`merge-duplicates`は自動統合を拒否する。履歴のID移行を明示的に設計するまでは、営業結果を失う統合を行わない。
