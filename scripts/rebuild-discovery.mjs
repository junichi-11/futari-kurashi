import { readFile, writeFile } from "node:fs/promises";
import { renderArticlesIndexPage, renderSitemapXml, renderFeedXml } from "../lib/discovery-renderers.mjs";
import { renderArticlePageV2 } from "../lib/article-template-v2.mjs";

const origin = "https://futari-kurashi.pages.dev";
const slug = "newlywed-one-room-two-seater-sofa";
const articlePath = `articles/${slug}/article.json`;
const record = JSON.parse(await readFile(articlePath, "utf8"));
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
await writeFile(articlePath, JSON.stringify(record, null, 2) + "\n", "utf8");
const index = { version: "1.0", updatedAt: record.updatedAt, articles: [{ articleId: record.articleId, slug, url: `/articles/${slug}/`, displayTitle: record.article.displayTitle, seoTitle: record.article.seoTitle, metaDescription: record.article.metaDescription, publishedAt: record.publishedAt, updatedAt: record.updatedAt, articleType: "比較・おすすめ記事", target: "新婚・2人暮らし", roomType: "ワンルーム", editorialThemes: ["余白", "誠実さ", "コストバランス"], mainKeyword: record.seo.mainKeyword, productCount: record.products.length, thumbnail: record.products[0]?.imageUrl || "", status: "Published" }] };
await writeFile("articles/index.json", JSON.stringify(index, null, 2) + "\n", "utf8");
await writeFile(`articles/${slug}/index.html`, renderArticlePageV2({ ...record, articleType: index.articles[0].articleType, target: index.articles[0].target, roomType: index.articles[0].roomType, editorialThemes: index.articles[0].editorialThemes }, origin, record.publishedAt, record.updatedAt), "utf8");
await writeFile("articles/index.html", renderArticlesIndexPage(origin), "utf8");
await writeFile("sitemap.xml", renderSitemapXml(index, origin), "utf8");
await writeFile("feed.xml", renderFeedXml(index, origin), "utf8");
console.log(`Rebuilt discovery files for ${index.articles.length} article(s).`);
