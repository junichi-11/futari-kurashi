import { readFile } from "node:fs/promises";

const article = JSON.parse(await readFile("articles/newlywed-one-room-two-seater-sofa/article.json", "utf8"));
const index = JSON.parse(await readFile("articles/index.json", "utf8"));
const detail = await readFile("articles/newlywed-one-room-two-seater-sofa/index.html", "utf8");
const top = await readFile("index.html", "utf8");
const list = await readFile("articles/index.html", "utf8");
const sitemap = await readFile("sitemap.xml", "utf8");
const feed = await readFile("feed.xml", "utf8");
const checks = {
  "one published article": index.articles.length === 1 && index.articles[0].status === "Published",
  "five products": article.products.length === 5 && article.productBlocks.length === 5,
  "comparison and FAQ": article.comparisonTable.rows.length === 5 && article.faq.length > 0,
  "product and comparison affiliate CTAs": (detail.match(/nofollow sponsored noopener/g) || []).length === article.products.length * 2,
  "strict Rakuten links": article.products.every(product => { try { const url = new URL(product.affiliateUrl); return url.protocol === "https:" && url.hostname === "hb.afl.rakuten.co.jp"; } catch { return false; } }),
  "top discovery link": top.includes('href="/articles/"') && top.includes("/articles/index.json"),
  "list normal links": list.includes("a.url") && list.includes('rel="canonical"'),
  "detail navigation": detail.includes("記事一覧") && detail.includes("トップへ戻る") && detail.includes("MORE FROM MARGIN"),
  "detail schemas and OG": detail.includes('"@type":"Article"') && detail.includes('"@type":"BreadcrumbList"') && detail.includes('property="og:image"'),
  "sitemap URLs": ["/", "/articles/", `/articles/${index.articles[0].slug}/`].every(path => sitemap.includes(`https://futari-kurashi.pages.dev${path}`)),
  "feed article": feed.includes(index.articles[0].displayTitle) && feed.includes(`https://futari-kurashi.pages.dev${index.articles[0].url}`),
  "XML envelope": sitemap.startsWith("<?xml") && sitemap.endsWith("</urlset>\n") && feed.startsWith("<?xml") && feed.endsWith("</rss>\n")
};
for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
