# Web Sales Research

このプロジェクトは、指定された「地域 × 業種・Segment」から事業者を広く発見し、浅い一次判定後に提案余地のある候補だけ追加調査して、根拠付きの初回営業文を作る。新規runは`SPEC-v4.md`を正本とし、既存v3 runは旧`SPEC.md`を正本とする。

## 利用者向け入口

入口は `/web-sales` の1つだけ。新規探索と既存runの続きは利用者の指示で区別する。新規v4 runは`DISCOVER → TRIAGE → QUALIFY → OUTREACH`で進め、途中工程を利用者に再実行させない。既存runの続きでは、明示されない新規探索を行わない。

実際のメール、DM、フォーム送信は行わない。生成と外部送信は分離する。

## 最重要原則

- 目的は観測母集団の把握と、調査コストあたりの提案可能な営業先の発見。予算・外注意欲を公開情報から証明しない。
- 明確な除外理由がなければ `candidate` を既定とする。
- `recheck` は営業候補判定そのものを妨げる重要な矛盾・識別不能に限定する。
- 視覚確認失敗だけでは `recheck` にしない。`visual_status=unverified`、`renewal_opportunity=undetermined`、`lead_status=candidate` を許可する。
- `lead_status=candidate`、新しい`qualification.status`、`contactability`を分ける。電話のみ・文章送信先未確認でも発見済み事業者を保持する。新規v4 runで文面を作るのは`pursue`かつ具体的な公式文章送信先がある場合だけ。
- 文章窓口は公式性・送信先・出典URL・確認日時が揃う1件で`text_ready`。見つからなかった場合だけ5種類の調査証跡を保存し、根拠付き全件`not_found`で初めて`phone_only`/`contact_not_found`とする。単なる`research_status=completed`を信じない。
- 個別化のためだけに店舗プロフィールを差し込まない。確認事実からWeb上の差・導線・情報整理上の提案余地へつながる場合だけ営業理由として使う。見つからなければ`sales_reason_status=missing`とし、文面を無理に作らない。
- 営業文は調査報告ではなく、確認できた既存の写真・発信・サービス情報を材料に作れるものと連絡理由を一続きに伝える。制作例は提案に関係するVercelの1〜3件を選び、無関係な管理画面等を固定で載せない。Instagram投稿URLへ切り替えない。
- 新規v4 runの`send-queue.md`は`qualification.status=pursue`に加え、文章送信先のtype/value/source_url/checked_at・営業理由・レビュー済み文面が揃った未送信候補に限定する。旧v3 runは旧条件を維持する。
- 文面生成前には`plan-drafts`で送信履歴、見送り、利用可能な文章窓口、既存文面を確認し、今回送る見込みの小バッチだけを選ぶ。選ばれない候補の根拠と窓口は保存するが、営業文を先に量産しない。
- 同名・同地域や共通ドメイン・電話・SNSだけで事業者を自動統合しない。曖昧な重複は別候補で残す。電話が見つかっても文章窓口の調査途中なら`contact_unverified`とする。
- チェック済みの送信行は、文面とチェック状態を`sent-history.md`に保持し、`send-queue.md`には残さない。
- 予算、外注意欲、制作関心、担当者、効果、不満が不明でも除外・再確認にしない。
- 公式サイトを発見できない場合は通常 `unconfirmed`。サイトが存在しない証拠を探すために調査を延長しない。
- `pursue | watch | drop`はWeb提案の合理性、`P1/P2/P3`は営業順。商業シグナルやtriggerは予算の証拠でも機械的な必須条件でもない。`watch`には次の確認事項と再確認日を残す。新規v4 runの送信キューには`pursue`・文章窓口・営業理由・レビュー済み文面が必要。
- 送信済み、後から判明した過去の送信、窓口単位の送信不可、事業者単位の営業見送りを別結果として保存する。文面差し戻しは送信不可にしない。過去の送信不可理由を勝手に見送りへ変換しない。実際の送信・返信・商談等を自動で推測しない。
- 送信キューのチェックだけを仕分ける場合は、`settle-queue`で事前確認してから`--apply`する。`summarize`は候補・キューを再生成するので単なる仕分けには使用しない。未仕分けチェックがある間は再生成を拒否する。

## 正本

- `SPEC-v4.md`: 新規runの現行仕様。`SPEC.md`は既存v3 runの仕様。
- `.claude/skills/web-sales/SKILL.md`: 実行入口。
- `schemas/workflow-v4.md`: 新規runの4工程・結果管理。旧`schemas/workflow.md`はv3用。
- `schemas/data-model-v4.md`: v4追加軸。旧`schemas/data-model.md`はv3用。
- `schemas/worker-handoff-v4.md`: v4 worker返却契約。旧`schemas/worker-handoff.md`はv3用。
- `schemas/outreach-guide.md`: 個別化と営業文規約。
- `config/web-sales.json`: 調整可能な運用値。
- `scripts/web-sales-store.mjs`: 保存、重複除去、既存lead照合、集計、検証。
- `scripts/capture-site.mjs`: デスクトップ・スマートフォンの表示証拠取得。

## 保存と旧データ

新規runは `research/market-runs/<run-id>/` にv4として保存する。旧v3 run、`research/leads/`、`research/runs/`はSkill改修だけで再調査・再生成しない。既存runへ新資格判定を自動適用せず、送信済み履歴を保全する。

単純な集計、重複除去、状態更新、保存、並べ替え、既存lead照合はスクリプトで行う。AI workerは探索、視覚判断、個別事実、提案タイプ、優先度、営業文、事実確認を担当する。

探索件数をAgentから手で転記しない。route情報付きimportで追加件数を自動記録する。後から確実な重複が判明した場合もexcludedにせず、`merge-duplicates`で統合する。partial再開時は`resume`で前回のstop reasonを消してから続ける。
