import { readFile, writeFile } from "node:fs/promises";
import { renderArticlesIndexPage, renderSitemapXml, renderFeedXml } from "../lib/discovery-renderers.mjs";
import { renderArticlePageV3 } from "../lib/article-template-v2.mjs";

const origin = "https://futari-kurashi.pages.dev";
const slug = "newlywed-one-room-two-seater-sofa";
const articlePath = `articles/${slug}/article.json`;
const record = JSON.parse(await readFile(articlePath, "utf8"));
const index = JSON.parse(await readFile("articles/index.json", "utf8"));
const metadata = index.articles.find(article => article.slug === slug);
if (!metadata) throw new Error(`Article metadata not found: ${slug}`);
const headings = new Map([
  ["receno:10018366", "Re:CENO Lys with テーブル"],
  ["design-furniture-dvp:10000071", "D VECTOR PROJECT 木製フレームソファ"],
  ["cocoterior:10007668", "ココテリア 2人掛けローソファ"],
  ["tansu:10046622", "タンスのゲン ヴィンテージ調2人掛けソファ"],
  ["arco-interior:10005559", "Loire 2.5人掛けソファ"]
]);
record.productBlocks.forEach(block => { block.heading = headings.get(block.itemCode) || block.heading; });
record.seo.mainKeyword = "新婚 ソファ おすすめ";
record.comparisonTable.rows = record.products.map(product => {
  const block = record.productBlocks.find(item => item.itemCode === product.itemCode) || {};
  return [headings.get(product.itemCode) || product.name, `${Number(product.price || 0).toLocaleString("ja-JP")}円`, product.reviewAverage ? `${product.reviewAverage}／${product.reviewCount || 0}件` : "商品ページで確認", product.shopName, block.role || product.role || "Editorial Selection", product.affiliateUrl];
});
await writeFile(`articles/${slug}/index.html`, renderArticlePageV3({ ...record, articleType: metadata.articleType, target: metadata.target, roomType: metadata.roomType, editorialThemes: metadata.editorialThemes }, origin, record.publishedAt, record.updatedAt), "utf8");
for (const article of index.articles.filter(article => article.slug !== slug)) {
  const articleRecord = JSON.parse(await readFile(`articles/${article.slug}/article.json`, "utf8"));
  await writeFile(`articles/${article.slug}/index.html`, renderArticlePageV3({ ...articleRecord, articleType: article.articleType, target: article.target, roomType: article.roomType, editorialThemes: article.editorialThemes }, origin, articleRecord.publishedAt, articleRecord.updatedAt), "utf8");
}
await writeFile("articles/index.html", renderArticlesIndexPage(origin), "utf8");
await writeFile("sitemap.xml", renderSitemapXml(index, origin), "utf8");
await writeFile("feed.xml", renderFeedXml(index, origin), "utf8");
console.log(`Rebuilt discovery files for ${index.articles.length} article(s).`);
