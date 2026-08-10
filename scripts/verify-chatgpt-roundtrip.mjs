import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../admin/articles.html", import.meta.url), "utf8");
const validatorSource = fs.readFileSync(new URL("../admin/article-import-validation.js", import.meta.url), "utf8");

const required = [
  "ChatGPTで記事を作る",
  "https://chatgpt.com/",
  "記事生成プロンプトをコピーしました。",
  "生成されたJSONをここにドロップ",
  "JSONを貼り付けて読み込む",
  "processImportFile",
  "validatePastedEnhanced()",
  "renderImportPreviewBase(result)",
  "applyImportEnhanced()",
  "preview(false)",
  "previewConfirmedHash=payloadSignature()"
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`round-trip marker missing: ${marker}`);
}
if (!html.includes(".jsonファイルだけを選択してください。") || !html.includes("2*1024*1024")) {
  throw new Error("JSON file constraints are missing");
}
if (/fetch\([^)]*openai|OPENAI_API_KEY/i.test(html)) {
  throw new Error("Article Builder must not call an OpenAI API");
}

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const source of inlineScripts) new Function(source);

const sandbox = { window: {} };
vm.runInNewContext(validatorSource, sandbox);
if (typeof sandbox.window.MarginImportValidation?.analyze !== "function") {
  throw new Error("Existing import validator is not reusable");
}

console.log("ChatGPT round-trip verification PASS");
