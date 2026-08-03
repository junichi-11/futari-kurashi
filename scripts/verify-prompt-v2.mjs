import { readFile } from "node:fs/promises";
import { renderArticlePageV2 } from "../lib/article-template-v2.mjs";

const source = JSON.parse(await readFile("articles/newlywed-one-room-two-seater-sofa/article.json", "utf8"));
const builder = await readFile("admin/articles.html", "utf8");
const scannerSource = builder.match(/const AFFILIATE_LEAK_MARKERS=[\s\S]+?(?=\n    function validateImportV5)/)?.[0] || "";
const scanner = scannerSource ? Function(`${scannerSource};return {findAffiliateLeakage,inspectAffiliateLeakageNodes}`)() : { findAffiliateLeakage: () => [], inspectAffiliateLeakageNodes: () => [] };
const { findAffiliateLeakage, inspectAffiliateLeakageNodes } = scanner;
const damageSource = builder.match(/function detectCopyImportDamage\(raw\)[\s\S]+?(?=\n    function showCopyDamage)/)?.[0] || "";
const detectCopyImportDamage = damageSource ? Function("stripFence",`${damageSource};return detectCopyImportDamage`)(value=>value.trim()) : () => [];
const validLeakageState = { article: {}, sections: [], productBlocks: [{ heading: "Re:CENO 2人掛けソファ", affiliateUrl: "https://hb.afl.rakuten.co.jp/hgc/example/?rafcid=value" }], comparisonTable: { rows: [{ product: "Re:CENO 2人掛けソファ", affiliateUrl: "https://hb.afl.rakuten.co.jp/hgc/example/" }] }, faq: [], seo: { mainKeyword: "新婚 2人掛けソファ" } };
const invalidLeakageState = structuredClone(validLeakageState);
invalidLeakageState.productBlocks[0].summary = "link https://hb.afl.rakuten.co.jp/hgc/example/?rafcid=value";
invalidLeakageState.comparisonTable.rows[0].feature = "item.rakuten.co.jp/shop/item";
invalidLeakageState.faq.push({ question: "https://example.test", answer: "確認" });
const invalidLeaks = findAffiliateLeakage(invalidLeakageState);
const validFileImport = { version: "1.0", article: {}, sections: [], productBlocks: Array.from({length:5},(_,index)=>({itemCode:`item-${index}`,heading:`商品 ${index+1}`,affiliateUrl:`https://hb.afl.rakuten.co.jp/hgc/item-${index}/`})), comparisonTable:{rows:Array.from({length:5},(_,index)=>({product:`商品 ${index+1}`,affiliateUrl:`https://hb.afl.rakuten.co.jp/hgc/item-${index}/`}))}, faq:[], seo:{mainKeyword:"新婚 2人掛けソファ"} };
const brokenFileImport = structuredClone(validFileImport);
brokenFileImport.productBlocks[1].heading = `リコメン堂](https://hb.afl.rakuten.co.jp/hgc/example/?pc=%22itemCode%22${"x".repeat(300)}`;
brokenFileImport.comparisonTable.rows[2].product = "商品](https://hb.afl.rakuten.co.jp/example";
brokenFileImport.seo.mainKeyword = `%22comparisonTable%22${"x".repeat(210)}`;
const mock = structuredClone(source);
mock.article.lead = `${mock.article.lead} 価格やレビューだけで決めず、部屋との相性を確かめるための視点も整理します。`;
mock.productBlocks = mock.productBlocks.map(block => ({ ...block, editorComment: block.editorComment.length >= 80 ? block.editorComment : `${block.editorComment} 比較時は部屋条件との整合も確認します。` }));
mock.comparisonTable = {
  columns: ["商品", "価格", "レビュー", "ショップ", "編集上の役割", "特徴", "向いている暮らし", "楽天"],
  rows: mock.products.map(product => {
    const block = mock.productBlocks.find(item => item.itemCode === product.itemCode);
    return { itemCode: product.itemCode, product: block.heading, price: `${Number(product.price).toLocaleString("ja-JP")}円`, review: product.reviewAverage ? `${product.reviewAverage} / ${product.reviewCount}件` : "商品ページで確認", shop: product.shopName, role: block.role, feature: block.summary.slice(0, 30), bestFor: block.bestFor[0].slice(0, 30), label: "見る", affiliateUrl: product.affiliateUrl };
  })
};
const visibleComparison = mock.comparisonTable.rows.flatMap(row => Object.entries(row).filter(([key]) => !/url/i.test(key)).map(([, value]) => String(value)));
const html = renderArticlePageV2({ ...mock, articleType: "比較・おすすめ記事", target: "新婚・2人暮らし", roomType: "ワンルーム" }, "https://futari-kurashi.pages.dev", mock.publishedAt, mock.updatedAt);
const checks = {
  "Prompt Version 2.0": builder.includes('chatgptPromptVersion="2.0"') && builder.includes("Prompt Version 2.0"),
  "v1 history compatibility": builder.includes('h.promptVersion||"1.0"'),
  "JSON Import v2 wiring": builder.includes("renderImportPreview(validateImportV5(raw))") && builder.includes("articleState={article:d.article,sections:d.sections,productBlocks:d.productBlocks,comparisonTable:d.comparisonTable,faq:d.faq,seo:d.seo}"),
  "draft persistence": builder.includes("chatgptPromptVersion,chatgptPromptHistory") && builder.includes("saveDraft();els.importDialog.close()"),
  "lead 180-280": mock.article.lead.length >= 180 && mock.article.lead.length <= 280,
  "short product headings": mock.productBlocks.every(block => block.heading.length <= 60),
  "summary 90-180": mock.productBlocks.every(block => block.summary.length >= 90 && block.summary.length <= 180),
  "editor comments 80-160": mock.productBlocks.every(block => block.editorComment.length >= 80 && block.editorComment.length <= 160),
  "bestFor and checkPoints": mock.productBlocks.every(block => block.bestFor.length >= 2 && block.bestFor.length <= 3 && block.checkPoints.length >= 3 && block.checkPoints.length <= 5),
  "five distinct product blocks": mock.productBlocks.length === 5 && new Set(mock.productBlocks.map(block => block.summary)).size === 5 && new Set(mock.productBlocks.map(block => block.editorComment)).size === 5,
  "comparison display is concise": visibleComparison.every(cell => cell.length <= 80) && visibleComparison.every(cell => !cell.includes("http")),
  "FAQ 3-5": mock.faq.length >= 3 && mock.faq.length <= 5,
  "specific facts to verify": mock.seo.factsToVerify.some(item => /寸法|梱包|素材|保証|返品/.test(item)),
  "Template v2 render": html.includes("article-hero") && html.includes("comparison-grid") && ![...html.matchAll(/<article class="compare-card">([\s\S]*?)<\/article>/g)].some(match => match[1].replace(/<[^>]+>/g, "").includes("https://")),
  "shared affiliate leakage scanner": builder.includes("function walkAffiliateLeakageNode(node,path,records)") && builder.includes("function inspectAffiliateLeakageNodes(state)") && builder.includes("function findAffiliateLeakage(state)"),
  "import leakage path reporting": builder.includes("affiliateUrlが許可フィールド外へ露出しています") && builder.includes("leakageMessage(leaks)"),
  "publish leakage validation": builder.includes("function publishIssues(){const payload=publishPayload(),issues=[],leaks=findAffiliateLeakage(payload)"),
  "debug leakage location": builder.includes("affiliateUrl leakage location") && builder.includes("all inspected string nodes") && builder.includes("`node.length:\\n${record.length}`") && builder.includes("`node:\\n${record.node}`") && builder.includes("`matched substring:\\n${record.matches.length")
  ,"affiliateUrl field allowlist": findAffiliateLeakage(validLeakageState).length === 0
  ,"leak paths are exact": ["productBlocks[0].summary", "comparisonTable.rows[0].feature", "faq[0].question"].every(path => invalidLeaks.some(leak => leak.path === path))
  ,"JSON file input": builder.includes('id="import-json-file"') && builder.includes('accept=".json,application/json"') && builder.includes("file.size>2*1024*1024") && builder.includes("await file.text()")
  ,"normal five-product JSON file": detectCopyImportDamage(JSON.stringify(validFileImport)).length === 0 && validFileImport.productBlocks.length === 5 && validFileImport.comparisonTable.rows.length === 5
  ,"copy damage diagnosis": ["](https://", "%22itemCode%22", "%22comparisonTable%22", "productBlocks[1].heading が", "seo.mainKeyword が"].every(marker => detectCopyImportDamage(JSON.stringify(brokenFileImport)).some(reason => reason.includes(marker)))
};
for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
const qualityGate = Object.values(checks).every(Boolean) ? "PASS" : "ERROR";
for (const record of inspectAffiliateLeakageNodes(validLeakageState).filter(record => ["productBlocks[0].heading", "comparisonTable.rows[0].product", "seo.mainKeyword"].includes(record.path))) {
  console.log(`TRACE ${record.path} length=${record.length} matched=${record.matches.length ? record.matches.map(match => `${match.marker}@${match.index}`).join(",") : "なし"} node=${record.node}`);
}
console.log(`Quality Gate mock: ${qualityGate}`);
if (qualityGate === "ERROR") process.exitCode = 1;
