import { readFile, readdir } from "node:fs/promises";

const origin = "https://futari-kurashi.vercel.app";
const index = JSON.parse(await readFile("articles/index.json", "utf8"));
const builder = await readFile("admin/articles.html", "utf8");
const top = await readFile("index.html", "utf8");
const list = await readFile("articles/index.html", "utf8");
const sitemap = await readFile("sitemap.xml", "utf8");
const feed = await readFile("feed.xml", "utf8");
const repositoryFiles = ["index.html", "articles/index.html", "articles/index.json", "admin/articles.html", "README.md", "sitemap.xml", "feed.xml"];
for (const directory of await readdir("articles", { withFileTypes: true })) if (directory.isDirectory()) repositoryFiles.push(`articles/${directory.name}/article.json`, `articles/${directory.name}/index.html`);
const banned = "\u30ef\u30f3\u30eb\u30fc\u30e0";
const keywords = index.articles.map(article => article.mainKeyword);
const checks = {
  "published content excludes retired term": !(await Promise.all(repositoryFiles.map(file => readFile(file, "utf8")))).some(content => content.includes(banned)),
  "all metadata uses livingArea": index.articles.every(article => article.livingArea && !("roomType" in article)),
  "livingArea filter": builder.includes('id="idea-area"') && list.includes("params.get('area')") && !builder.includes('id="idea-room"'),
  "Idea Bank candidate keys": builder.includes("target,category:definition.category,challenge:definition.challenge,angle:definition.angle,mainKeyword"),
  "unique main keywords": new Set(keywords).size === keywords.length,
  "canonical origin": top.includes(`${origin}/`) && list.includes(`${origin}/articles/`) && sitemap.includes(origin) && feed.includes(origin),
  "no mirror canonical": !sitemap.includes("pages.dev") && !feed.includes("pages.dev") && !list.includes("pages.dev"),
  "high resolution index images": index.articles.every(article => article.thumbnail && !/_ex=128x128/.test(article.thumbnail)),
  "responsive card images": (await readFile("assets/article-cards.js", "utf8")).includes("srcset")
};
for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
