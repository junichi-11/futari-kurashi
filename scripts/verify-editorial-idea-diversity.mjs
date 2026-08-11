import fs from "node:fs";

const builder = fs.readFileSync(new URL("../admin/articles.html", import.meta.url), "utf8");
const checks = {
  "Idea Bank UI": ["次の記事候補", "Editorial Idea Bank", "このテーマで作る", "もっと見る"],
  "Idea filters": ["idea-area", "idea-category", "idea-target", "idea-challenge"],
  "Idea axes": ["ideaAreas", "ideaTargets", "ideaDefinitions", "livingArea", "challenge", "angle"],
  "Published and draft dedupe": ["publishedArticleMeta", "articles/index.json", "read(DRAFT_KEY,[])", "normalizedIdea"],
  "Builder field application": ["els.theme.value=idea.theme", "els.mainKeyword.value=idea.mainKeyword", "setSelect(els.target", "setSelect(els.room"],
  "Prompt Version 3.2": ["generatePromptV32", 'chatgptPromptVersion="3.2"', "Prompt Version 3.2"],
  "Recent title context": ["最近公開したMARGINの記事タイトル", "publishedArticleMeta.slice(0,20)"],
  "Frequency context": ["直近記事で頻出している表現", "diversityTerms", "頻度が高い語ほど今回の使用を控えてください"],
  "Margin restraint": ["1記事につき原則0〜1回", "余白を整える", "余白をつくる", "余白を添える"],
  "Structure rotation": ["用途型、悩み型、比較型、情緒型、実用型、対象型", "editorComment", "conclusion"],
  "Immutable product flow": ["itemCode、role、affiliateUrlは一字も変更せず", "productBlocksとcomparisonTable"]
};

for (const [name, markers] of Object.entries(checks)) {
  const missing = markers.filter(marker => !builder.includes(marker));
  if (missing.length) throw new Error(`${name}: missing ${missing.join(", ")}`);
  console.log(`PASS ${name}`);
}

const scripts = [...builder.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const source of scripts) new Function(source);
console.log("PASS inline JavaScript syntax");
