import { readFile } from "node:fs/promises";

const slug = "newlywed-one-room-two-seater-sofa";
const article = JSON.parse(await readFile(`articles/${slug}/article.json`, "utf8"));
const index = JSON.parse(await readFile("articles/index.json", "utf8"));
const detail = await readFile(`articles/${slug}/index.html`, "utf8");
const top = await readFile("index.html", "utf8");
const list = await readFile("articles/index.html", "utf8");
const sitemap = await readFile("sitemap.xml", "utf8");
const feed = await readFile("feed.xml", "utf8");
const metadata = index.articles.find(entry => entry.slug === slug);
const checks = {
  "published article index": index.articles.length > 0 && index.articles.every(entry => entry.status === "Published"),
  "five products": article.products.length === 5 && article.productBlocks.length === 5,
  "comparison and FAQ": article.comparisonTable.rows.length === 5 && article.faq.length > 0,
  "product and comparison affiliate CTAs": (detail.match(/nofollow sponsored noopener/g) || []).length >= article.products.length * 2 && (detail.match(/楽天市場で見る/g) || []).length >= article.products.length * 2,
  "strict Rakuten links": article.products.every(product => { try { const url = new URL(product.affiliateUrl); return url.protocol === "https:" && url.hostname === "hb.afl.rakuten.co.jp"; } catch { return false; } }),
  "top discovery link": top.includes('href="/articles/"') && top.includes("/articles/index.json"),
  "list normal links": list.includes("MarginArticleCards.render") && list.includes('rel="canonical"') && list.includes('/assets/article-cards.js'),
  "detail navigation": detail.includes('href="/articles/"') && detail.includes('href="/"') && detail.includes("MORE FROM MARGIN"),
  "detail schemas and OG": detail.includes('"@type":"Article"') && detail.includes('"@type":"BreadcrumbList"') && detail.includes('property="og:image"'),
  "sitemap URLs": ["/", "/articles/", `/articles/${slug}/`].every(path => sitemap.includes(`https://futari-kurashi.vercel.app${path}`)),
  "feed article": Boolean(metadata) && feed.includes(metadata.displayTitle) && feed.includes(`https://futari-kurashi.vercel.app${metadata.url}`),
  "XML envelope": sitemap.startsWith("<?xml") && sitemap.endsWith("</urlset>\n") && feed.startsWith("<?xml") && feed.endsWith("</rss>\n")
};
for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
