#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { normalizeItemUrl, validateAffiliateUrl } from "./affiliate-url.mjs";

const [command,file,...flags]=process.argv.slice(2);
const fail=message=>{console.error(`ERROR ${message}`);process.exit(1);};
if(!["validate","import"].includes(command)||!file) fail("usage: validate <file> | import <file> --dry-run|--apply");
if(command==="import"&&!flags.some(flag=>["--dry-run","--apply"].includes(flag))) fail("import requires --dry-run or --apply");
let payload; try{payload=JSON.parse(fs.readFileSync(file,"utf8"));}catch{fail("JSON syntax is invalid");}
if(!Array.isArray(payload.items)) fail("items must be an array");
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const catalog=read("data/article-products.json"), sources=read("data/article-sources.json"), pipeline=read("data/editorial-pipeline.json");
const published=read("data/products.json").products??[];
const products=new Map(catalog.products.map(p=>[p.id,p]));
const sourceIds=new Set(sources.sources.map(s=>s.id));
const seen=new Set(),errors=[],updates=[];
for(const item of payload.items){
  const product=products.get(item.productId);
  if(!product){errors.push(`${item.productId??"unknown"}: productId does not exist`);continue;}
  if(normalizeItemUrl(item.officialUrl)!==normalizeItemUrl(product.official_url)){errors.push(`${product.id}: official_url mismatch`);continue;}
  const result=validateAffiliateUrl(item.affiliateUrl,product.official_url);
  if(!result.valid){errors.push(`${product.id}: ${result.message}`);continue;}
  if(seen.has(result.value)){errors.push(`${product.id}: duplicate Affiliate URL`);continue;} seen.add(result.value);
  const conflict=[...catalog.products,...published].find(p=>p.id!==product.id&&p.affiliate_url===result.value);
  if(conflict){errors.push(`${product.id}: Affiliate URL conflicts with ${conflict.id}`);continue;}
  if(product.affiliate_url&&product.affiliate_url!==result.value){errors.push(`${product.id}: existing Affiliate URL conflict`);continue;}
  if(!sourceIds.has(product.source_id))errors.push(`${product.id}: Source Registry missing`);
  updates.push({product,result});
}
if(errors.length){errors.forEach(e=>console.error(`ERROR ${e}`));process.exit(1);}
console.log(`Affiliate import valid: ${updates.length} item(s). URLs are intentionally redacted.`);
if(command==="validate")process.exit(0);
const missingFor=p=>[!p.price&&"price",String(p.shipping).includes("再確認")&&"shipping",!p.review&&"review", "human approval", "preview review"].filter(Boolean);
for(const {product} of updates)console.log(`${product.id}: update planned; publishable blockers: ${missingFor(product).join(", ")}`);
if(flags.includes("--dry-run")){console.log("Dry-run complete. No files changed.");process.exit(0);}
const today=new Date().toISOString().slice(0,10);
for(const {product,result} of updates){product.affiliate_url=result.value;product.publishable=missingFor(product).length===0;const source=sources.sources.find(s=>s.id===product.source_id);if(source)source.last_verified=today;}
catalog.last_verified=today;sources.last_verified=today;
for(const article of pipeline.articles){const list=catalog.products.filter(p=>p.articleId===article.articleId);if(!list.length)continue;const linked=list.filter(p=>p.affiliate_url).length;article.affiliateLinks=`${linked}/${list.length}`;article.phase=linked===list.length?"publication_gate_review":"affiliate_link_waiting";article.lastUpdated=today;article.nextAction=linked===list.length?"Publication Gateを人間が確認":`${list.length-linked}件の楽天Affiliate URLを発行`;}
pipeline.lastUpdated=today;
fs.writeFileSync("data/article-products.json",JSON.stringify(catalog,null,2)+"\n");
fs.writeFileSync("data/article-sources.json",JSON.stringify(sources,null,2)+"\n");
fs.writeFileSync("data/editorial-pipeline.json",JSON.stringify(pipeline,null,2)+"\n");
for(const [cmd,args] of [["node",["scripts/validate-products.mjs"]],["node",["scripts/article-factory.mjs","validate"]],["node",["scripts/article-factory.mjs","build"]]])execFileSync(cmd,args,{stdio:"inherit"});
console.log("Apply complete. Review Pipeline and Affiliate Link Queue changes before committing.");
