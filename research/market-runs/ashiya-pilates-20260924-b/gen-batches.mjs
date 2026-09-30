// 6経路の返却(親が正規名へ名寄せ済み)から、経路別の取り込みJSONLを生成する。
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'work');
fs.mkdirSync(dir, { recursive: true });
const R = '兵庫県芦屋市', T = '2026-09-24';
const PM = 'https://pilates-map.co.jp/pilates-ashiya/', SK = 'https://sakura-pilates.jp/column/hyogo/asiya/', PR = 'https://pilatesroom.blog/pilates-ashiya/', CA = 'https://cani.jp/pilates/ashiya-4';
// [name, aliases, address, industry, siteUrl|null, {route: [urls]}]
const E = [
 ['URBAN CLASSIC PILATES 芦屋店', ['アーバンクラシックピラティス 芦屋店'], '兵庫県芦屋市船戸町3-2 芦屋鍵岡ビル2F', 'ピラティススタジオ', 'https://urbanclassic.jp/pilates-studio/ashiya/', { web: ['https://urbanclassic.jp/pilates-studio/ashiya/', PR], map: [PM], industry_media: [PR, SK], region_variant: ['https://urbanclassic.jp/pilates-studio/ashiya/', SK], station_area: ['https://urbanclassic.jp/pilates-studio/ashiya/', SK], industry_synonym: [SK] }],
 ['ELEMENT 芦屋店', ['パーソナルマシンピラティス＆ジムELEMENT芦屋店'], '兵庫県芦屋市松ノ内町2-1 松ノ内ビル1F', 'ピラティススタジオ', 'https://element-gym.com/element-top/pilates/pilates-all/ashiya/', { web: ['https://element-gym.com/element-top/pilates/pilates-all/ashiya/', PR], map: ['https://element-gym.com/element-top/pilates/pilates-all/ashiya/'], industry_media: ['https://kosupapilates.jp/studio/elementpilates-ashiya/', PR], region_variant: [SK], station_area: [PR], industry_synonym: [SK] }],
 ['Two Three ピラティススタジオ 芦屋', ['TwoThree Ashiya', 'ツースリー'], '兵庫県芦屋市大原町10-1 ホテル竹園芦屋 2階', 'ピラティススタジオ', 'https://twothree-pilates.co.jp/ashiya/', { web: ['https://twothree-pilates.co.jp/ashiya/', PR], map: [PM], industry_media: [PR, PM, SK], region_variant: ['https://twothree-pilates.co.jp/ashiya/', SK], station_area: ['https://twothree-pilates.co.jp/ashiya/', PR], industry_synonym: ['https://twothree-pilates.co.jp/ashiya/', 'https://pilates-navi.com/ashiya/'] }],
 ['Vivo Bearsi 芦屋', ['ピラティス＆ホットヨガ Vivo Bearsi 芦屋'], '兵庫県芦屋市船戸町1-31 モンテメール芦屋 本館6F', 'ピラティススタジオ（ホットヨガ併設）', 'https://s-vivo.com/bearsi-ashiya/top/', { web: ['https://s-vivo.com/bearsi-ashiya/top/', PR], map: [PM], industry_media: ['https://s-vivo.com/bearsi-ashiya/top/', PM, SK], region_variant: ['https://s-vivo.com/bearsi-ashiya/top/', PM], station_area: ['https://s-vivo.com/bearsi-ashiya/top/', CA], industry_synonym: ['https://s-vivo.com/bearsi-ashiya/top/'] }],
 ['Pilates Studio CORE', ['ayupilates', 'ピラティススタジオCORE'], '兵庫県芦屋市西山町12-14 ドムス芦屋川 1F', 'ピラティススタジオ', 'https://ayupilates.com/', { web: ['https://ayupilates.com/', PR], map: [PM], industry_media: [PR, SK, PM], region_variant: ['https://ayupilates.com/', SK], station_area: ['https://ayupilates.com/', SK], industry_synonym: ['https://pilates-navi.com/ashiya/', PR] }],
 ['Pilates studio Appel（アペル）', ['Appel', 'アペル'], '兵庫県芦屋市松ノ内町1-10 ラリーブ芦屋005号室', 'ピラティススタジオ', 'https://appel-pilates.com/', { web: ['https://appel-pilates.com/', PR], map: [PM, 'https://coubic.com/appel'], industry_media: ['https://beauty.hotpepper.jp/genre/kgkw019/stc3240879/', PM, 'https://coubic.com/appel'], region_variant: ['https://appel-pilates.com/', SK], station_area: ['https://appel-pilates.com/', PR], industry_synonym: ['https://appel-pilates.com/', 'https://pilates-navi.com/ashiya/'] }],
 ['ipset（イプセ）', ['ipset芦屋', 'コールドプレスジュース＆スタジオ イプセ'], '兵庫県芦屋市茶屋之町9-9', 'ピラティススタジオ', 'https://ipset.jp/', { web: ['https://ipset.jp/pilates/', CA], map: [PM], industry_media: [PM, SK, PR], region_variant: ['https://ipset.jp/', SK, 'https://www.instagram.com/ipset__ashiya/'], station_area: ['https://ipset.jp/', 'https://ipset.jp/pilates/'], industry_synonym: ['https://ipset.jp/', SK] }],
 ['チサト ピラティス ビューティスタジオ', ['Chisato Pilates Beauty Studio'], '兵庫県芦屋市東芦屋町', 'ピラティススタジオ', 'https://pilates.mirliton-shop.com/', { web: ['https://pilates.mirliton-shop.com/', PR], map: [PM], industry_media: [PR, SK, PM], region_variant: ['https://pilates.mirliton-shop.com/', SK], station_area: ['https://pilates.mirliton-shop.com/', PR], industry_synonym: ['https://pilates.mirliton-shop.com/', 'https://pilates-navi.com/ashiya/'] }],
 ['プリメイラ 芦屋店', ['Primeira', 'primeira'], '兵庫県芦屋市楠町8-16 ハイネス山下102', 'ピラティススタジオ', 'https://www.primeira2014.com/', { web: [PR, CA], map: [PM], industry_media: [PR, PM, SK], region_variant: ['https://www.primeira2014.com/', SK], station_area: ['https://www.primeira2014.com/', SK], industry_synonym: ['https://www.primeira2014.com/', SK] }],
 ['ONE EIGHTY PILATES', ['180° Pilates'], '兵庫県芦屋市業平町6-16 芦屋ファルファーラ402', 'ピラティススタジオ', 'https://www.one-eighty-pilates.jp/', { web: [PR], map: [PM], industry_media: [PR, PM], region_variant: ['https://www.one-eighty-pilates.jp/', SK], station_area: [PR], industry_synonym: ['https://one-eighty-pilates.square.site/', 'https://pilates-navi.com/ashiya/'] }],
 ['ウェルネススタジオ ノイ（neu）', ['neu', 'Wellness Studio Neu', 'ウェルネススタジオノイ'], '兵庫県芦屋市松ノ内町4-6 芦屋パレ・エレガンス204', 'ピラティススタジオ', 'https://s-neu.com/', { web: [CA, 'https://beauty.hotpepper.jp/genre/kgkw019/stc3240879/'], map: [PM], industry_media: [PM, PR, SK], region_variant: ['https://s-neu.com/', PM], station_area: [CA, SK], industry_synonym: [SK] }],
 ['body work studio K', ['bodyworkstudioK'], '兵庫県芦屋市大原町7-3 西本ビル204号室', 'ピラティススタジオ', 'https://bodyworkstudiok.studio.site/', { web: [PR], map: ['https://bodyworkstudiok.studio.site/trial'], industry_media: [PR, 'https://bodyworkstudiok.studio.site/trial'], region_variant: [SK, 'https://bodyworkstudiok.studio.site/'], station_area: [PR], industry_synonym: ['https://bodyworkstudiok.studio.site/trial', PR] }],
 ['ホットヨガスタジオLAVA 芦屋店', ['LAVA芦屋'], '兵庫県芦屋市大原町2-5 ヴィザヴィ芦屋ビル5F', 'ホットヨガ・ピラティス(隣接業種、ピラティス提供は未確認)', 'https://yoga-lava.com/shop/hyogo/ashiya/', { web: ['https://yoga-lava.com/shop/hyogo/ashiya/'], station_area: [CA] }],
 ['uni-θta', ['uni_ta2024', 'ユニシータ'], '兵庫県芦屋市宮塚町12-24', 'ピラティススタジオ', null, { map: [PM], industry_media: [PM], region_variant: [PM, 'https://www.instagram.com/uni_ta2024'] }],
 ['Conditioning LABO animom', ['animom'], '兵庫県芦屋市宮塚町', 'パーソナル/セミパーソナル(ピラティス提供は未確認)', null, { map: ['https://map.yahoo.co.jp/v3/place/urue6byU3fg'] }],
 ['coco yoga', ['ココヨガ'], '兵庫県芦屋市松ノ内町4-6 パレエレガンス106', 'ヨガスタジオ(ピラティス提供は未確認)', 'https://www.cocoyoga3104.com/', { station_area: [CA] }],
 ['潮芦屋温泉SPA水春 芦屋', ['水春 芦屋'], '兵庫県芦屋市海洋町10-2', '温浴施設(ヨガ等レッスン併設、ピラティス専業ではない)', 'https://suisyun.jp/ashiya/yoga.html', { station_area: [CA] }],
 ['ベーストリニティ Base TRINITY', ['Base TRINITY'], null, 'ヨガ・ピラティス パーソナルレッスン', 'https://base-trinity.com/', { station_area: ['https://base-trinity.com/'], industry_synonym: ['https://base-trinity.com/'] }],
];
const ROUTES = [['web-01', 'web'], ['map-01', 'map'], ['media-01', 'industry_media'], ['region-01', 'region_variant'], ['station-01', 'station_area'], ['synonym-01', 'industry_synonym']];
for (const [rid, rtype] of ROUTES) {
  const lines = [];
  for (const [name, aliases, address, industry, site, routes] of E) {
    const urls = routes[rtype];
    if (!urls) continue;
    lines.push(JSON.stringify({
      identity: { name, aliases, region: R, address, industry, business_status: 'active' },
      discovery_sources: urls.map((url) => ({ route_id: rid, url, source_type: rtype, checked_at: T })),
      website: site ? { presence: 'confirmed', url: site, evidence: [site] } : { presence: 'unconfirmed', url: null, evidence: [] },
      contacts: { channels: [], text_outreach_available: false },
    }));
  }
  fs.writeFileSync(path.join(dir, `discovery-${rid}.jsonl`), lines.join('\n') + '\n');
  console.log(rid, lines.length);
}
