import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("admin/article-import-validation.js", "utf8");
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const validation = context.globalThis.MarginImportValidation;
const expect = (condition, label) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
};
const products = Array.from({ length: 5 }, (_, index) => ({
  itemCode: `shop:${100 + index}`,
  role: ["Editor's Choice", "Best Balance", "Compact Living", "Natural Mood", "Long-Term Choice"][index],
  affiliateUrl: `https://hb.afl.rakuten.co.jp/hgc/test-${index}/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2F${100 + index}%2F`
}));
const makeData = () => ({
  version: "1.0",
  article: { displayTitle: "新婚の1LDKに合う1人掛けソファ5選", seoTitle: "新婚・1LDK向け1人掛けソファ5選", metaDescription: "静かな部屋づくりに合う商品を比較します。", slug: "newlywed-1ldk-one-seater-sofa", lead: "導入文", conclusion: "結論", editorialNote: "編集後記", disclosure: "広告表記" },
  sections: [{ id: "one", type: "text", heading: "選ぶ前に", level: 2, body: "本文", items: [] }],
  productBlocks: products.map((product, index) => ({ itemCode: product.itemCode, heading: `商品${index + 1}`, role: product.role, summary: "概要", bestFor: ["ふたり暮らし"], checkPoints: ["寸法"], editorComment: "編集コメント", affiliateUrl: product.affiliateUrl })),
  comparisonTable: { columns: ["商品", "価格", "楽天"], rows: products.map((product, index) => ({ itemCode: product.itemCode, product: `商品${index + 1}`, price: "商品ページで確認", review: "商品ページで確認", shop: "shop", role: product.role, feature: "特徴", bestFor: "暮らし", label: "見る", affiliateUrl: product.affiliateUrl })) },
  faq: [{ question: "質問", answer: "回答" }],
  seo: { mainKeyword: "1人掛け ソファ", relatedKeywords: ["新婚"], internalLinkIdeas: ["照明"], factsToVerify: ["寸法"] }
});
const analyze = (data, options = {}) => validation.analyze(data, products, { currentSlug: "newlywed-1ldk-one-seater-sofa", fileName: "newlywed-1ldk-one-seater-sofa.json", ...options });

expect(analyze(makeData()).errors.length === 0, "matching slug, filename and five products");
expect(analyze(makeData(), { fileName: "different-name.json" }).errors.length === 0 && analyze(makeData(), { fileName: "different-name.json" }).warnings.some(value => value.includes("ファイル名")), "filename mismatch warning only");
const reordered = makeData(); reordered.productBlocks.reverse();
expect(analyze(reordered).errors.length === 0 && analyze(reordered).warnings.some(value => value.includes("商品順")), "order mismatch warning only");
expect(validation.validateSlug("", true) === "" && validation.validateSlug("newlywed-1ldk-sofa", false) === "", "empty prompt slug and valid generated slug");
expect(analyze(makeData(), { currentSlug: "pendant-light-guide" }).warnings.some(value => value.includes("別の記事JSON")), "different article slug warning");
const otherArticle = makeData(); otherArticle.productBlocks[0].itemCode = "light:999"; otherArticle.comparisonTable.rows[0].itemCode = "light:999";
expect(analyze(otherArticle, { currentSlug: "pendant-light-guide" }).errors.some(value => value.includes("slugと商品構成の両方")), "different slug and products rejected");
const missing = makeData(); missing.productBlocks.pop();
expect(analyze(missing).errors.some(value => value.includes("productBlocksにない")), "missing itemCode rejected");
const extra = makeData(); extra.productBlocks.push({ ...extra.productBlocks[0], itemCode: "other:999" });
expect(analyze(extra).errors.some(value => value.includes("選択されていない")), "unselected itemCode rejected");
const role = makeData(); role.productBlocks[0].role = "Different";
expect(analyze(role).errors.some(value => value.includes("roleが一致")), "role mismatch rejected");
const url = makeData(); url.productBlocks[0].affiliateUrl += "x";
expect(analyze(url).errors.some(value => value.includes("affiliateUrlが一致")), "affiliateUrl mismatch rejected");
const cross = makeData(); cross.comparisonTable.rows[0].itemCode = "shop:999";
expect(analyze(cross).errors.some(value => value.includes("comparisonTable")), "productBlocks and comparison itemCode mismatch rejected");
const version = makeData(); version.version = "2.0";
expect(analyze(version).errors.some(value => value.includes("version")), "wrong version rejected");
expect((() => { try { JSON.parse("{"); return false; } catch { return true; } })(), "JSON syntax error reproducible");
const required = makeData(); delete required.productBlocks[2].affiliateUrl;
expect(analyze(required).errors.includes("productBlocks[2].affiliateUrl がありません。"), "missing key path reported");
const invalidSlug = makeData(); invalidSlug.article.slug = "新婚_sofa";
expect(analyze(invalidSlug).errors.some(value => value.includes("article.slug")), "invalid slug rejected");
expect(analyze(makeData(), { fileName: "wrong.json" }).identity.fileMatchesSlug === false, "filename and slug mismatch identified");

const html = fs.readFileSync("admin/articles.html", "utf8");
expect(html.includes("{slug}.jsonを添付しました。") && !html.includes("article.jsonを添付しました。"), "dynamic prompt filename without fixed fallback");
expect(html.includes("fileInput.value") || html.includes('els.importFile.value=""'), "file input reset");
expect(html.includes("applyImportEnhanced") && html.includes("pendingImportMeta"), "confirmed import preserves staged workflow");
