import { readFile, writeFile } from "node:fs/promises";
import { renderArticlePageV3 } from "../lib/article-template-v2.mjs";
import { renderArticlesIndexPage, renderFeedXml, renderSitemapXml } from "../lib/discovery-renderers.mjs";
import { highResolutionRakutenImage, PUBLIC_SITE_ORIGIN } from "../lib/site-config.mjs";

const MIGRATION_UPDATED_AT = "2026-08-11T00:00:00.000Z";

const plans = {
  "couple-1ldk-lift-top-table-selection": ["リビング・ダイニング", "テーブル", "食事と仕事を切り替えやすい昇降テーブル8選", "昇降テーブル8選｜食事と仕事に使う高さ・収納を比較", "昇降テーブル 食事 仕事"],
  "newlywed-2ldk-modern-modular-sofa-selection": ["リビング", "ソファ", "新婚ふたりのリビングに選ぶモダンソファ6選", "リビングのモダンソファ6選｜ユニットとカウチを比較", "リビング モダンソファ ユニット"],
  "newlywed-2ldk-natural-sofa-selection": ["リビング", "ソファ", "ふたりのリビングに合うナチュラルソファ6選", "ナチュラルソファ6選｜リビングで使うサイズと素材を比較", "リビング ナチュラルソファ"],
  "newlywed-2ldk-dining-chair-selection": ["ダイニング", "チェア", "ふたりの食卓に選ぶダイニングチェア5選", "ダイニングチェア5選｜座面高と素材で比較", "ダイニングチェア 座面高 比較"],
  "newlywed-1ldk-tv-board-selection": ["リビング", "テレビボード", "リビングを広く使いやすいテレビボード5選", "テレビボード5選｜幅・収納・配線で比較", "テレビボード 収納 配線"],
  "newlywed-2ldk-living-storage-selection": ["収納", "収納", "リビングの生活感を抑えやすい収納家具6選", "リビング収納6選｜キャビネットとラックを比較", "リビング収納 キャビネット"],
  "newlywed-1ldk-full-length-mirror-selection": ["寝室", "ミラー", "寝室と身支度に使いやすい全身鏡・姿見6選", "全身鏡・姿見6選｜設置寸法と転倒対策で比較", "全身鏡 姿見 寝室"],
  "newlywed-1ldk-designer-dustbox-selection": ["水まわり", "ゴミ箱", "生活感を抑えて置けるゴミ箱6選", "デザインゴミ箱6選｜容量と置き場所で比較", "ゴミ箱 生活感 容量"],
  "newlywed-2ldk-side-table": ["リビング", "テーブル", "ソファ横で使いやすいサイドテーブル6選", "サイドテーブル6選｜高さ・幅・収納で比較", "サイドテーブル ソファ横"],
  "newlywed-1ldk-open-rack": ["収納", "収納", "見せる収納に選ぶオープンラック6選", "オープンラック6選｜奥行きと設置方法で比較", "オープンラック 見せる収納"],
  "newlywed-1ldk-art-panel": ["リビング", "インテリア", "ふたりの壁に飾りやすいアートパネル6選", "アートパネル6選｜サイズと設置方法で比較", "アートパネル 飾り方"],
  "newlywed-1ldk-one-seater-sofa": ["リビング", "ソファ", "ふたりの居場所を分ける1人掛けソファ5選", "1人掛けソファ5選｜リビングの動線とサイズで比較", "1人掛けソファ リビング"],
  "newlywed-one-room-pendant-light": ["ダイニング", "照明", "ふたりの食卓を照らすペンダントライト5選", "ペンダントライト5選｜灯数・調光・素材で比較", "ダイニング ペンダントライト"],
  "couple-1ldk-irregular-dining-table": ["ダイニング", "テーブル", "ふたりの食卓に選ぶ変形ダイニングテーブル5選", "変形ダイニングテーブル5選｜天板形状とサイズで比較", "変形ダイニングテーブル ふたり"],
  "newlywed-one-room-two-seater-sofa": ["リビング", "ソファ", "リビングを広く使いたいふたりの2人掛けソファ5選", "2人掛けソファ5選｜ふたり暮らしのサイズと選び方", "2人掛けソファ ふたり暮らし"]
};

const rewriteString = (input, area) => String(input)
  .replaceAll("\u30ef\u30f3\u30eb\u30fc\u30e0", area)
  .replaceAll("新婚の1LDK", `新婚ふたりの${area}`)
  .replaceAll("新婚1LDK", `新婚ふたりの${area}`)
  .replaceAll("新婚の2LDK", `新婚ふたりの${area}`)
  .replaceAll("新婚2LDK", `新婚ふたりの${area}`)
  .replaceAll("1LDK向け", `${area}向け`)
  .replaceAll("2LDK向け", `${area}向け`)
  .replaceAll("1LDK", area)
  .replaceAll("2LDK", area)
  .replaceAll("静かな余白", "落ち着いた見え方")
  .replaceAll("余白をつくる", "動線を確保する")
  .replaceAll("余白を残す", "通路を確保する")
  .replaceAll("余白を整える", "配置を整える")
  .replaceAll("余白を添える", "使う場所を加える")
  .replaceAll("部屋に置いたときの余白", "設置後の通路幅")
  .replaceAll("部屋全体の余白", "部屋全体の動線");

function rewrite(value, area) {
  if (typeof value === "string") return rewriteString(value, area);
  if (Array.isArray(value)) return value.map(item => rewrite(item, area));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item, area)]));
  return value;
}

const index = JSON.parse(await readFile("articles/index.json", "utf8"));
for (const metadata of index.articles) {
  const plan = plans[metadata.slug];
  if (!plan) throw new Error(`Missing taxonomy plan: ${metadata.slug}`);
  const [livingArea, productCategory, displayTitle, seoTitle, mainKeyword] = plan;
  const path = `articles/${metadata.slug}/article.json`;
  let record = rewrite(JSON.parse(await readFile(path, "utf8")), livingArea);
  record.livingArea = livingArea;
  record.productCategory = productCategory;
  record.updatedAt = MIGRATION_UPDATED_AT;
  record.article.displayTitle = displayTitle;
  record.article.seoTitle = seoTitle;
  record.article.metaDescription = rewriteString(record.article.metaDescription, livingArea);
  record.seo.mainKeyword = mainKeyword;
  record.seo.relatedKeywords = [...new Set((record.seo.relatedKeywords || []).map(value => rewriteString(value, livingArea)).filter(value => !/1LDK|2LDK/.test(value)))];
  metadata.displayTitle = displayTitle;
  metadata.seoTitle = seoTitle;
  metadata.metaDescription = record.article.metaDescription;
  metadata.livingArea = livingArea;
  metadata.productCategory = productCategory;
  metadata.mainKeyword = mainKeyword;
  metadata.updatedAt = MIGRATION_UPDATED_AT;
  metadata.thumbnail = highResolutionRakutenImage(record.article.cardImage || record.article.coverImage || record.article.heroImage || record.products?.[0]?.imageUrl || metadata.thumbnail);
  delete metadata.roomType;
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await writeFile(`articles/${metadata.slug}/index.html`, renderArticlePageV3({ ...record, articleType: metadata.articleType, target: metadata.target, livingArea, productCategory, editorialThemes: metadata.editorialThemes }, PUBLIC_SITE_ORIGIN, record.publishedAt, record.updatedAt), "utf8");
}

index.updatedAt = MIGRATION_UPDATED_AT;

await writeFile("articles/index.json", `${JSON.stringify(index, null, 2)}\n`, "utf8");
await writeFile("articles/index.html", renderArticlesIndexPage(PUBLIC_SITE_ORIGIN), "utf8");
await writeFile("sitemap.xml", renderSitemapXml(index, PUBLIC_SITE_ORIGIN), "utf8");
await writeFile("feed.xml", renderFeedXml(index, PUBLIC_SITE_ORIGIN), "utf8");
await writeFile("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${PUBLIC_SITE_ORIGIN}/sitemap.xml\n`, "utf8");
console.log(`Migrated ${index.articles.length} published articles to livingArea taxonomy.`);
