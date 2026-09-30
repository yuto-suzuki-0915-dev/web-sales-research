# 公式サイト確認済み事業者のtriage指示（美容室・サロン / 尼崎市）

入力JSON配列の各要素は公式サイト確認済み事業者（lead_id, name, address, industry, business_status, org, website_url, channels, visual{status, desktop_png, mobile_png, ...}）。

## 手順
1. 各事業者の `visual.desktop_png` と `visual.mobile_png`（絶対パスのPNG）をReadで見て、トップページのデスクトップ/スマホ表示を浅く確認する。観点: レイアウト、余白、文字、写真、情報階層、予約・問い合わせ導線、明確な古さ、極端な簡素さ。
2. 画像が無い/読めない/エラーページ(404・DNS失敗等)の場合は visual=unverified 扱い、renewal=undetermined。それだけで recheck にしない。
3. 注意: スマホ画像は全サイトで「右端が切れて見える」ことが多く、取得時の幅の問題(アーティファクト)の可能性が高い。右端切れだけを刷新根拠にしない。デスクトップ画像・情報設計・導線・古さ等を主根拠にする。
4. renewal: large=明確な営業材料が1つ以上あり制作例を見せた提案が自然 / medium=利用可能だが提案余地あり / small=十分整っており営業理由が弱い / undetermined=視覚情報不足。
5. lead.status は candidate が既定。除外は「閉業/実態なし/対象業種外(美容と無関係)/制作会社/提案余地がほぼなく別理由もない/本部一括管理で店舗独自の施策・問い合わせが一切ない」等の明確な場合のみ。チェーン名だけでは除外しない(店舗ページ・独自SNS・電話・フォームがあれば候補に残す)。予算・意欲・担当者不明は理由にしない。
6. priority(high|medium|low): 営業順のみ。renewalが大きく窓口が明確ならhigh寄り、標準=medium、整っていて営業理由が弱い/チェーン支店=low。
7. proposal_type: renewal(サイト刷新) / new_site / mobile_fix / reservation_lp / other から選ぶ。
8. 検索は行わない(WebSearch上限到達済み)。

## 返却形式（説明文なし、1事業者1行のパイプ区切りテキストのみ。コードブロック可）
lead_id|renewal(large|medium|small|undetermined)|status(candidate|excluded)|priority(high|medium|low|-)|proposal_type|desktop観察(20〜50字、見た事実のみ)|mobile観察(20〜50字)|理由(候補/除外の理由を;区切りで1〜2個)

- lead_idは必ず入力のものをそのまま。全件を1回ずつ。本文にパイプ文字は使わない。
- 確実な重複(同一店舗の表記揺れ)があれば最後に「DUP: primary_lead_id|duplicate_lead_id;...|理由」の行を返す。確信がなければ返さない。
