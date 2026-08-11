import { readFile } from "node:fs/promises";

const admin = await readFile("admin/articles.html", "utf8");
const source = admin.match(/function plannerCategoryV2[\s\S]+?(?=\n    function renderEditorialPlansV2)/)?.[0] || "";
const { ruleBasedEditorialPlansV2 } = Function(`${source};return {ruleBasedEditorialPlansV2}`)();
const products = [
  { name: "リコメン堂 幅120cm変形ラウンドテーブル", shopName: "リコメン堂", price: 29990, reviewCount: 82, reviewAverage: 4.4, role: "Best Balance", description: "曲線のダイニングテーブル", category: "ダイニングテーブル" },
  { name: "天然木オーバルテーブル", shopName: "家具店A", price: 45900, reviewCount: 20, reviewAverage: 4.6, role: "Natural Mood", description: "天然木", category: "ダイニングテーブル" },
  { name: "伸長式ダイニングテーブル", shopName: "家具店B", price: 59800, reviewCount: 15, reviewAverage: 4.2, role: "Long-Term Choice", description: "伸長式", category: "ダイニングテーブル" }
];
const plans = ruleBasedEditorialPlansV2({ products });
const required = ["planningTheme", "displayTitle", "seoTitle", "metaDescription", "slug", "mainKeyword", "relatedKeywords", "target", "livingArea", "editorialThemes", "articleType", "rationale"];
const checks = {
  "five plans without theme input": plans.length === 5,
  "required planning fields": plans.every(plan => required.every(key => plan[key] !== undefined)),
  "planning and display titles differ": plans.every(plan => plan.planningTheme !== plan.displayTitle),
  "display title target length": plans.every(plan => plan.displayTitle.length >= 28 && plan.displayTitle.length <= 45),
  "unique plans": new Set(plans.map(plan => `${plan.planningTheme}|${plan.displayTitle}`)).size === 5,
  "SEO batch fields": plans.every(plan => plan.seoTitle && plan.metaDescription && plan.slug && plan.mainKeyword && plan.relatedKeywords.length),
  "draft compatibility": admin.includes("a.planningTheme=a.theme") && admin.includes("els.generatePlans.onclick=requestEditorialPlansV2"),
  "overwrite confirmation": admin.includes("入力済みの企画・タイトル・SEO情報を選択した企画で上書きしますか？")
};
for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
