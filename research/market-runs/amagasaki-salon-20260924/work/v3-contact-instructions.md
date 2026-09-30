# 文章連絡窓口の調査（尼崎市 美容室・サロン）

サイト状態・視覚・優先度は再判定しない。文章連絡窓口の調査だけを行う。先に schemas/data-model.md の「contact channel」節を読む。

各事業者について、公式サイト（website_urlあり）のトップ・フッター・問い合わせ/ACCESSページ、公式Instagramアカウント（サイトからのリンク、または名称+尼崎で検索。同名別店に注意し、住所・店名が一致するものだけ）、公式LINEを確認し、営業連絡に使える文章窓口を具体的なURL/値で特定する。website_urlがなければ、名称+尼崎で公式サイト・Instagram・メールアドレスを追加検索する（見つからなければそのまま。不存在の証明は探さない）。known_channelsは未検証のヒントで、purpose未確認だったり表示名だけのものが多い。必ず自分で確認し直す。

判定ルール:
- email: 実在のアドレス文字列。
- contact_form: 一般問い合わせ/事業問い合わせ用途（purpose="general"または"business"）で具体的URLがあるもののみ。予約専用フォーム・ホットペッパー等の予約媒体・求人専用は含めない（type=contact_formにしない。必要ならtype=otherでpurpose="reservation"）。
- instagram_dm: 店の公式アカウントと確認できたもの。value は "@handle"。
- official_line: 店の公式LINE（lin.ee等のURL）。個人LINEや「LINE友だち追加」という表示文字だけのものはvalueに入れない。
- phone: 電話番号（official=true）。
- 営業禁止・営業お断り・業者からの連絡お断りの記載があれば、その窓口に sales_prohibited=true。
- 本部（チェーン本社）の総合窓口しかなく店舗独自の窓口がない場合は、noteに「本部窓口」と明記し、その窓口のofficial値はtrueのままにする。
- 確認できなかった窓口は含めない。推測しない。

各事業者につき1行のJSONLだけ返す（説明文・コードフェンス不要）。形式:
{"lead_id":"...","contact_research_status":"completed","channels":[{"type":"email|contact_form|instagram_dm|official_line|phone|other","value":"...","official":true,"purpose":"general|business|reservation|null","sales_prohibited":false,"source_url":"確認したURL","checked_at":"2026-09-26"}],"note":"20字以内の補足(任意)"}
入力の全件を返すこと。調査が完全にできなかった場合は contact_research_status を "pending" にし、理由をnoteへ。

## 出力（general-purpose worker用）
JSONLは返信に貼らず、Writeツールで `work/v3-contact-out-<NN>.jsonl`（NNは入力ファイル v3-contact-in-<NN>.json と同じ番号）へ書き込む。入力の全lead_idを1行ずつ含める。書き込み後、返信は「NN: 件数, completed件数, pending件数」の1行だけ。
検索(WebSearch)が上限等で使えない場合でも、WebFetchでInstagram・公式サイト・媒体ページを直接確認できるものは確認する。確認手段が尽きて調べ切れなかったものだけ "pending" とし、note に理由を書く。電話番号だけ確認できて、公式サイト・SNSの調査をやり切った場合は "completed"。
