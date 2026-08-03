import { readFile } from "node:fs/promises";

const page = await readFile("admin/products.html", "utf8");
const api = await readFile("api/rakuten/search.js", "utf8");
const proxy = await readFile("functions/api/rakuten/search.js", "utf8");
const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
scripts.forEach(source => Function(source));

const checks = {
  "Product Manager script syntax": scripts.length > 0,
  "30 results per page": page.includes("const PAGE_SIZE = 30") && api.includes("const MAX_HITS = 30"),
  "load more paging": page.includes('id="load-more"') && page.includes("currentPage + 1") && page.includes("page: String(page)"),
  "supported sorting": ["-reviewCount", "-reviewAverage", "+itemPrice", "-itemPrice", "-updateTimestamp"].every(value => page.includes(value) && api.includes(value)),
  "filters": ["min-price", "max-price", "shop-filter", "rating-filter", "review-count-filter", "availability-filter"].every(id => page.includes(`id="${id}"`)),
  "search state persistence": page.includes("margin.productManager.search.v2") && page.includes("persistSearchState"),
  "page cache": page.includes("margin.productManager.cache.v2") && page.includes("readCachedPage") && page.includes("writeCachedPage"),
  "proxy paging": ["page", "hits", "sort"].every(value => proxy.includes(`"${value}"`)),
  "Article Builder compatibility": page.includes('const STORAGE_KEY = "margin.productCandidates.v1"') && page.includes("/admin/articles.html?items="),
};

for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
