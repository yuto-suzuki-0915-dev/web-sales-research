import sys
sys.path.insert(0, 'research/market-runs/nishinomiya-eikaiwa-juku-20260930/work')
from mk import *

M = "https://www.mapion.co.jp/phonebook/M11022/28204/"
M10 = "https://www.mapion.co.jp/phonebook/M11010/28204/"
EK = "https://www.ekiten.jp/g0408/a28204/"
EK2 = "https://www.ekiten.jp/g0408/a28204/?page=2"
EK9 = "https://www.ekiten.jp/g0409/a28204/"
JM = "https://jyukumado.jp/hyogo/ct-28204"
JN = "https://www.jyukunavi.jp/search/?pref=28&city=28204"
KB = "https://kodomo-booster.com/prefectures/hyogo/cities/28204/categories/english"

# ---- batch 03 ----
b03 = [
 rec("lead-1b2357ba85","uncertain","moderate","defer","教室住所が芦屋・甲南山手・芦屋川で西宮市内教室が未確認。次の確認: Segment該当(西宮市内に教室があるか)。サイトは古い無料ホスト風","トップに2026年度入試合格実績(NEW)と貸しスペース案内の掲載。更新日は未確認","https://wwb.jp/sakuranomori2008/","desktopで緑ヘッダー+左メニュー+赤青の色文字が多い長文の旧来構成。所在地は芦屋・甲南山手・芦屋川で西宮は未記載","https://wwb.jp/sakuranomori2008/","https://wwb.jp/sakuranomori2008/",vis="verified"),
 rec("kibou-9f7c0964be","active","none","stop","トップは訴求・導線が整理され、目立つWeb上の提案余地は今回の浅い観察では見当たらない。今回は深掘りしない","トップに2学期からの募集、昼間学習支援コース開講中、先着10名限定募集の掲載","https://jukukibou.biz/","大型バナーで訴求が明確。教室外観写真あり。門戸厄神から徒歩8分、西宮市上大市エリアの記載","https://jukukibou.biz/","https://jukukibou.biz/",vis="verified"),
 rec("education-8600f0a28e","uncertain","moderate","advance","個人運営とみられる少人数塾。Wix無料テンプレ風でストック写真のみ、導線・情報整理に改善余地の可能性。営業状態は要確認","トップにFacebook開始のお知らせあり。更新日不明で営業中の断定材料は弱い","https://education20180201.wixsite.com/education","Wix広告バナーが表示されストック写真が中心。メニューに料金・アクセス・問い合わせあり","https://education20180201.wixsite.com/education","https://education20180201.wixsite.com/education",vis="verified"),
 rec("lead-3fb57dad2f","uncertain","moderate","advance","女性講師による個人運営の教室(苦楽園・甲陽園、西宮市内)。サイトは素朴で情報階層・導線に整理余地の可能性","教室案内に苦楽園・甲陽園教室、電話、月〜土9-21時の受付、24時間メール受付の記載。更新日は未確認","https://www.atama-te.com/","水色背景+子供写真コラージュの簡素なテンプレート型。左サイドに連絡先が小さく並ぶ。予約フォームへの導線は文字リンク中心","https://www.atama-te.com/","https://www.atama-te.com/",vis="verified"),
 rec("lead-ea5aa86638","active","none","stop","西宮・大阪上本町・東京自由が丘の3拠点で独自教材の制作・販売やYouTube発信もある法人規模。個人・小規模Segmentとの適合が弱くサイトも整っている。今回は深掘りしない","YouTube動画・塾長ブログ・SNSリンクあり。西宮校は甲風園のワークステージ西宮3F","https://www.edu-pa.jp/","3カラム紹介、教室一覧、FAQ、問い合わせメニューが整理済み","https://www.edu-pa.jp/","https://www.edu-pa.jp/",vis="verified"),
 rec("lead-bb3cff595c","active","none","stop","堺・高槻・西宮の複数拠点でセミナー開催など発信が活発。サイトはデザイン・情報整理とも整っており、今回は深掘りしない","NEWSに2026.07.08と2026.06.29のセミナー報告あり","https://learnmate.me/","統一感のあるイラスト型トップ、NEWS、Instagramリンク、MENUを備える","https://learnmate.me/","https://learnmate.me/",vis="verified"),
 rec("lead-2185996777","active","none","stop","小・中・高、フリースクール、高等学院を展開しYouTube・SNSの公式アカウントを持つ運営規模。個人・小規模の想定から外れる可能性が高く、サイトも整っている。今回は深掘りしない","電話・営業時間の掲載、阪大合格実績の告知、夏・冬講習の案内バナーあり","https://advance-corporation.com/","学年別メニュー、資料請求ボタン、SNSリンク、スライダーを備える整理された構成","https://advance-corporation.com/","https://advance-corporation.com/",vis="verified"),
 rec("lead-5dc4c76218","active","unknown","defer","稲葉谷珠算教室のサイト内ページ。珠算が主体だが英語教室・算数教室の別ページがありSegment適合と所在地(西宮市内か)が未確認。次の確認: 教室情報ページで所在地と英語・算数教室の実施有無","トップのEventに2026.08.30の日付あり。LINE公式アカウントの案内もある","https://www.inasoro.com/","メニューに英語教室・算数教室・教室情報・お問い合わせ。Cookieポップアップが画面を覆い下部構成は確認できず","https://www.inasoro.com/","https://www.inasoro.com/",vis="verified"),
 rec("english-savvy-english-savvy-abb3baaf6e","active","none","stop","西宮市越水町の小規模英会話教室。トップは整理されており電話・Mail・LINE・Instagramの導線も揃い、浅い観察では提案余地が薄い。今回は深掘りしない","教室写真、イベント・料金表・アクセスのメニュー、電話・LINE・Instagram導線あり。住所は西宮市越水町6-12 2F","https://englishsavvy.jp/","レスポンシブ対応とみられる明快なヒーロー、教室写真、CTAが整理済み","https://englishsavvy.jp/","https://englishsavvy.jp/",vis="verified"),
 rec("lead-a0473d79ef","active","moderate","defer","本校は神戸市東灘区で西宮夙川教室の実在・住所が未確認。サイトは古めのテンプレート型で改善余地の可能性はあるが、Segment(西宮)適合を先に確認。次の確認: 教室案内ページで西宮夙川教室の住所","電話・営業時間、無料体験レッスン受付中、グリーコーラス講座の告知あり","https://www.rkxenglish.com/","カラフルな旧来型レイアウトで画像バナーと動画を縦に並べる構成。体験申込ボタンあり","https://www.rkxenglish.com/","https://www.rkxenglish.com/",vis="verified"),
 rec("lead-4e7af58b4c","active","none","stop","「ドレミインターナショナルスクール」の一校舎で複数校ブランドの可能性。保育園・プリスクールで英会話教室Segmentの中心から外れ、サイトも整っている。今回は深掘りしない","スタッフ募集・お問合せ・資料請求の導線、保育無償化対象の掲載あり","https://www.perapera-school.com/","整ったデザイン、ブログ、FAQ、料金、アクセスのメニューあり。浜学園グループ講師による授業の記載","https://www.perapera-school.com/","https://www.perapera-school.com/",vis="verified"),
 rec("little-clover-764a5a7e0d","uncertain","moderate","advance","幼児〜小6のさんすう教室で小規模とみられる。トップのスライダーが空の緑一色で表示され情報整理・導線に改善余地の可能性。営業状態は要確認","メニューにクラス紹介・レッスン料金、体験レッスン・お問合せ、ブログあり。更新日は未確認","https://littleclover.net/","desktopのファーストビューでスライダー領域が緑の空白のまま表示され画像が出ていない","https://littleclover.net/","https://littleclover.net/",vis="verified"),
 rec("lead-aeb99b23e1","uncertain","unknown","advance","武庫川団地の地域密着型の個人塾で塾長ブログあり。視覚画像がなく見た目は未評価だが追加確認で判断が変わり得る","公式サイトと塾長ブログの存在のみ。更新日は未確認","http://ishinjuku.com/","desktop・mobile画像が無く視覚判断不可","http://ishinjuku.com/","http://ishinjuku.com/"),
 rec("anne-6c720b6946","uncertain","moderate","advance","子供向け英会話の個人教室とみられる。電話・無料体験申込の導線はあるが旧来型の構成で情報整理に余地の可能性。営業状態は要確認","電話番号、無料体験レッスン申込ボタン、お客様の声・Q&A・アクセスのメニューあり。更新日は未確認","https://www.1anne.jp/","大きな写真と緑基調のフォント・配色が古めのテンプレ調。desktopでは読みやすいがmobile未確認","https://www.1anne.jp/","https://www.1anne.jp/",vis="verified"),
 rec("nature-house-international-c-581bc51436","active","moderate","advance","西宮市のアフタースクール型の英語・国際教育クラブで小規模の可能性。募集要項は更新されているがトップは色・文字重なりが目立ち情報整理に余地の可能性。英語が主か自然体験が主かは追加確認","トップに2026年10月度生募集要項、2026 NEW AUTUMN CAMP、LINE追加で体験会5000円Offの記載","https://www.naturehouseinternational.com/","黄色背景に薄い緑の文字で視認性が低い。ヒーロー画像上に文字が重なる。チャットウィジェットあり","https://www.naturehouseinternational.com/","https://www.naturehouseinternational.com/",vis="verified"),
 rec("555-7731baeb78","active","strong","advance","西宮北口・伊丹・塚口の小規模3校。入会金キャンペーンが2026/10/24までで営業中。トップは強い原色背景・全面ポップアップ・電話中心の告知で、古い作りの観察がある","入会金半額キャンペーンが2026/10/24(土)までと表示。無料体験レッスンの案内あり","https://www.555eikaiwa.com/","マゼンタ・水色・緑など強い原色ブロックと蛍光背景、ストックの人物写真ポップアップが画面中央を覆う。電話番号が中心でフォーム導線はトップで未確認","https://www.555eikaiwa.com/","https://www.555eikaiwa.com/",vis="verified"),
 rec("lead-a95129812c","active","moderate","advance","甲子園校1教室、中学・高校受験の集団授業と個別指導シリウス。9月入塾生募集の告知があり営業中。運営規模は要確認だが情報階層に整理余地の可能性","トップに9月入塾生大募集、無料体験授業実施中、電話番号と受付時間の掲載あり。住所は甲子園浦風町19-4","https://e-rikkyo.jp/","大きな外観写真が中心で立教学習院とシリウスの2ブランドがメニューに混在。写真に文字が重なる。メニュー・電話・お問い合わせ導線は揃っている","https://e-rikkyo.jp/","https://e-rikkyo.jp/",vis="verified"),
 rec("lead-2c717e6817","uncertain","unknown","advance","西宮駅近くの日本人講師によるプライベート英会話の小規模教室。公式サイトを検索で発見(Jimdo)。画像未取得のため見た目は未評価","検索結果に住所(西宮市本町10-2)、電話、西宮駅徒歩4分の記載。最新更新日は未確認","https://stella-e.jimdofree.com/","Jimdo無料プランのURL。画像取得は未実施のため見た目は未確認","https://stella-e.jimdofree.com/","https://stella-e.jimdofree.com/"),
]
save("triage-03-out.jsonl", b03)

# ---- batch 04 ----
b04 = [
 rec("lead-50e6df64e4","uncertain","unknown","advance","公式サイトあり。地域の個人・小規模英会話教室と見られサイト内容の確認で提案余地を判断できる","公式サイトJETS ACADEMYと所在、電話が掲載。最近の更新は未確認","http://www.jetsacademy.org/","サイトの存在のみ確認。画像未確認","http://www.jetsacademy.org/","http://www.jetsacademy.org/"),
 rec("abc-d692573317","active","unknown","advance","公式サイトあり、教室情報・講習ページが整備された小規模英語塾(西宮北口/大阪中津の2教室)","公式サイトに春期講習ページ・コース・教室情報が掲載。西宮北口教室は甲風園1-11-14野村ビル3階","https://abci.co.jp/campus","画像未確認。サイト存在のみ確認","https://abci.co.jp/","https://abci.co.jp/"),
 U("lead-6dc30253f7","defer","楽器店のミュージックサロンで英会話教室か不明、公式サイト未確認。次の確認: 英会話コースの実在と店舗公式ページ","https://www.navitime.co.jp/around/category/poi?node=00116429&category=0103009001&from=sp.around.related.category",oa="NAVITIME一覧のみ。英会話提供の裏付けなし"),
 rec("lead-ec8f635c47","active","unknown","advance","西宮市常磐町の小規模塾(定員8名)でJimdoの簡易サイトあり。サイト内容の確認で提案余地を判断できる","塾ナビ・エキテンに2024年の口コミ、常磐町1-33","https://www.jyukunavi.jp/detail/119216.html","Jimdo無料プランのHPが存在。画像未確認","https://oomichigakuenn.jimdofree.com/","https://oomichigakuenn.jimdofree.com/"),
 rec("lead-bcef0c077e","active","unknown","advance","西宮駅前の地域集団塾で公式サイト・LINE公式あり。サイト確認で提案余地を判断できる","エキテン・Yahooマップ掲載、田中町5-10 NSビル2階","https://www.ekiten.jp/shop_6564172/","公式サイトあり。画像未確認","https://aire-nishinomiya.com/","https://aire-nishinomiya.com/"),
 rec("lead-8aa721e2d7","active","unknown","advance","2018年開設の西宮・甲子園2教室の地域進学塾で公式サイトあり","公式サイトに西宮本部校(田中町5-20)と甲子園校、LINE公式あり","https://www.hanshin-academy.jp/","画像未確認","https://www.hanshin-academy.jp/","https://www.hanshin-academy.jp/"),
 rec("lead-bdea8f8bea","active","unknown","advance","2002年開校の地域密着塾で公式サイトあり。複数校運営の可能性はあるが小規模地域塾として維持し規模と提案余地を追加確認","公式サイトに情報更新ページあり、阪神西宮駅徒歩3分","https://advance-corporation.com/information/","画像未確認","https://advance-corporation.com/","https://advance-corporation.com/"),
 CH("ecc-c286381b05", "ECCベストワン", M),
 CH("lead-3368b45790", "ノーバス", "https://hyogo.nohvas-juku.com/nishinomiya/"),
 CH("lead-106ac36231", "フリーステップ", M),
 rec("lead-55a4a33413","active","unknown","advance","個人運営と見られる大学受験英語の個別指導塾で公式サイトあり。小規模で提案余地の確認価値あり","塾ナビ・エキテン等に掲載、分銅町4-15、料金体系記載","http://www.matsumoto-semi.com/","公式サイトはhttp表記。画像未確認","http://www.matsumoto-semi.com/","http://www.matsumoto-semi.com/"),
 rec("lead-f6da40ac6c","active","unknown","advance","約20席の小規模個別塾で公式サイトあり(http)。電話が立教学習院JR西宮教室と共通のため重複可能性あり(統合せず)","塾ナビ・エキテン・まいぷれに掲載、松原町9-5","http://www.sirius-nishinomiya.com/","サイトあり、画像未確認","http://www.sirius-nishinomiya.com/","http://www.sirius-nishinomiya.com/"),
 rec("jr-0065eb0833","uncertain","unknown","advance","甲子園の地域密着塾(44年)の教室。公式サイトあり。JR西宮教室の実在・現況とシリウスとの電話・住所重複の確認が必要","Mapion・goo地図にJR西宮教室が松原町9-5で掲載。同番号・同住所がシリウス。別教室か情報混在か不明","https://www.mapion.co.jp/phonebook/M11009/28204/22830815170/","本校サイトe-rikkyo.jpあり。画像未確認","https://e-rikkyo.jp/","https://e-rikkyo.jp/"),
 rec("ss-1b3fd5b3d6","active","unknown","defer","複数校展開の個別指導ブランド(ss-zemi.com)で小規模独立性が不明。次の確認: 運営規模と校舎単位の独自運営余地","公式サイトに東夙川校の講座案内あり、西田町1-2 N's Shukugawa Building 2F","https://ss-zemi.com/","ブランド共通サイト。画像未確認","https://ss-zemi.com/","https://ss-zemi.com/"),
 rec("lead-5cb15b0425","active","unknown","defer","甲東園本部の複数教室展開で規模不明。教室独自の公式サイトは未発見。次の確認: 本部サイトの教室ページと運営規模","エキテン・塾ナビ・求人掲載、石在町15-26、QUREOプログラミング併設","https://www.ekiten.jp/shop_1130852/","独自サイト未確認","https://www.ekiten.jp/shop_1130852/"),
 CH("ie-95435bd265", "スクールIE", M),
 CH("ie-e65afa3760", "スクールIE", M),
 rec("lead-2337ee8c30","uncertain","unknown","stop","パーソナル学習会は大阪・兵庫・奈良に100校以上のアップ学習会系列で大規模チェーン/FC扱い","塾ナビ等に教室掲載。100校以上展開のグループ","https://jukushiru.com/schools/2692","グループ共通サイトのみ","https://personalsupport.co.jp/school/%E9%98%AA%E7%A5%9E%E8%A5%BF%E5%AE%AE%E6%95%99%E5%AE%A4/",None,"100校以上の大規模チェーン(アップ学習会グループ)でSegment対象外 出典: https://jukushiru.com/schools/2692"),
]
save("triage-04-out.jsonl", b04)

# ---- batch 05 ----
def chain(lid, name, url):
    return rec(lid, "active", "none", "stop", name + "は全国展開チェーン/FCでSegment対象外", "本部サイトに校舎ページあり", url, "本部が運営するページ", url, None,
               "大手/全国チェーン(%s)の校舎でSegment対象外 %s" % (name, url))

b05 = [
 U("lead-a0e7eb1c01","defer","個別指導塾として掲載あり。公式サイト未特定(we-progress.jpは同一事業者か不明)。次の確認: 同一事業者か、独自サイトの有無","https://www.jyukunavi.jp/detail/107220.html",act="active",oa="石在町の個別指導塾として口コミサイト・エキテン等に掲載"),
 U("lead-1d2b2b1868","defer","電話帳掲載のみで公式サイト・活動根拠が出ない。次の確認: 地図/SNSでの営業状況",M,oa="Mapion一覧のみ。名称検索でも情報なし"),
 rec("lead-95275c6347","active","unknown","advance","香櫨園・浜脇の小規模個別指導塾で公式サイトあり。トップ画像なしのため後続でサイト確認","公式サイトで創立13年・地元向け個別指導塾と記載","https://lactarius.net/","公式サイト存在を確認。Web上の差は未判定","https://lactarius.net/","https://lactarius.net/"),
 U("lead-0a8d8a5cf7","defer","久保塾(複数校舎)と同一か不明。次の確認: 同一事業者か、規模が小規模か","https://jukulog.jp/page/98438",oa="塾ログに久保進学塾として掲載。関連する久保塾は御影・夙川等で複数校展開",ow="kubojuku.co.jpが同一事業者か未確定のため公式サイト未確定"),
 U("lead-2cd7d3a285","defer","宮前町の個人系進学塾でロボット教室併設。独自サイト未発見。次の確認: 独自サイトの有無","https://jukulog.jp/page/100477",act="active",oa="塾ログ・エキテン・Yahoo!ロコ掲載、ヒューマンアカデミーロボット教室を併設"),
 U("lead-1e8107b35e","defer","1976年創業の地域塾。伸学社加盟校ページのみ確認、独立運営か不明。次の確認: 独自サイトと運営規模","https://www.syogakusya.co.jp/V01_VIEW/sankajuku/nishinomiya_risuushingakusya.html",act="active",oa="津門大塚町の地域塾。伸学社ページに教室情報"),
 rec("lead-4ef37e350d","active","unknown","advance","柳本町の個人塾で公式サイト(講師募集ページ)あり。トップ画像なしのため後続でサイト確認","公立高校受験向け個別指導塾、公式サイトに講師募集ページあり","https://yoshimoto-juku.com/","公式サイトの存在のみ確認","https://yoshimoto-juku.com/","https://yoshimoto-juku.com/"),
 U("lead-52bd987e96","stop","個別指導イールートはFC校舎名の可能性が高く個人・小規模でない見込み。詳細未確認のため除外は確定しない",M,oa="Mapion掲載のみ。校名表記からFC校舎と推定"),
 rec("lead-32bd2fbba8","active","none","stop","開進館(アップ教育企画)は関西展開の大手塾でSegment対象外","アップ教育企画が西宮市内で複数校舎を運営","https://www.kaishinkan.net/school/nishinomiya/","本部が公式サイトを運営","https://www.kaishinkan.net/school/nishinomiya/",None,"大手塾チェーン(開進館/アップ教育企画)の校舎でSegment対象外 https://www.kaishinkan.net/school/nishinomiya/"),
 U("lead-b1e91b8a24","defer","コア式教育法の教室で運営形態不明。Instagramあり、独自サイト未確認。次の確認: 教室ごとの独自運営か","https://kodomo-booster.com/prefectures/hyogo/cities/28204/categories/english",oa="香櫨園駅徒歩7分、小〜高校生対象の英語教室として掲載"),
 chain("lead-74eb2035b3","アミティー","https://www.amity.co.jp/school/kansai/hyogo/nishinomiya-shukugawa/"),
 chain("lead-2520f2d0a2","アミティー","https://www.amity.co.jp/school/kansai/hyogo/nishinomiya-koshien/"),
 chain("lead-e52cc90491","アミティー","https://www.amity.co.jp/school/kansai/hyogo/koutouen/"),
 chain("ecc-f578e7e1fe","ECCジュニア","https://www.eccjr.co.jp/mail_question/map_detail/map.php?id=Y29tbW9uX2lk&room_cd=MjgxNjk3"),
 chain("z-1310ac0d1c","Z会","https://www.zkai.co.jp/juku/map/z-nishinomiyakitaguchi/"),
 chain("lead-cbeade687f","松陰塾","https://showin-juku.jp/nishinomiyanaruo/"),
 chain("red-7bef318473","自立学習塾RED","https://www.jiritsu-red.jp/school/naruo/"),
 chain("ie-814045e349","スクールIE","https://www.schoolie-net.jp/classrooms/detail/255/"),
]
save("triage-05-out.jsonl", b05)
