import sys
sys.path.insert(0, 'research/market-runs/nishinomiya-eikaiwa-juku-20260930/work')
from mk import *

M = "https://www.mapion.co.jp/phonebook/M11022/28204/"
M10 = "https://www.mapion.co.jp/phonebook/M11010/28204/"
EK = "https://www.ekiten.jp/g0408/a28204/"
EK2 = "https://www.ekiten.jp/g0408/a28204/?page=2"
EK4 = "https://www.ekiten.jp/g0408/a28204/?page=4"
EK6 = "https://www.ekiten.jp/g0408/a28204/?page=6"
EK9 = "https://www.ekiten.jp/g0409/a28204/"
JM = "https://jyukumado.jp/hyogo/ct-28204"
JS = "https://www.jyuku-search.com/search/?city=28204"
JL = "https://jukulog.jp/hyogo/A1295/list"
JN = "https://www.jyukunavi.jp/search/?pref=28&city=28204"
JN2 = JN + "&page=2"
JN3 = JN + "&page=3"
JN4 = JN + "&page=4"
KB = "https://kodomo-booster.com/prefectures/hyogo/cities/28204/categories/english"

# ---- batch 06 ----
b06 = [
 CH("lead-5cc79b0b23", "武田塾", "https://www.takeda.tv/nishinomiyakita/"),
 rec("nkt-ef0c1efa03","active","unknown","advance","西宮市内に本校(甲子園二番町)と学文校を持つ地域密着の進学塾で公式サイトあり。視覚確認は未実施のためWeb上の提案余地を追加確認する価値あり","塾ナビ・塾選等に2026年度の合格体験記と口コミ。学文校と本校の2校を確認","https://bestjuku.com/shingaku/experience/26237/","公式サイト nkt-juku-web.com を検索結果で確認。画像が無く視覚確認は未実施","https://nkt-juku-web.com/","https://nkt-juku-web.com/"),
 U("skyhouse-english-academy-a9ed3e31a4","defer","個人・小規模の英会話教室で2022年設立とされる。公式サイトは未発見で店舗会サイトの紹介ページのみ確認。次の確認: 独自サイト/SNS","https://ksm.kurakuen.info/skyhouse-english-academy/",oa="苦楽園の店舗会サイトに紹介ページあり(講師紹介、2022年設立、子ども・大人向け)。営業中の断定材料は不足",ow="独自の公式サイトは未確認。第三者ページのみ"),
 U("lead-24d4e3c37f","defer","ラボ・パーティはテューター個人の教室が単位。教室固有の公式サイトは未発見。次の確認: 教室個別サイトまたはSNSの有無",KB,oa="口コミ集約サイトの掲載のみ"),
 U("lead-25a3cc3a0c","defer","ラボ・パーティのテューター教室(鳴尾)。教室固有サイトは未確認。次の確認: 独自サイトと運営者の有無",KB,oa="口コミ集約サイトの掲載のみ"),
 U("lead-7a0923d8ef","defer","ラボ・パーティの会場(大社町)。教室固有サイトは未確認。次の確認: 独自サイトと運営者の有無",KB,oa="口コミ集約サイトの掲載のみ"),
 U("lead-9bbfff647f","defer","ラボ・パーティのなるお会館教室(鳴尾町)。教室固有サイトは未確認。次の確認: 独自サイトと運営者の有無。lead-25a3cc3a0cと同一教室の可能性はあるが確実ではない",KB,oa="口コミ集約サイトの掲載のみ。住所は鳴尾町3-8-7"),
 rec("english-d2c0f288fb","active","none","stop","はまキッズEnglishは浜学園系の複数教室ブランドで西宮北口駅近くのビル5F。大手系チェーン校舎と判断し今回は深掘りしない","コース一覧・料金情報と多数の口コミ。住所は甲風園1丁目4番5号 ハマ・ブリーゼ西宮北口ビル5F","https://kids-school.msta.co.jp/schools/2324429321/courses","教室ページは本部・ポータル上にあり独自運営の余地は確認できない","https://kodomo-booster.com/schools/224522",None,"大手系チェーン教室(はまキッズEnglish)でSegment対象外。出典: https://kodomo-booster.com/schools/224522"),
 U("ytj-kids-2c83bf1977","defer","ユースシアタージャパンの西宮スタジオで英語劇・演劇系の複数教室ブランドの可能性。規模と英会話が主かは未確定のため保留。次の確認: 運営規模と公式ページ",KB,oa="口コミ集約サイトの掲載のみ"),
 rec("kids-duo-290b09c4e0","uncertain","unknown","stop","Kids Duoは全国展開のFC教室でSegment対象外","本部サイトの教室ページ(classrooms/detail/3165)のみ","https://www.kidsduo.com/classrooms/detail/3165/","独自サイト無し。評価対象外","https://www.kidsduo.com/classrooms/detail/3165/",None,"大手全国FC(Kids Duo)でSegment対象外。出典: https://www.kidsduo.com/classrooms/detail/3165/"),
 rec("kids-duo-7eaac4f98e","uncertain","unknown","stop","Kids Duoは全国展開のFC教室でSegment対象外","口コミ集約サイトの掲載のみ",KB,"独自サイト無し。評価対象外","https://www.kidsduo.com/",None,"大手全国FC(Kids Duo)でSegment対象外。出典: https://www.kidsduo.com/"),
 rec("kids-duo-0b66326fec","uncertain","unknown","stop","Kids Duoは全国展開のFC教室でSegment対象外","口コミ集約サイトの掲載のみ",KB,"独自サイト無し。評価対象外","https://www.kidsduo.com/",None,"大手全国FC(Kids Duo)でSegment対象外。出典: https://www.kidsduo.com/"),
 rec("lead-35ea11a4dd","uncertain","unknown","stop","トライ式英会話は大手全国チェーン(トライ)の校舎でSegment対象外","口コミ集約サイトの掲載のみ",KB,"独自サイト無し。評価対象外",KB,None,"大手全国チェーン(トライ式英会話)でSegment対象外。出典: "+KB),
 U("ibuki-lepton-f970f6e568","defer","Leptonは個別指導塾ブランドで教室名にibukiを冠する。運営が個人・小規模か本部直営かは未確定。次の確認: 運営主体と独自サイトの有無",KB,oa="口コミ集約サイトの掲載のみ"),
 U("lepton-bd5444d59d","defer","創学舎Leptonの名塩教室。運営が個人・小規模か本部直営かは未確定。次の確認: 運営主体と独自サイトの有無",KB,oa="口コミ集約サイトの掲載のみ"),
 U("lepton-d2c18a52db","defer","木村塾Leptonの阪神甲子園教室。地域運営の小規模塾か本部直営かを未確認。次の確認: 木村塾の運営主体と公式サイト(別の木村塾Lepton教室と同一運営主体の可能性、重複ではない)",JN,oa="口コミ集約サイトと塾ナビの一覧に掲載"),
 U("lepton-394981de4a","defer","木村塾Leptonの甲東園教室。同一ブランドの複数教室で運営主体が未確認。次の確認: 運営主体と公式サイト",KB,oa="口コミ集約サイトの掲載のみ"),
 U("lepton-cc5bde246c","defer","木村塾Leptonの西宮前浜教室。同一ブランドの複数教室で運営主体が未確認。次の確認: 運営主体と公式サイト",KB,oa="口コミ集約サイトの掲載のみ"),
]
save("triage-06-out.jsonl", b06)

# ---- batch 07 ----
def lepton(lid, cid):
    u = "https://www.lepton.co.jp/class/" + cid
    return rec(lid, "active", "unknown", "stop", "木村塾Lepton複数教室でサイトはlepton.co.jpの教室別テンプレート(本部運営)。個別教室でのWeb提案余地は小さく今回は深掘りしない。恒久除外ではない",
               "公式サイトに教室ページがあり掲載中", u, "教室ページは本部共通テンプレート", u, u)

b07 = [
 lepton("lepton-c9b3901d6a", "003010"),
 lepton("lepton-aba3d26088", "003014"),
 lepton("lepton-dcbb8dfe95", "003012"),
 rec("lead-54d1c0c3c1","active","unknown","stop","株式会社iGO展開のFC型教室で公式サイトactimethod.comは本部運営。校舎単独のWeb提案余地は小さい。運営形態(FC加盟主体の規模)は未確定のためcandidate維持","2024年9月に夙川校開校のプレスリリースあり","https://prtimes.jp/main/html/rd/p/000000059.000107978.html","本部サイトactimethod.comとInstagram公式が確認できる。校舎独自サイトは未確認","https://actimethod.com/"),
 rec("lead-e6938f126f","active","unknown","advance","1970年開校の西宮の独立系英会話スクールで公式サイトあり(90以上のクラス)。画像確認と提案余地の判断が必要","公式サイトに受付時間、クラス案内あり。Instagram・Facebookも確認","https://www.christian-center.com","サイト内容・見た目は未確認(画像なし)","https://www.christian-center.com","https://www.christian-center.com"),
 U("kids-abc-club-67c84f5343","defer","Amebloブログのみで独立サイト未確認。宝塚拠点の可能性があり、西宮での実施実態と更新状況の確認が必要",  "https://ameblo.jp/kidsabcclub/",oa="Amebloブログが発信元。最終更新日は未確認"),
 U("lead-e68bb45c29","defer","ポータル掲載のみで会場・運営実態不明。次の確認: 公式発信元の有無と西宮での開催実態","https://rithmic.jp/hokkaido/syosai125.html",oa="英語リトミックのポータル掲載ページのみ"),
 U("e-s-e382cf85ef","defer","エキテン掲載のみで公式サイト未確認。次の確認: 公式サイト・最近の発信の有無",EK,oa="エキテンに掲載。最近の活動は未確認"),
 U("lead-e3168518ad","defer","エキテン掲載のみで公式サイト未確認。プログレスは複数校の可能性があり運営規模の確認が必要",EK,oa="エキテンに掲載。最近の活動は未確認"),
 U("lead-eba97761b5","defer","エキテン掲載のみ。次の確認: 公式サイトと運営規模(複数校の有無)",EK,oa="エキテンに掲載。最近の活動は未確認"),
 rec("lead-7758aea568","active","unknown","advance","夙川駅徒歩1分の英語個別指導塾(約30年)で公式サイトeproepro.comあり。個人・小規模で、画像確認と提案余地の判断が必要","公式サイトにコース紹介あり。地図・電話帳に平日/土曜の営業時間掲載","https://eproepro.com/","サイトはあるが見た目・導線は未確認(画像なし)","https://eproepro.com/about/","https://eproepro.com/"),
 U("lead-54596d54b8","defer","エキテン掲載のみで公式サイト未確認。次の確認: 公式サイトと最近の発信",EK,oa="エキテンに掲載。最近の活動は未確認"),
 U("lead-0d1fd058c3","defer","エキテン掲載のみで公式サイト未確認。次の確認: 公式サイトと最近の発信",EK,oa="エキテンに掲載。最近の活動は未確認"),
 U("lead-44057f87b7","defer","エキテン掲載のみで公式サイト未確認。次の確認: 公式サイトと最近の発信",EK,oa="エキテンに掲載。最近の活動は未確認"),
 rec("willbe-b086462ee0","active","unknown","advance","個人運営の自習塾(元中高教員の代表)で公式サイトwillbe-inc.comとブログあり。画像確認と提案余地の判断が必要","公式サイトにブログ・会社ページあり。Yahoo!ロコに営業時間と決済手段掲載。新規開校の地域記事あり","https://www.willbe-inc.com/","サイトはあるが見た目・導線は未確認(画像なし)","https://www.willbe-inc.com/","https://www.willbe-inc.com/"),
 U("lead-b248d4f674","defer","エキテン掲載のみ。次の確認: 公式サイトと運営規模",EK2,oa="エキテン掲載のみ。最近の活動は未確認"),
 U("doeng-81d53691d0","defer","香櫨園駅徒歩3分の子ども英語教室。DoEng!は複数教室展開でFC/本部運営の可能性があり、教室独自の運営・サイトの有無の確認が必要","https://kodomo-booster.com/schools/153537",act="active",oa="口コミ・体験申込ポータルに教室情報掲載",ow="教室の公式サイトは検索結果から特定できず"),
 U("lead-ffeebb2a99","defer","エキテン掲載のみで公式サイト未確認。次の確認: 公式サイトと最近の発信",EK2,oa="エキテンに掲載。最近の活動は未確認"),
]
save("triage-07-out.jsonl", b07)

# ---- batch 08 ----
b08 = [
 U("lead-14dee0959f","defer","ジュノ★クラムスクールはFC系ブランドの可能性があり規模不明。公式サイト未確認。次の確認: 公式サイト検索と校舎独自運営の度合い",EK2,oa="エキテンの西宮市学習塾一覧に掲載。営業状況の裏付けなし"),
 U("lead-199a5253d6","defer","学習空間はFC系の可能性があるが教室単位の運営規模が不明。次の確認: 教室独自サイト/運営者",JM,oa="塾探しの窓口の西宮市一覧に鳴尾教室として掲載"),
 U("s-live-df4b41292e","defer","s-Liveは全国FCブランド(本部サイトs-live-juku.com、校舎別サイトも存在)。段上町校の独自サイト・運営規模は未確認。次の確認: 段上町校の公式ページと個人運営か","https://www.s-live-juku.com/",oa="塾探しの窓口に段上町校が掲載。同ブランドの甲東園校に独自サイトあり"),
 U("aoi-41ea0956dc","defer","AOIは複数校展開のブランドの可能性。校舎の独自運営度・公式サイト未確認",JM,oa="塾探しの窓口に西宮北口校として掲載"),
 U("wam-51b486ba62","defer","個別指導WAMは地域FC。小曽根校が加盟教室か規模不明。公式サイト未確認",JM,oa="塾探しの窓口に小曽根校として掲載"),
 U("loohcs-a4f594049e","defer","Loohcs志塾は多校舎チェーンの可能性が高いが未確認で除外は保留。公式サイト・運営形態の確認が必要",JM,oa="塾探しの窓口に西宮北口校として掲載"),
 U("ways-89175e1c4a","defer","WAYSは複数教室ブランドの可能性。教室運営規模と公式サイト未確認",JM,oa="塾探しの窓口に西宮北口教室として掲載"),
 rec("lead-a97ba26eb8","uncertain","unknown","stop","トライプラスは大手トライグループの校舎でSegment対象外","塾探しの窓口に香櫨園校として掲載",JM,"全国チェーン(トライ)の校舎のため個別のWeb提案対象外",JM,None,"大手全国チェーン(トライ)の校舎: 個別指導塾トライプラス 香櫨園校 (出典 %s、ブランド名による判断)" % JM),
 U("lead-08a6e6690b","defer","英会話教室で対象業種。公式サイト未確認、運営規模不明。次の確認: 公式サイト検索",JM,oa="塾探しの窓口に西宮北口教室として掲載"),
 rec("lead-b14697ccc0","uncertain","unknown","stop","坪田塾は全国展開のFCブランドでSegment対象外と判断(校舎独自運営の可能性は低い)","塾探しの窓口に西宮北口校として掲載",JM,"全国展開ブランドで本部主導のWeb運用が想定される",JM,None,"大手全国展開FC(坪田塾)の校舎: 坪田塾 西宮北口校 (出典 %s、ブランド名による判断)" % JM),
 U("lead-7880e3f600","defer","住所なし・サイト未確認で活動・規模不明。次の確認: 所在地と公式サイトの確認",JS,oa="塾検索サイトの西宮市一覧に掲載"),
 U("lead-179a41ae23","defer","住所なし・サイト未確認で活動・規模不明。次の確認: 所在地と公式サイトの確認",JS,oa="塾検索サイトの西宮市一覧に掲載"),
 U("lead-ee1c75602b","defer","住所なし・サイト未確認で活動・規模不明(名称が一般的で同定困難)。次の確認: 所在地と公式サイトの確認",JS,oa="塾検索サイトの西宮市一覧に掲載"),
 U("lead-3b2905a000","defer","小規模の可能性があるが公式サイト・規模未確認。次の確認: 公式サイト検索",JL,oa="塾ログの西宮エリア一覧に苦楽園教室として掲載"),
 U("manavi-labs-lepton-2a35c151c5","defer","小規模の可能性があるが公式サイト・規模未確認。次の確認: 公式サイト検索",JL,oa="塾ログの西宮エリア一覧に鳴尾教室として掲載"),
 U("lead-448a5bc455","defer","甲陽園校の運営規模・公式サイト未確認。次の確認: 公式サイト検索",JL,oa="塾ログの西宮エリア一覧に甲陽園校として掲載"),
 U("lead-8b3811ee3a","defer","地域密着の複数校運営の可能性があるが規模不明で除外はしない。次の確認: 公式サイトと校舎数の確認",JN2,oa="塾ナビの西宮市一覧に阪急西宮北口本校として掲載"),
 U("lead-fca007026c","defer","住所なし・サイト未確認で活動・規模不明。次の確認: 所在地と公式サイトの確認",JN2,oa="塾ナビの西宮市一覧に掲載"),
]
save("triage-08-out.jsonl", b08)

# ---- batch 09 ----
b09 = [
 U("lead-d8932bee4f","stop","アプロット進学個別塾は複数校展開のFC/チェーン系と推定される個別指導塾。公式サイト未確認、未検索。Segment適合が低く今回は深掘りしない。恒久除外ではない",JN2,oa="塾ナビ掲載(西宮北口校)のみ。営業状況の直接確認なし"),
 rec("lead-17b70fb7aa","active","none","stop","株式会社リンクアンドモチベーション(東証上場)運営の複数校展開進学塾で個人・小規模Segment対象外","公式サイトm-academia-s.comに西宮北口校ページあり。2011年開校、リンクアンドモチベーション運営と検索結果に記載","https://m-academia-s.com/studyroom/nishikita.html","大手運営で本部管理の公式サイトあり。校舎単位の提案余地は限定的と推定","https://m-academia-s.com/studyroom/nishikita.html","https://m-academia-s.com/studyroom/nishikita.html","上場企業リンクアンドモチベーション運営の複数校進学塾(大手チェーン)のためSegment対象外 https://prtimes.jp/main/html/rd/p/000000268.000006682.html"),
 rec("lead-942de404d0","active","unknown","stop","隆盛ゼミナールは複数校を持つ大学受験専門塾の法人サイト。小規模教室ではない可能性が高く今回は深掘りしない。規模は断定できないためcandidate維持","西宮北口校(甲風園1-5-5)の公式サイトと塾ナビ情報あり","https://www.ryuuseiseminar.co.jp/","公式サイトは存在するが視覚確認なし","https://www.ryuuseiseminar.co.jp/","https://www.ryuuseiseminar.co.jp/"),
 U("lead-cf33fe4306","stop","現論会は複数校展開の大学受験塾ブランドと推定されSegment適合が低い。未検索、公式サイト未確認。恒久除外ではない",JN3,oa="塾ナビ掲載(苦楽園校)のみ"),
 U("lead-144fa10fe7","stop","大学受験テラスは複数校展開ブランドと推定されSegment適合が低い。未検索、公式サイト未確認。恒久除外ではない",JN3,oa="塾ナビ掲載(夙川校)のみ"),
 U("atama-134454f1e3","stop","進学個別atama+塾はFC展開ブランドの校舎と推定されSegment適合が低い。未検索、公式サイト未確認。恒久除外ではない",JN3,oa="塾ナビ掲載(門戸校)のみ"),
 U("lead-9876d52f7d","defer","個別戦略指導会は規模不明で個人・小規模の可能性あり。次の確認: 名称+夙川で公式サイトを検索",JN4,oa="塾ナビ掲載(夙川駅)のみ"),
 U("medi-up-d052c169a8","defer","Medi-UPは規模不明で小規模の可能性あり。次の確認: 名称+西宮北口で公式サイトを検索",JN4,oa="塾ナビ掲載(西宮北口駅)のみ"),
 U("lead-51c22741e7","defer","ブルードルフィンズ香櫨園校は電話番号のみ手掛かり。校舎名から複数校展開の可能性もあり。次の確認: 公式サイトと運営規模",M10,oa="Mapion電話帳掲載のみ"),
 U("lead-6ef1e4129f","stop","キンダーキッズインターナショナルスクールは複数校展開のチェーン系と推定されSegment適合が低い。未検索。恒久除外ではない",M10,oa="Mapion電話帳掲載のみ"),
 U("lead-1eb1952930","stop","スーパーピグマリオンは複数教室展開のブランドと推定されSegment適合が低い。未検索。恒久除外ではない",M10,oa="Mapion電話帳掲載のみ"),
 U("lead-05d1c2579f","defer","西宮インターナショナルスクールは独立系の可能性あり。次の確認: 公式サイトと運営規模",M10,oa="Mapion電話帳掲載のみ"),
 U("lead-c22c3c79d7","defer","夙川プリスクールは独立系の可能性あり。次の確認: 公式サイト。夙川プリ・スクール知能教室と同一運営の可能性があるが確証なし",M10,oa="Mapion電話帳掲載のみ"),
 U("lead-92e579d8b6","defer","夙川プリ・スクール知能教室は独立系の可能性あり。次の確認: 公式サイト。夙川プリスクールと同一運営の可能性があるが電話が異なり自動統合しない",M10,oa="Mapion電話帳掲載のみ"),
 U("lead-b469107818","defer","パール アンド フィリップスクールは独立系の可能性あり。次の確認: 公式サイト",M10,oa="Mapion電話帳掲載のみ"),
 U("ken-2db321e8b1","defer","KEN外国語教室は住所ありの個人教室らしき名称。次の確認: 名称+西宮で公式サイトを検索",EK9,oa="エキテン掲載(西宮市甲子園高潮町6-25)のみ"),
 U("lead-e872d820e0","defer","コア英語教室夙川校は校名から複数校展開の可能性もあるが規模不明。次の確認: 公式サイトと運営規模",EK9,oa="エキテン掲載(西宮市相生町7-3)のみ"),
 U("lead-e9eac51368","defer","苦楽園スタディクラブは住所ありの小規模教室らしき名称。次の確認: 名称+西宮で公式サイトを検索",EK9,oa="エキテン掲載(西宮市南越木岩町9-5)のみ"),
]
save("triage-09-out.jsonl", b09)

# ---- batch 10 ----
b10 = [
 rec("plus-study-96eca66854","active","unknown","advance","西宮北口の英語専門塾で単独教室。公式サイトあり、活動の手掛かりあり。画像未提供のためweb_gapはQUALIFYで確認","公式サイトと検索結果に住所(甲風園1-7-5)・電話・講師・実績ページがあり、西宮北口校のみ","https://plusstudy.net/","視覚画像なしでレイアウト等は未確認","https://plusstudy.net/","https://plusstudy.net/"),
 U("gq-d9bf63f6ac","defer","公式サイト未発見。GQマスターズは複数校展開の可能性があり規模不明。次の確認: 公式サイトと運営規模(校舎数)",EK4,oa="エキテン掲載のみ"),
 U("sugino-6bcfef9471","defer","「SUGINO個別英語教室 西宮」検索で公式サイト見つからず。不存在は断定しない。次の確認: 別表記で公式サイト/SNS",EK6,oa="エキテン掲載のみ。検索で独自情報なし"),
 U("lead-3c80e48aff","defer","「論理塾 西宮」検索で公式サイト見つからず。次の確認: 別表記で公式サイト",EK6,oa="エキテン掲載のみ。検索で独自情報なし"),
 U("lead-cb0ab6960f","defer","公式サイト未確認。複数教室展開の可能性があり規模不明。次の確認: 運営会社の規模と公式サイト",EK6,oa="エキテン掲載のみ"),
 U("lead-7e1c21fdb9","defer","公式サイト未確認。教室名からFC・複数教室の可能性、規模不明。次の確認: 運営元と公式サイト",EK6,oa="エキテン掲載のみ"),
 U("seeds-94113e5a91","defer","公式サイト未確認。教室名から複数教室の可能性、規模不明。次の確認: 運営元と公式サイト",EK6,oa="エキテン掲載のみ"),
 U("gq-00224e6c89","defer","公式サイト未確認。GQマスターズは複数校展開の可能性、規模不明。次の確認: 公式サイトと校舎数",EK6,oa="エキテン掲載のみ"),
 U("plus-2c59296983","defer","公式サイト未確認。次の確認: 「ブラウンPLUS 西宮」で公式サイト確認",EK6,oa="エキテン掲載のみ"),
 U("lead-d2fc354f76","defer","個人家庭教師。公式サイト未確認。次の確認: 公式サイト/発信の有無","https://www.ekiten.jp/shop_24909319/",oa="エキテン掲載のみ"),
 rec("lead-5f7c09ea01","active","unknown","advance","地域密着の学習塾で公式サイトあり、活動の手掛かりあり。西宮・尼崎に複数教室があり規模は要確認だが全国チェーン/大手FCではないためcandidate維持","公式サイトにホームページリニューアルのお知らせ、40年余の歴史、甲子園口本部の住所・電話の掲載","https://www.ishikura-juku.co.jp/","視覚画像なしでレイアウト等は未確認。近年リニューアル済みの記載あり","https://www.ishikura-juku.co.jp/","https://www.ishikura-juku.co.jp/"),
 rec("lead-e53d043e37","active","unknown","advance","豊中・西宮北口の英語専門塾(1955年開校)で公式サイトあり、小規模の英語塾として追加確認の価値あり。ekiten重複(shop_1131139)の可能性あり","公式サイトに西宮教室のコース、豊中教室ページ、電話が掲載。住所は甲風園1-3-3とされる","https://iwano-eigojuku.com/","視覚画像なしで未確認","https://iwano-eigojuku.com/","https://iwano-eigojuku.com/"),
 U("plus-618c5a1198","defer","FC・チェーン系の可能性(スクラムPLUS)。教室独自の運営・発信の有無が不明。次の確認: 教室独自の公式ページ有無と運営形態","https://agao.jp/school/plus/007/",oa="学習支援メディア掲載のみ、住所空欄"),
 U("lead-1299adb191","defer","step-world.comは302でドメイン移転の可能性。ステップワールド英語スクール(stepworld.jp)はFC展開ブランドで西宮大森教室・甲東園駅前教室が確認されるが独自運営の範囲が不明。次の確認: 教室独自サイトの現在URLと運営形態","https://eigohiroba.jp/item/85523093",oa="検索結果に西宮大森教室(西宮市大森町14-16)、口コミサイト掲載あり",ow="step-world.comの現状は未確認(過去の302リダイレクト記録のみ)"),
 U("lead-ec6ca28e49","defer","リトミック系FCの可能性。音楽色が強くSegment適合が不明。次の確認: 教室独自の運営・英語指導の比重","https://rithmic.jp/hokkaido/syosai125.html",oa="リトミック系ポータルの教室掲載のみ"),
]
save("triage-10-out.jsonl", b10)
