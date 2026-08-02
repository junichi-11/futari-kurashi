import { createHash, timingSafeEqual } from "node:crypto";
import { renderArticlePage, renderArticlesIndexPage, renderSitemapXml, renderFeedXml } from "../../lib/discovery-renderers.mjs";

export const config = { maxDuration: 180 };

const REQUIRED_ENV = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH", "MARGIN_PUBLISH_SECRET"];
const RESERVED = new Set(["admin", "api", "assets", "articles", "index", "sitemap", "feed", "rss", "robots", "favicon"]);
const ALLOWED_ORIGIN = "https://futari-kurashi.pages.dev";
const recentPublishes = new Map();
const encoder = new TextEncoder();

const json = (res, status, body, origin = ALLOWED_ORIGIN) => {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Origin");
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  return res.json(body);
};
const allowedOrigin = (origin) => origin === ALLOWED_ORIGIN || /^https:\/\/[a-z0-9-]+\.futari-kurashi\.pages\.dev$/i.test(origin || "");
const safeEqual = (left, right) => {
  const a = createHash("sha256").update(String(left || "")).digest();
  const b = createHash("sha256").update(String(right || "")).digest();
  return timingSafeEqual(a, b);
};
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const xml = (value) => esc(value);
const cleanText = (value) => String(value ?? "").replace(/<\/?(?:script|iframe|object|embed)[^>]*>/gi, "").trim();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const iso = (value, fallback = new Date().toISOString()) => Number.isNaN(Date.parse(value || "")) ? fallback : new Date(value).toISOString();
const slugValid = (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 && !RESERVED.has(slug);
const affiliateValid = (value) => { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "hb.afl.rakuten.co.jp"; } catch { return false; } };
const githubHeaders = (token) => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" });

async function githubRequest(path, env, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${env.owner}/${env.repo}${path}`, { ...options, headers: { ...githubHeaders(env.token), ...(options.headers || {}) } });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) { const error = new Error(`GitHub API ${response.status}`); error.status = response.status; error.code = response.headers.get("x-ratelimit-remaining") === "0" ? "rate_limit" : "github"; throw error; }
  return data;
}
async function readJson(path, env) {
  try {
    const data = await githubRequest(`/contents/${path}?ref=${encodeURIComponent(env.branch)}`, env);
    return JSON.parse(Buffer.from(data.content || "", "base64").toString("utf8"));
  } catch (error) { if (error.status === 404) return null; throw error; }
}

function validatePayload(body) {
  const errors = [];
  const articleId = cleanText(body?.articleId), article = body?.article || {}, slug = cleanText(article.slug);
  if (!articleId) errors.push("articleIdがありません。");
  if (!slugValid(slug)) errors.push("URLスラッグが不正です。");
  for (const key of ["displayTitle", "seoTitle", "metaDescription", "lead"]) if (!cleanText(article[key])) errors.push(`${key}がありません。`);
  if (!Array.isArray(body?.sections) || body.sections.filter((section) => Number(section.level || 2) === 2).length < 3) errors.push("H2が3件以上必要です。");
  if (body?.qualityGate?.status === "ERROR") errors.push("Quality GateにERRORがあります。");
  const products = Array.isArray(body?.products) ? body.products : [], blocks = Array.isArray(body?.productBlocks) ? body.productBlocks : [];
  const selected = new Map(products.map((product) => [cleanText(product.itemCode), cleanText(product.affiliateUrl)]));
  for (const product of products) if (!affiliateValid(cleanText(product.affiliateUrl))) errors.push(`affiliateUrlが不正です: ${cleanText(product.itemCode)}`);
  for (const block of blocks) { const expected = selected.get(cleanText(block.itemCode)), actual = cleanText(block.affiliateUrl); if (!expected || actual !== expected || !affiliateValid(actual)) errors.push(`商品リンクが選択商品と一致しません: ${cleanText(block.itemCode)}`); }
  const disclosure = cleanText(article.disclosure);
  if (!disclosure) errors.push("広告表記がありません。");
  if (!/価格|在庫|送料|納期/.test(disclosure)) errors.push("価格変動の注意書きがありません。");
  if (/<\/?(?:script|iframe|object|embed)\b/i.test(JSON.stringify(body)) || /javascript\s*:/i.test(JSON.stringify(body))) errors.push("許可されていないHTMLまたはURLが含まれています。");
  return { errors: [...new Set(errors)], articleId, slug, products, blocks };
}

function renderArticle(payload, origin, publishedAt, updatedAt) {
  const { article, sections = [], products = [], productBlocks = [], comparisonTable = {}, faq = [] } = payload;
  const slug = cleanText(article.slug), canonical = `${origin}/articles/${slug}/`, blockMap = new Map(productBlocks.map((block) => [cleanText(block.itemCode), block]));
  const sectionHtml = sections.map((section) => `<section><h2>${esc(cleanText(section.heading))}</h2><p>${esc(cleanText(section.body)).replace(/\n/g, "<br>")}</p></section>`).join("");
  const productHtml = products.map((product) => { const block = blockMap.get(cleanText(product.itemCode)) || {}; return `<section class="product"><img src="${esc(cleanText(product.imageUrl))}" alt="${esc(cleanText(product.name))}"><div><p class="role">${esc(cleanText(block.role || product.role))}</p><h3>${esc(cleanText(block.heading || product.name))}</h3><p class="facts"><strong>¥${Number(product.price || 0).toLocaleString("ja-JP")}</strong> · ${esc(cleanText(product.shopName))} · ${esc(product.reviewAverage || "評価未集計")} (${esc(product.reviewCount || 0)})</p><p>${esc(cleanText(block.summary || product.catchcopy))}</p>${(block.bestFor || []).length ? `<h4>向いている暮らし</h4><ul>${block.bestFor.map((item) => `<li>${esc(cleanText(item))}</li>`).join("")}</ul>` : ""}${(block.checkPoints || []).length ? `<h4>確認ポイント</h4><ul>${block.checkPoints.map((item) => `<li>${esc(cleanText(item))}</li>`).join("")}</ul>` : ""}<p class="editorial">${esc(cleanText(block.editorComment))}</p><a class="cta" href="${esc(cleanText(product.affiliateUrl))}" target="_blank" rel="nofollow sponsored noopener">楽天で見る</a></div></section>`; }).join("");
  const comparisonRows = Array.isArray(comparisonTable.rows) ? comparisonTable.rows : [];
  const comparison = comparisonRows.length ? `<section><h2>商品を比べる</h2><div class="comparison">${comparisonRows.map((row) => `<article>${(Array.isArray(row) ? row : Object.values(row || {})).map((cell) => `<p>${esc(cleanText(cell))}</p>`).join("")}</article>`).join("")}</div></section>` : "";
  const faqHtml = faq.length ? `<section><h2>よくある質問</h2>${faq.map((item) => `<details><summary>${esc(cleanText(item.question))}</summary><p>${esc(cleanText(item.answer))}</p></details>`).join("")}</section>` : "";
  const articleSchema = { "@context": "https://schema.org", "@type": "Article", headline: cleanText(article.displayTitle), description: cleanText(article.metaDescription), datePublished: publishedAt, dateModified: updatedAt, mainEntityOfPage: canonical, publisher: { "@type": "Organization", name: "MARGIN" } };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "MARGIN", item: origin }, { "@type": "ListItem", position: 2, name: "Articles", item: `${origin}/articles/` }, { "@type": "ListItem", position: 3, name: cleanText(article.displayTitle), item: canonical }] };
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cleanText(article.seoTitle))}</title><meta name="description" content="${esc(cleanText(article.metaDescription))}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${esc(cleanText(article.displayTitle))}"><meta property="og:description" content="${esc(cleanText(article.metaDescription))}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><script type="application/ld+json">${JSON.stringify(articleSchema).replace(/</g, "\\u003c")}</script><script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, "\\u003c")}</script><style>body{margin:0;background:#faf9f6;color:#171714;font-family:-apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif;line-height:1.9}header,main,footer{width:min(1080px,calc(100% - 40px));margin:auto}.brand{display:inline-block;padding:24px 0;color:#171714;text-decoration:none;letter-spacing:.18em}article>header{padding:80px 0 56px;border-bottom:1px solid #d9d3c8}h1,h2,h3{font-family:"Yu Mincho",serif;font-weight:400}h1{font-size:clamp(42px,7vw,82px);line-height:1.2}h2{font-size:clamp(28px,4vw,46px)}section{margin:88px 0}.meta,.role,.notice{font-size:12px;color:#706b63}.disclosure,.notice{padding:20px;border:1px solid #d9d3c8}.product{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:48px;padding-top:48px;border-top:1px solid #d9d3c8}.product img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#f1eee8}.cta{display:inline-block;margin-top:20px;padding:12px 20px;background:#171714;color:#fff;text-decoration:none}.comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:#d9d3c8}.comparison article{background:#faf9f6;padding:18px}.comparison p{overflow-wrap:anywhere}details{border-top:1px solid #d9d3c8;padding:18px 0}footer{padding:80px 0}@media(max-width:680px){.product{grid-template-columns:1fr;gap:24px}article>header{padding-top:48px}section{margin:64px 0}}html,body{max-width:100%;overflow-x:hidden}</style></head><body data-article-id="${esc(payload.articleId)}"><header><a class="brand" href="/">MARGIN</a></header><main><article><header><p class="meta">Published ${publishedAt.slice(0,10)} · Updated ${updatedAt.slice(0,10)}</p><h1>${esc(cleanText(article.displayTitle))}</h1><p>${esc(cleanText(article.lead))}</p></header><aside class="disclosure">${esc(cleanText(article.disclosure))}</aside>${sectionHtml}${productHtml}${comparison}${faqHtml}${article.conclusion ? `<section><h2>結び</h2><p>${esc(cleanText(article.conclusion))}</p></section>` : ""}${article.editorialNote ? `<aside class="notice"><strong>Editor's Note</strong><p>${esc(cleanText(article.editorialNote))}</p></aside>` : ""}<p class="notice">価格・在庫・送料・納期は変動します。購入前に楽天の商品ページで最新情報をご確認ください。</p></article></main><footer><a href="/">MARGINトップへ戻る</a></footer></body></html>`;
}

function renderIndexHtml(origin) { return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Articles | MARGIN</title><meta name="description" content="MARGINの記事一覧"><style>body{margin:0;background:#faf9f6;color:#171714;font-family:-apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif}header,main,footer{width:min(1100px,calc(100% - 40px));margin:auto}header,footer{padding:32px 0}a{color:inherit}.brand{letter-spacing:.18em;text-decoration:none}.hero{padding:80px 0}h1{font:400 clamp(48px,8vw,96px)/1.1 "Yu Mincho",serif}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:64px 32px}.card{border-top:1px solid #d9d3c8;padding-top:20px}.card img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#f1eee8}.card a{text-decoration:none}.meta{font-size:11px;color:#706b63}.empty{padding:60px 0;border-top:1px solid #d9d3c8}@media(max-width:640px){.grid{grid-template-columns:1fr}.hero{padding:48px 0}}html,body{max-width:100%;overflow-x:hidden}</style></head><body><header><a class="brand" href="/">MARGIN</a></header><main><section class="hero"><p class="meta">MARGIN JOURNAL</p><h1>Articles</h1></section><div id="articles" class="grid"></div></main><footer>© MARGIN</footer><script>fetch('/articles/index.json').then(r=>r.json()).then(data=>{const root=document.querySelector('#articles');if(!data.articles.length){root.innerHTML='<p class="empty">記事は準備中です。</p>';return}root.innerHTML=data.articles.map(a=>'<article class="card"><a href="'+a.url+'">'+(a.thumbnail?'<img src="'+a.thumbnail.replace(/[&<>"']/g,'')+'" alt="">':'')+'<p class="meta">'+a.publishedAt.slice(0,10)+' · '+(a.articleType||'Editorial')+'</p><h2>'+a.displayTitle.replace(/[&<>]/g,'')+'</h2><p>'+a.metaDescription.replace(/[&<>]/g,'')+'</p><small>'+a.productCount+' products</small></a></article>').join('')}).catch(()=>document.querySelector('#articles').innerHTML='<p class="empty">記事一覧を読み込めませんでした。</p>')</script></body></html>`; }
function renderSitemap(index, origin) { const entries = [{ url: `${origin}/`, lastmod: index.updatedAt }, { url: `${origin}/articles/`, lastmod: index.updatedAt }, ...index.articles.map((article) => ({ url: `${origin}${article.url}`, lastmod: article.updatedAt }))]; return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url><loc>${xml(entry.url)}</loc><lastmod>${xml(entry.lastmod.slice(0,10))}</lastmod></url>`).join("\n")}\n</urlset>\n`; }
function renderFeed(index, origin) { const items = index.articles.slice(0,20).map((article) => `<item><title>${xml(article.displayTitle)}</title><link>${xml(`${origin}${article.url}`)}</link><guid isPermaLink="true">${xml(`${origin}${article.url}`)}</guid><pubDate>${new Date(article.updatedAt).toUTCString()}</pubDate><description>${xml(article.metaDescription)}</description></item>`).join(""); return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>MARGIN Journal</title><link>${xml(`${origin}/articles/`)}</link><description>ふたり暮らしの家具とインテリアを静かに選ぶ</description><language>ja</language><lastBuildDate>${new Date(index.updatedAt).toUTCString()}</lastBuildDate>${items}</channel></rss>\n`; }

async function commitFiles(files, message, env) {
  const ref = await githubRequest(`/git/ref/heads/${encodeURIComponent(env.branch)}`, env), parentSha = ref.object.sha;
  const parent = await githubRequest(`/git/commits/${parentSha}`, env), tree = [];
  for (const [path, content] of Object.entries(files)) { const blob = await githubRequest("/git/blobs", env, { method: "POST", body: JSON.stringify({ content, encoding: "utf-8" }) }); tree.push({ path, mode: "100644", type: "blob", sha: blob.sha }); }
  const newTree = await githubRequest("/git/trees", env, { method: "POST", body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const commit = await githubRequest("/git/commits", env, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }) });
  await githubRequest(`/git/refs/heads/${encodeURIComponent(env.branch)}`, env, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") { if (!allowedOrigin(origin)) return json(res, 403, { error: "Originが許可されていません。" }, null); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Margin-Publish-Key, Idempotency-Key"); return json(res, 204, {}, origin); }
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { error: "POSTのみ利用できます。" }, allowedOrigin(origin) ? origin : null); }
  if (!allowedOrigin(origin)) return json(res, 403, { error: "Originが許可されていません。" }, null);
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) return json(res, 415, { error: "Content-Typeはapplication/jsonにしてください。" }, origin);
  if (Number(req.headers["content-length"] || 0) > 2 * 1024 * 1024 || Buffer.byteLength(JSON.stringify(req.body || {})) > 2 * 1024 * 1024) return json(res, 413, { error: "公開データが2MBを超えています。" }, origin);
  const missing = REQUIRED_ENV.filter((name) => !String(process.env[name] || "").trim());
  if (missing.length) return json(res, 500, { error: "VercelのEnvironment Variablesが不足しています。", missing }, origin);
  if (!safeEqual(req.headers["x-margin-publish-key"], process.env.MARGIN_PUBLISH_SECRET)) return json(res, 401, { error: "公開認証に失敗しました。" }, origin);
  const validation = validatePayload(req.body);
  if (validation.errors.length) return json(res, 400, { error: "公開前検証に失敗しました。", details: validation.errors }, origin);
  const env = { token: process.env.GITHUB_TOKEN, owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, branch: process.env.GITHUB_BRANCH };
  const siteOrigin = String(process.env.PUBLIC_SITE_ORIGIN || ALLOWED_ORIGIN).replace(/\/$/, ""), now = new Date().toISOString();
  const normalized = { ...req.body, articleId: validation.articleId, status: "Published", article: { ...req.body.article, slug: validation.slug }, updatedAt: now };
  const contentHash = sha256(JSON.stringify({ ...normalized, publishedAt: undefined, updatedAt: undefined, generatedHtml: undefined }));
  const idempotencyKey = String(req.headers["idempotency-key"] || `${validation.articleId}:${contentHash}`), rateKey = sha256(String(req.headers["x-margin-publish-key"]));
  const recent = recentPublishes.get(rateKey); if (recent && Date.now() - recent < 10000) return json(res, 429, { error: "公開操作は10秒以上空けてください。" }, origin);
  recentPublishes.set(rateKey, Date.now());
  try {
    const existingIndex = await readJson("articles/index.json", env) || { version: "1.0", updatedAt: now, articles: [] };
    const slugEntry = existingIndex.articles.find((article) => article.slug === validation.slug);
    if (slugEntry && slugEntry.articleId !== validation.articleId) return json(res, 409, { error: "同じURLスラッグの記事がすでに存在します。" }, origin);
    const existingArticle = await readJson(`articles/${validation.slug}/article.json`, env);
    if (existingArticle?.source?.contentHash === contentHash) return json(res, 200, { status: "published", articleId: validation.articleId, slug: validation.slug, publishedUrl: `${siteOrigin}/articles/${validation.slug}/`, githubCommitSha: existingArticle.source.githubCommitSha || "", githubCommitUrl: existingArticle.source.githubCommitSha ? `https://github.com/${env.owner}/${env.repo}/commit/${existingArticle.source.githubCommitSha}` : "", publishedAt: existingArticle.publishedAt, updatedAt: existingArticle.updatedAt, deploymentVerified: true, idempotent: true }, origin);
    const publishedAt = existingArticle?.publishedAt || iso(req.body.publishedAt, now), updatedAt = now;
    const articleRecord = { version: "1.0", articleId: validation.articleId, status: "Published", publishedAt, updatedAt, article: normalized.article, sections: normalized.sections || [], products: normalized.products || [], productBlocks: normalized.productBlocks || [], comparisonTable: normalized.comparisonTable || {}, faq: normalized.faq || [], seo: normalized.seo || {}, qualityGate: normalized.qualityGate || {}, source: { promptVersion: cleanText(normalized.source?.promptVersion), builderVersion: cleanText(normalized.source?.builderVersion || "1.0"), contentHash } };
    const entry = { articleId: validation.articleId, slug: validation.slug, url: `/articles/${validation.slug}/`, displayTitle: cleanText(normalized.article.displayTitle), seoTitle: cleanText(normalized.article.seoTitle), metaDescription: cleanText(normalized.article.metaDescription), publishedAt, updatedAt, articleType: cleanText(normalized.articleType), target: cleanText(normalized.target), roomType: cleanText(normalized.roomType), editorialThemes: Array.isArray(normalized.editorialThemes) ? normalized.editorialThemes.map(cleanText) : [], mainKeyword: cleanText(normalized.seo?.mainKeyword), productCount: validation.products.length, thumbnail: cleanText(validation.products[0]?.imageUrl), status: "Published" };
    const articles = existingIndex.articles.filter((article) => article.articleId !== validation.articleId && article.slug !== validation.slug); articles.push(entry); articles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const index = { version: "1.0", updatedAt, articles }, publishedUrl = `${siteOrigin}/articles/${validation.slug}/`;
    const files = { [`articles/${validation.slug}/index.html`]: renderArticlePage({ ...normalized, publishedAt, updatedAt }, siteOrigin, publishedAt, updatedAt), [`articles/${validation.slug}/article.json`]: JSON.stringify(articleRecord, null, 2) + "\n", "articles/index.json": JSON.stringify(index, null, 2) + "\n", "articles/index.html": renderArticlesIndexPage(siteOrigin), "sitemap.xml": renderSitemapXml(index, siteOrigin), "feed.xml": renderFeedXml(index, siteOrigin) };
    const action = existingArticle ? "Update" : "Publish", message = `${action} article: ${cleanText(normalized.article.displayTitle)}\n\nArticle ID: ${validation.articleId}\nSlug: ${validation.slug}\nPublished URL: ${publishedUrl}\nProduct count: ${validation.products.length}`;
    let commitSha; try { commitSha = await commitFiles(files, message, env); } catch (error) { if (error.status === 422 || error.status === 409) commitSha = await commitFiles(files, message, env); else throw error; }
    articleRecord.source.githubCommitSha = commitSha;
    const timeout = Math.min(Math.max(Number(process.env.PUBLISH_DEPLOY_TIMEOUT_MS) || 120000, 5000), 240000), started = Date.now(); let deploymentVerified = false;
    while (Date.now() - started < timeout) { await new Promise((resolve) => setTimeout(resolve, 5000)); try { const response = await fetch(publishedUrl, { headers: { "Cache-Control": "no-cache" } }); if (response.ok && (await response.text()).includes(validation.articleId)) { deploymentVerified = true; break; } } catch { /* deployment is still propagating */ } }
    return json(res, 200, { status: deploymentVerified ? "published" : "deploying", articleId: validation.articleId, slug: validation.slug, publishedUrl, githubCommitSha: commitSha, githubCommitUrl: `https://github.com/${env.owner}/${env.repo}/commit/${commitSha}`, publishedAt, updatedAt, deploymentVerified, ...(deploymentVerified ? {} : { message: "GitHubへの公開は完了しています。Cloudflareの反映を待っています。" }), idempotencyKey }, origin);
  } catch (error) {
    if (error.code === "rate_limit") return json(res, 429, { error: "GitHub APIのレート制限に達しました。" }, origin);
    if (error.status === 401 || error.status === 403) return json(res, 502, { error: "GitHub Tokenの権限を確認してください。" }, origin);
    return json(res, 502, { error: "GitHubへの公開処理に失敗しました。" }, origin);
  }
}
