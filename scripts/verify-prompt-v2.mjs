import { readFile } from "node:fs/promises";
import { renderArticlePageV2 } from "../lib/article-template-v2.mjs";

const source = JSON.parse(await readFile("articles/newlywed-one-room-two-seater-sofa/article.json", "utf8"));
const builder = await readFile("admin/articles.html", "utf8");
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
  "JSON Import v2 wiring": builder.includes("validateImportV5(els.importJson.value)") && builder.includes("articleState={article:d.article,sections:d.sections,productBlocks:d.productBlocks,comparisonTable:d.comparisonTable,faq:d.faq,seo:d.seo}"),
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
  "Template v2 render": html.includes("article-hero") && html.includes("comparison-grid") && ![...html.matchAll(/<article class="compare-card">([\s\S]*?)<\/article>/g)].some(match => match[1].replace(/<[^>]+>/g, "").includes("https://"))
};
for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
const qualityGate = Object.values(checks).every(Boolean) ? "PASS" : "ERROR";
console.log(`Quality Gate mock: ${qualityGate}`);
if (qualityGate === "ERROR") process.exitCode = 1;
