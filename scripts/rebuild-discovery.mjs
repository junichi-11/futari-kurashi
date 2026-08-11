import { readFile, writeFile } from "node:fs/promises";
import { renderArticlesIndexPage, renderSitemapXml, renderFeedXml } from "../lib/discovery-renderers.mjs";
import { renderArticlePageV3 } from "../lib/article-template-v2.mjs";
import { highResolutionRakutenImage, normalizeLivingArea, PUBLIC_SITE_ORIGIN } from "../lib/site-config.mjs";

const index = JSON.parse(await readFile("articles/index.json", "utf8"));
for (const article of index.articles) {
  const record = JSON.parse(await readFile(`articles/${article.slug}/article.json`, "utf8"));
  article.livingArea = normalizeLivingArea(article);
  article.thumbnail = highResolutionRakutenImage(record.article?.cardImage || record.article?.coverImage || record.article?.heroImage || record.products?.[0]?.imageUrl || article.thumbnail);
  delete article.roomType;
  await writeFile(`articles/${article.slug}/index.html`, renderArticlePageV3({ ...record, articleType: article.articleType, target: article.target, livingArea: article.livingArea, productCategory: article.productCategory, editorialThemes: article.editorialThemes }, PUBLIC_SITE_ORIGIN, record.publishedAt, record.updatedAt), "utf8");
}
await writeFile("articles/index.json", `${JSON.stringify(index, null, 2)}\n`, "utf8");
await writeFile("articles/index.html", renderArticlesIndexPage(PUBLIC_SITE_ORIGIN), "utf8");
await writeFile("sitemap.xml", renderSitemapXml(index, PUBLIC_SITE_ORIGIN), "utf8");
await writeFile("feed.xml", renderFeedXml(index, PUBLIC_SITE_ORIGIN), "utf8");
console.log(`Rebuilt discovery files for ${index.articles.length} article(s).`);
