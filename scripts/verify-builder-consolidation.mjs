import fs from "node:fs";

const builder = fs.readFileSync(new URL("../admin/articles.html", import.meta.url), "utf8");
const researchApi = fs.readFileSync(new URL("../api/ai/research.js", import.meta.url), "utf8");

const required = [
  'numberedHeading(ideaPanel,"01"', "Advanced Planning / 詳細企画", "Prompt tools / History",
  "Advanced / Backup", "Maintenance", "context-action", "下書きを一括バックアップ",
  "下書きを復元", "価格未取得", 'img.alt=p.name||"商品画像"',
  "ideaIntent(definition)", "localSeen={slug:new Set(),mainKeyword:new Set(),theme:new Set()}",
  "OpenAI API等へ送信しません", "MARGIN rule-based planner"
];
for (const marker of required) if (!builder.includes(marker)) throw new Error(`missing: ${marker}`);

for (const obsolete of [
  "function ruleBasedEditorialPlans(", "function requestEditorialPlans(",
  "function renderEditorialPlans(", "function generatePrompt(",
  "function generatePromptV2(", "function generatePromptV3("
]) if (builder.includes(obsolete)) throw new Error(`obsolete implementation remains: ${obsolete}`);

if (/api\.openai\.com|OPENAI_API_KEY|OPENAI_MODEL|Authorization:\s*`Bearer/.test(researchApi)) {
  throw new Error("research API still contains paid AI integration");
}
if (!researchApi.includes('source:"MARGIN rule-based planner"')) throw new Error("rule-based API source missing");

for (const source of [...builder.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])) new Function(source);
new Function(researchApi.replace("export default function handler", "function handler"));
console.log("Article Builder consolidation verification PASS");
