#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path";
import { candidateFile, requiredBriefFields } from "./article/config.mjs";
import { loadBriefs, loadJson } from "./article/brief-loader.mjs";
import { selectProducts } from "./article/product-selector.mjs";
import { publicationGate } from "./article/publication-gate.mjs";
import { writeArticle } from "./article/article-builder.mjs";
import { validateAffiliateUrl } from "./affiliate-url.mjs";
const command=process.argv[2]??"report", briefs=loadBriefs(), catalog=loadJson(candidateFile), errors=[];
const ids=new Set(),slugs=new Set(),productIds=new Set();
for(const brief of briefs){
  for(const key of requiredBriefFields)if(!(key in brief))errors.push(`${brief.articleId??"unknown"}: missing ${key}`);
  if(ids.has(brief.articleId))errors.push(`duplicate articleId: ${brief.articleId}`); ids.add(brief.articleId);
  if(slugs.has(brief.slug))errors.push(`duplicate slug: ${brief.slug}`); slugs.add(brief.slug);
  const products=selectProducts(catalog,brief.articleId);
  if(products.length!==brief.productCount)errors.push(`${brief.articleId}: expected ${brief.productCount} products, found ${products.length}`);
  if(brief.requiredSelectionRoles.length!==brief.productCount)errors.push(`${brief.articleId}: selection role count mismatch`);
  if(products.some(product=>!brief.requiredSelectionRoles.includes(product.selection_role)))errors.push(`${brief.articleId}: product selection role mismatch`);
  if(!Array.isArray(brief.comparisonAxes)||brief.comparisonAxes.length<3)errors.push(`${brief.articleId}: comparisonAxes incomplete`);
  if(!["preview_only","published"].includes(brief.publicationStatus))errors.push(`${brief.articleId}: invalid publicationStatus`);
  if(!["waiting_for_links","complete"].includes(brief.affiliateStatus))errors.push(`${brief.articleId}: invalid affiliateStatus`);
  if(!["placeholder","approved"].includes(brief.heroImageStatus))errors.push(`${brief.articleId}: invalid heroImageStatus`);
}
for(const product of catalog.products){
  if(productIds.has(product.id))errors.push(`duplicate product id: ${product.id}`); productIds.add(product.id);
  if(product.affiliate_url!==undefined&&product.affiliate_url!==null&&!validateAffiliateUrl(product.affiliate_url,product.official_url).valid)errors.push(`${product.id}: invalid affiliate URL`);
  if(product.publishable===true&&!product.affiliate_url)errors.push(`${product.id}: publishable requires affiliate URL`);
  if(!/^https:\/\/item\.rakuten\.co\.jp\//.test(product.official_url))errors.push(`${product.id}: official_url must be a Rakuten item URL`);
}
if(errors.length){errors.forEach(error=>console.error(`ERROR ${error}`));process.exit(1);}
if(command==="validate"){console.log(`Article Factory valid: ${briefs.length} briefs, ${catalog.products.length} draft products`);process.exit(0);}
if(command==="build"){
  catalog.products=catalog.products.map(product=>({affiliate_url:null,publishable:false,source_id:`src-${product.id}`,...product}));
  fs.writeFileSync(path.join(process.cwd(),candidateFile),JSON.stringify(catalog,null,2)+"\n");
  for(const brief of briefs)writeArticle(brief,selectProducts(catalog,brief.articleId));
  const previousSources=fs.existsSync(path.join(process.cwd(),"data/article-sources.json"))?loadJson("data/article-sources.json").sources:[];
  const sources={version:1,last_verified:catalog.last_verified,sources:catalog.products.map(product=>{const previous=previousSources.find(source=>source.id===product.source_id);return {id:product.source_id,product_id:product.id,official_url:product.official_url,rakuten_url:product.official_url,manufacturer:product.brand,shop:product.shop,last_verified:previous?.last_verified??catalog.last_verified,source_type:"rakuten_retailer",mutable_fields_review:previous?.mutable_fields_review??"required_before_publication"}})};
  fs.writeFileSync(path.join(process.cwd(),"data/article-sources.json"),JSON.stringify(sources,null,2)+"\n");
  fs.writeFileSync(path.join(process.cwd(),"data/sitemap-candidates.json"),JSON.stringify({generated_at:catalog.last_verified,production_sitemap_unchanged:true,candidates:briefs.map(brief=>({path:`/articles/${brief.slug}/`,publicationStatus:brief.publicationStatus,eligible:false}))},null,2)+"\n");
  const queue=["# Affiliate Link Queue","","Affiliate Intake Consoleで記事単位にリンクを収集し、JSONをvalidate / dry-runしてから人間の承認でapplyします。URL全文はこの一覧へ記録しません。",""];
  for(const brief of briefs){queue.push(`## ARTICLE ${brief.issue} — ${brief.title}`,"","| Product ID | Brand / Product | Selection Role | Official Rakuten URL | Price | Shipping | Review | Reason for Selection | Affiliate URL | Human Action |","|---|---|---|---|---|---|---|---|---|---|");for(const p of selectProducts(catalog,brief.articleId))queue.push(`| ${p.id} | ${p.brand} / ${p.name} | ${p.selection_role} | [商品ページ](${p.official_url}) | ${p.price?`¥${Number(p.price).toLocaleString("ja-JP")}`:"再確認待ち"} | ${p.shipping} | ${p.review??"未集計・再確認待ち"} | ${p.reason} | 未登録 | 楽天アフィリエイトで商品リンクを発行 |`);queue.push("");}
  fs.writeFileSync(path.join(process.cwd(),"docs/Affiliate-Link-Queue.md"),queue.join("\n"));
  const cards=briefs.map(brief=>{const products=selectProducts(catalog,brief.articleId),linked=products.filter(p=>p.affiliate_url).length,gate=publicationGate(brief,products);return `<article><p>${brief.category} · ISSUE ${brief.issue}</p><h2>${brief.title}</h2><dl><dt>Publication</dt><dd>${brief.publicationStatus}</dd><dt>Products</dt><dd>10 / 10</dd><dt>Affiliate registered</dt><dd>${linked} / 10</dd><dt>Readiness</dt><dd>${gate.pass?"Ready":"Preview only"}</dd><dt>Current blocker</dt><dd>${gate.blockers.join("、")}</dd></dl><a href="/articles/${brief.slug}/?preview=1">Previewを確認 →</a><a href="/preview/affiliate-intake/?preview=1&amp;article=${brief.articleId}">Open Intake Console →</a></article>`}).join("");
  const review=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Editorial Review Index | MARGIN</title><style>body{margin:0;background:#f4f1eb;color:#171715;font-family:Arial,sans-serif}.wrap{width:min(1100px,88vw);margin:80px auto}header{border-bottom:1px solid #d8d2c8;padding-bottom:40px}h1{font:400 clamp(42px,7vw,84px) Georgia,serif}section{display:grid;grid-template-columns:1fr 1fr;margin-top:70px;border-top:1px solid #d8d2c8}article{padding:40px;border-bottom:1px solid #d8d2c8}article:nth-child(odd){border-right:1px solid #d8d2c8}article>p,dt,dd,a{font-size:11px}dl{display:grid;grid-template-columns:120px 1fr}dt,dd{padding:8px 0;border-bottom:1px solid #d8d2c8;margin:0}a{display:inline-block;margin:22px 18px 0 0;color:inherit}@media(max-width:700px){section{grid-template-columns:1fr}article:nth-child(odd){border-right:0}}</style><script>document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('preview')!=='1')document.body.innerHTML='<main class="wrap"><h1>Preview only</h1><p>このページはProductionでは公開しません。</p></main>'})</script></head><body><main class="wrap"><header><p>MARGIN / Editorial Production Board</p><h1>Preview Review Index</h1><a href="/preview/affiliate-intake/?preview=1">Affiliate Intake Console</a></header><section>${cards}</section></main></body></html>`;
  const reviewDir=path.join(process.cwd(),"preview/editorial");fs.mkdirSync(reviewDir,{recursive:true});fs.writeFileSync(path.join(reviewDir,"index.html"),review);
  console.log(`Built ${briefs.length} preview-only articles, 40-source registry, queue, and review index. Production registry unchanged.`);process.exit(0);
}
for(const brief of briefs){const products=selectProducts(catalog,brief.articleId),gate=publicationGate(brief,products);console.log(`\n${brief.issue} ${brief.title}`);console.log(`Products ${products.length}/${brief.productCount} | Affiliate 0/${products.length} | Hero ${brief.heroImageStatus}`);console.log(`Publication BLOCKED: ${gate.blockers.join("; ")}`);console.log(`Human next: issue ${products.length} Rakuten affiliate links, verify mutable commerce data, review preview.`);}
