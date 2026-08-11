import { readFile } from "node:fs/promises";
import { editorialPublishText, hasRetiredLayoutTerm } from "../api/publish/article.js";

const expect = (condition, label) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
};

const base = {
  livingArea: "リビング",
  article: { displayTitle: "ふたりで選ぶソファ", seoTitle: "リビング向けソファ比較", metaDescription: "リビングで使うソファを比較します。", lead: "設置場所と動線から比較します。", conclusion: "搬入条件も確認します。", editorialNote: "編集部の比較メモ", disclosure: "価格・在庫・送料・納期は商品ページで確認してください。" },
  sections: [{ heading: "選ぶ基準", body: "幅と動線を確認します。", items: ["搬入経路"] }],
  products: [{ itemCode: "shop:1", name: "ワンルーム向けソファ", catchcopy: "ワンルームにもおすすめ", shopName: "ショップ", affiliateUrl: "https://hb.afl.rakuten.co.jp/example" }],
  productBlocks: [{ itemCode: "shop:1", heading: "コンパクトソファ", summary: "幅を抑えた商品です。", bestFor: ["リビング"], checkPoints: ["寸法"], editorComment: "動線を確認したい商品です。", affiliateUrl: "https://hb.afl.rakuten.co.jp/example" }],
  comparisonTable: { columns: ["商品", "特徴"], rows: [{ itemCode: "shop:1", product: "コンパクトソファ", feature: "省スペース", affiliateUrl: "https://hb.afl.rakuten.co.jp/example" }] },
  faq: [{ question: "搬入前に見る点は？", answer: "経路を確認してください。" }],
  seo: { mainKeyword: "リビング ソファ", relatedKeywords: ["ソファ 比較"], internalLinkIdeas: ["テーブル選び"], factsToVerify: ["寸法"] }
};

expect(!hasRetiredLayoutTerm(base), "raw product name and catchcopy are excluded");
expect(hasRetiredLayoutTerm({ ...base, article: { ...base.article, lead: "ワンルーム向けの記事です。" } }), "article copy is rejected");
expect(hasRetiredLayoutTerm({ ...base, sections: [{ ...base.sections[0], body: "ワンルームで使う家具" }] }), "section copy is rejected");
expect(hasRetiredLayoutTerm({ ...base, comparisonTable: { ...base.comparisonTable, rows: [{ ...base.comparisonTable.rows[0], feature: "ワンルーム向け" }] } }), "comparison display copy is rejected");
expect(editorialPublishText(base).every(value => !value.includes("ワンルーム")), "editorial text collector excludes Rakuten raw metadata");
expect(base.livingArea === "リビング" && !hasRetiredLayoutTerm(base), "livingArea article remains publishable");

const builder = await readFile("admin/articles.html", "utf8");
expect(builder.includes("function editorialPublishText(payload)") && builder.includes("if(hasRetiredLayoutTerm(payload))"), "client uses scoped editorial validation");
expect(!builder.includes('content=JSON.stringify(payload)'), "client no longer scans the full publish payload");
