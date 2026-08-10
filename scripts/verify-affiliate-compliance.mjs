import { readFile } from "node:fs/promises";
import { renderArticlePageV3 } from "../lib/article-template-v2.mjs";

const origin = "https://futari-kurashi.pages.dev";
const expect = (condition, label) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
};
const affiliateUrl = "https://hb.afl.rakuten.co.jp/hgc/example/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fitem%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fshop%2Fi%2F1%2F&rafcid=test";
const fixture = disclosure => ({
  version: "1.0", articleId: "audit-fixture", articleType: "比較・おすすめ記事", target: "新婚", roomType: "1LDK",
  article: { displayTitle: "監査用記事", seoTitle: "監査用記事 | MARGIN", metaDescription: "監査用の記事です。", slug: "audit-fixture", lead: "リード文です。", conclusion: "結論です。", editorialNote: "編集後記です。", disclosure },
  sections: [{ id: "one", type: "text", heading: "選ぶ前に", level: 2, body: "本文です。", items: [] }],
  products: [{ itemCode: "shop:1", name: "商品名", price: 0, imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/shop/item.jpg", affiliateUrl, shopName: "ショップ", reviewAverage: 0, reviewCount: 0 }],
  productBlocks: [{ itemCode: "shop:1", heading: "ショップ 商品", role: "Best Balance", summary: "商品概要", bestFor: ["新婚"], checkPoints: ["寸法"], editorComment: "編集コメント", affiliateUrl }],
  comparisonTable: { columns: [], rows: [{ itemCode: "shop:1", affiliateUrl }] }, faq: [], seo: { mainKeyword: "商品" }
});
const render = data => renderArticlePageV3(data, origin, "2026-08-01T00:00:00Z", "2026-08-09T00:00:00Z");
const disclosed = render(fixture("本記事は楽天アフィリエイトを利用しています。価格、在庫、送料、納期は変更される場合があります。最新情報は楽天市場で確認してください。"));
expect((disclosed.match(/class="disclosure"/g) || []).length === 1, "valid disclosure shown once");
expect(disclosed.indexOf('class="lead"') < disclosed.indexOf('class="disclosure"') && disclosed.indexOf('class="disclosure"') < disclosed.indexOf('class="hero-tools"'), "disclosure after lead and before contents");
const fallback = render(fixture(""));
expect(fallback.includes("本記事には楽天アフィリエイトの広告リンクが含まれます。") && fallback.includes(">広告</strong>"), "standard disclosure fallback");
const ordinary = fixture(""); ordinary.products[0].affiliateUrl = ""; ordinary.productBlocks[0].affiliateUrl = ""; ordinary.comparisonTable.rows[0].affiliateUrl = "";
expect(!render(ordinary).includes('class="disclosure"'), "ordinary article has no advertising disclosure");
expect(!fallback.includes("¥0") && fallback.includes("楽天市場で確認"), "missing price does not display zero yen");
expect(fallback.includes("評価情報なし") && !fallback.includes("0.00"), "zero reviews do not display zero-star rating");
expect(fallback.includes("楽天市場で見る") && !fallback.includes(">見る <"), "Rakuten destination labels are explicit");
expect(fallback.includes('target="_blank" rel="nofollow sponsored noopener"'), "affiliate link attributes");
expect(fallback.includes("掲載情報更新 2026-08-09"), "information update date");
expect(fallback.includes('alt="ショップ 商品"') && fallback.includes('alt="ショップ 商品の比較画像"'), "product image alt text");
const schemaText = fallback.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
const schema = JSON.parse(schemaText);
expect(schema["@type"] === "Article" && schema.author?.name === "MARGIN編集部" && schema.publisher?.name === "MARGIN", "Article structured data");
expect(!/AggregateRating|"Review"/.test(fallback), "no MARGIN rating schema");

const index = JSON.parse(await readFile("articles/index.json", "utf8"));
let articleCount = 0, productCount = 0, affiliateCount = 0, exactHtmlLinks = 0, invalidLinks = [], mismatches = [], bannedHits = [];
const banned = /人気No\.1|絶対おすすめ|買わないと損|激安|神アイテム|誰にでも合う|ランキング(?:受賞|1位)|第?1位/;
for (const metadata of index.articles || []) {
  const record = JSON.parse(await readFile(`articles/${metadata.slug}/article.json`, "utf8"));
  const html = renderArticlePageV3({ ...record, articleType: metadata.articleType, target: metadata.target, roomType: metadata.roomType, editorialThemes: metadata.editorialThemes }, origin, record.publishedAt, record.updatedAt);
  articleCount += 1;
  expect(html.indexOf('class="disclosure"') < html.indexOf('class="hero-tools"'), `${metadata.slug}: disclosure precedes contents`);
  expect(!html.includes("¥0"), `${metadata.slug}: no zero-yen price`);
  expect(!/AggregateRating|"Review"/.test(html), `${metadata.slug}: no rating schema`);
  const blocks = new Map((record.productBlocks || []).map(block => [String(block.itemCode), block]));
  const comparisonRows = record.comparisonTable?.rows || [], rows = new Map(comparisonRows.filter(row => row && !Array.isArray(row)).map(row => [String(row.itemCode), row]));
  for (const product of record.products || []) {
    productCount += 1;
    const url = String(product.affiliateUrl || ""), block = blocks.get(String(product.itemCode)), row = rows.get(String(product.itemCode)) || comparisonRows.find(candidate => Array.isArray(candidate) && candidate.includes(url));
    if (!url) continue;
    affiliateCount += 1;
    try {
      const parsed = new URL(url), target = parsed.searchParams.get("pc");
      if (parsed.protocol !== "https:" || parsed.hostname !== "hb.afl.rakuten.co.jp" || !target?.startsWith("https://item.rakuten.co.jp/")) invalidLinks.push(product.itemCode);
    } catch { invalidLinks.push(product.itemCode); }
    const rowUrl = Array.isArray(row) ? row.find(cell => cell === url) : row?.affiliateUrl;
    if (String(block?.affiliateUrl || "") !== url || String(rowUrl || "") !== url) mismatches.push(product.itemCode);
    const escaped = url.replaceAll("&", "&amp;");
    const count = html.split(`href="${escaped}"`).length - 1;
    if (count >= 4) exactHtmlLinks += 1; else mismatches.push(`${product.itemCode}:html`);
  }
  const editorialText = JSON.stringify({ article: record.article, sections: record.sections, productBlocks: record.productBlocks, faq: record.faq, seo: record.seo });
  if (banned.test(editorialText)) bannedHits.push(metadata.slug);
}
expect(articleCount === index.articles.length, `${articleCount} published articles rendered`);
expect(productCount === affiliateCount, `${affiliateCount}/${productCount} products have affiliate URLs`);
expect(!invalidLinks.length, `${affiliateCount} affiliate URLs have exact Rakuten host and item target`);
expect(!mismatches.length && exactHtmlLinks === affiliateCount, `${affiliateCount} product/block/comparison/HTML links match exactly`);
expect(!bannedHits.length, "no banned promotional expressions in editorial fields");

const fixedPages = ["about", "privacy", "contact", "affiliate-disclosure", "disclaimer"];
for (const page of fixedPages) expect((await readFile(`${page}/index.html`, "utf8")).includes(`href="/${page === "about" ? "privacy" : "about"}/`) || page === "privacy", `${page} fixed page exists`);
const top = await readFile("index.html", "utf8"), template = await readFile("lib/article-template-v2.mjs", "utf8"), discovery = await readFile("lib/discovery-renderers.mjs", "utf8"), publish = await readFile("api/publish/article.js", "utf8"), rebuild = await readFile("api/publish/rebuild.js", "utf8");
for (const page of fixedPages) expect(top.includes(`href="/${page}/"`) && template.includes(`href="/${page}/"`), `${page} linked from top and article footers`);
expect(fixedPages.every(page => discovery.includes(`\"${page}\"`)), "fixed pages retained in generated sitemap");
expect(publish.includes("renderArticlePageV3") && rebuild.includes("renderArticlePageV3"), "new publish and rebuild use audited template");
