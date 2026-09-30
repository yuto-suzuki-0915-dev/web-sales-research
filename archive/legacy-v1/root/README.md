# Web Sales Research

Web改善に対価を払う合理性がある事業者を、公開情報と反証から調べるClaude Code用プロジェクト。有望0件も正常です。最終的な営業判断は人間が行います。

## 開始

```powershell
Set-Location 'C:\Users\suzuy\web-sales-research'
claude
```

```text
/research-redesign 尼崎市のパーソナルジム。初期確認10社まで、詳細監査3社まで。有望0件でもよい。既存予約媒体だけで十分かも確認する。
```

親が最初にrunを保存し、調査を読み取り専用のworkerへ委任します。最初の1社を親が保存・再読してから、残りを最大3社ずつ初期確認し、詳細監査は1社ずつ進めます。初回の保存が拒否されたら検索前に止まります。

ほかの入口:

```text
/research-demand 大阪府の工務店。直近6か月の新拠点・新サービスを入口に、初期確認15社、詳細監査5社まで。
/research-value-gap 大阪市のフォトスタジオ。価格・サービス・既存接点から調べ、初期確認10社、詳細監査3社まで。
/audit-lead <事業者名> <所在地または公式URL> 料金確認から予約までの導線と、サイト改善が不要な可能性を確認する。
/audit-lead research/leads/<lead-id>.md 現在の根拠を再確認し、前回からの変更点も記録する。
/draft-outreach https://example.com この事業者の営業適性をA/B/Cで判定し、送信前の初回営業文を1案作る。
/draft-outreach research/leads/<lead-id>.md 保存済みの調査根拠から初回営業文を作る。
```

山括弧は実際の名前/URL/保存先に置き換えます。引数は自然文です。地域未指定は大阪府、初期確認20社・詳細監査5社がrun全体の既定上限です。有望件数のノルマではありません。

`/draft-outreach` は既存leadを先に探し、現在の詳細監査が十分なら再検索せず利用します。leadがない、古い、固有事実や反証が不足する場合だけ、既存のAudit手順で1社を調査・保存してから文章化します。A/Bにできない場合はCとして営業文を無理に生成しません。草案の作成だけを行い、DMやフォームへの送信はしません。

## 調査結果の読み方

runの冒頭は人間向けの「営業ビュー」、その下は再利用用の詳細台帳です。調査判定（有望/保留/除外）は従来どおりで、営業アクション（営業候補/追加確認/見送り寄り/営業対象外）と提案タイプを別に表示します。保留でも具体的な不足がある企業と現状維持が有力な企業を区別できます。

提案タイプは情報修正、軽微改修、部分リニューアル、全面リニューアル、新規サイト、LP、なしから第一候補を示します。情報修正・軽微改修で足りる場合にリニューアルへ広げません。条件付きの案は発注/営業連絡の推奨ではなく、人間が次の判断をする材料です。定義と判定基準は `schemas/research-guide.md` に集約しています。

## 保存エラーが出た旧版からの再実行

旧版で `Subagents should return findings as text, not write report files` が出た場合は、Claude Codeを一度終了し、上記ディレクトリで起動し直して同じSkillを入力してください。旧workerへ「保存を許可する」と伝えて再開する必要はありません。

改修後はSkillを親で実行し、**親がsummaryとleadを保存、Subagentは調査して根拠を返す**分担です。保存制限の解除、ファイル名の変更、Bashへの切り替えに依存しません。

同じ文言とレポート名による書込拒否は[公式リポジトリのIssue #44657](https://github.com/anthropics/claude-code/issues/44657)にも報告されています。これは利用者報告であり、すべての環境の制限範囲や解除方法が確認されたわけではありません。

前回1ファイルも保存できなかった場合は新規runとして開始します。検索に出ただけの名前は未検証の手掛かりとして再利用できますが、観測事実/調査件数にはしません。

中断時にsummaryが保存されていれば、親へ次のように依頼できます。

```text
research/runs/<run-id>/summary.md の未完了調査を再開して。親が保存し、調査はresearch-workerへ委任して。保存済みの条件と台帳を維持して。
```

## 構成

```text
CLAUDE.md                         親とworkerの境界、不変のルール
.claude/skills/                    親で実行する4つの調査入口と営業文作成入口
.claude/skills/draft-outreach/     保存済み根拠からA/B/C判定と初回営業文を作る入口
.claude/agents/research-worker.md  読み取り専用の調査担当
schemas/research-workflow.md       親の委任・保存・再開手順
schemas/research-handoff.md        workerが返す保存用データの契約
schemas/research-guide.md          共通判定・証拠・再利用規約
schemas/outreach-guide.md          A/B/C判定と営業文の共通規約
schemas/lead.md                    事業者正本のテンプレート
schemas/run-summary.md             run台帳のテンプレート
research/leads/                    有望・保留・除外の全事業者正本
research/runs/                     runごとの条件・件数・当時の判定
```

検索結果全文、ページ全文、思考過程はworker内に留まります。ただし**保存に必要な選別済みの根拠は親へ戻ります**。保存先だけを返す完全分離ではありません。初期確認最大3社・詳細1社ごとの返却と逐次保存で量を抑えます。ユーザーへの最終報告は短いままです。

親はRead/Glob/Grep、Write/Edit、Agentを、workerはRead/Glob/Grep、WebSearch/WebFetchを使用します。通常の認証とツール許可が必要です。親でも保存を拒否された場合は、未保存対象とエラーを報告して止まります。必須MCP、権限回避設定、別の保存用Agentは導入していません。

workerのWeb取得はテキスト中心です。Maps/SNSの取得制限、スマホ表示、タップ、実流入・予約完了は不明/未検証となる場合があります。取得失敗をサイトの欠陥にしません。

同じresearchでの調査は1回ずつ実行してください。判定変更でもleadは移動せず、証拠ID・確認日・履歴・人間のメモを保持します。営業前には証拠と最大の反証を確認してください。

参照: [公式Skills仕様](https://code.claude.com/docs/en/skills)、[公式Subagents仕様](https://code.claude.com/docs/en/sub-agents)。
