import { readFile } from "node:fs/promises";
import process from "node:process";

const libraryPath = new URL("../data/products.json", import.meta.url);
const articlesPath = new URL("../data/articles.json", import.meta.url);
const library = JSON.parse(await readFile(libraryPath, "utf8"));
const articleData = JSON.parse(await readFile(articlesPath, "utf8"));
const errors = [];
const scoreKeys = ["EditorialFit", "Design", "Function", "Price", "Longevity", "ReviewQuality"];
const evaluationKeys = ["Space", "Together", "Comfort", "Care", "Delivery", "Longevity"];
const categoryNames = ["Living", "Dining", "Lighting", "Storage", "Kitchen", "Home Appliance", "Bedroom"];
const sourceTypes = new Set(["manufacturer_direct", "brand_direct", "authorized_retailer"]);
const sources = new Map(library.source_registry.map(source => [source.id, source]));
const ids = new Set();

const isHttps = value => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

const affiliateDestination = value => {
  try {
    const url = new URL(value);
    return url.hostname === "hb.afl.rakuten.co.jp" ? url.searchParams.get("pc") : null;
  } catch { return null; }
};

const isRakutenImage = value => {
  try { return new URL(value).hostname === "shop.r10s.jp"; } catch { return false; }
};

const verifiedWithinDays = (value, days = 30) => {
  const verified = Date.parse(value);
  return Number.isFinite(verified) && Date.now() - verified <= days * 86400000;
};

export const publishability = (product, source) => {
  const reasons = [];
  if (!product.affiliate_url || !isHttps(product.affiliate_url)) reasons.push("affiliate_url_missing");
  if (product.affiliate_url && affiliateDestination(product.affiliate_url) !== source?.rakuten_url) reasons.push("affiliate_destination_mismatch");
  if (!source) reasons.push("source_missing");
  if (source && !isHttps(source.rakuten_url)) reasons.push("rakuten_url_invalid");
  if (source && !isHttps(source.official_url)) reasons.push("official_url_invalid");
  if (source && !verifiedWithinDays(source.last_verified)) reasons.push("source_stale");
  if (!product.price?.verified_price || !(product.price.amount > 0)) reasons.push("price_unverified");
  if (!product.shipping?.verified) reasons.push("shipping_unverified");
  if (!product.pros?.length || !product.cons?.length || !product.summary) reasons.push("editorial_incomplete");
  if (!(product.product_score?.TotalScore >= 60)) reasons.push("score_below_threshold");
  return { publishable: reasons.length === 0, reasons };
};

for (const name of categoryNames) {
  if (!Array.isArray(library.categories?.[name])) errors.push(`categories.${name} must be an array`);
}
for (const name of Object.keys(library.categories ?? {})) {
  if (!categoryNames.includes(name)) errors.push(`unknown category: ${name}`);
}
for (const source of library.source_registry ?? []) {
  if (!source.id || sources.get(source.id) !== source) errors.push("source id is missing or duplicated");
  if (!isHttps(source.official_url) || !isHttps(source.rakuten_url)) errors.push(`${source.id}: source URLs must be HTTPS`);
  if (!source.manufacturer || !source.last_verified || !sourceTypes.has(source.source_type)) errors.push(`${source.id}: source registry is incomplete`);
}
for (const product of library.products ?? []) {
  if (!product.id || ids.has(product.id)) errors.push(`${product.id || "unknown"}: product id is missing or duplicated`);
  ids.add(product.id);
  if (!categoryNames.includes(product.category)) errors.push(`${product.id}: invalid category`);
  if (!library.categories?.[product.category]?.includes(product.id)) errors.push(`${product.id}: missing from categories.${product.category}`);
  const source = sources.get(product.source_id);
  if (!isRakutenImage(product.image_url)) errors.push(`${product.id}: image_url must use the Rakuten image host`);
  if (product.image_source_url !== source?.rakuten_url) errors.push(`${product.id}: image_source_url must match source rakuten_url`);
  if (!product.image_alt || !product.editorial_copy || !product.suited_for) errors.push(`${product.id}: editorial presentation is incomplete`);
  if (!product.editorial_body || product.editorial_body.length < 120 || product.editorial_body.length > 200) errors.push(`${product.id}: editorial_body must be 120-200 characters`);
  for (const key of evaluationKeys) {
    const evaluation = product.editorial_evaluation?.[key];
    if (!Number.isInteger(evaluation?.level) || evaluation.level < 1 || evaluation.level > 5 || !evaluation.note) errors.push(`${product.id}: editorial_evaluation.${key} must have a 1-5 level and note`);
  }
  for (const key of scoreKeys) {
    const value = product.product_score?.[key];
    if (!Number.isInteger(value) || value < 0 || value > 10) errors.push(`${product.id}: ${key} must be an integer from 0 to 10`);
  }
  const expectedTotal = Math.round(scoreKeys.reduce((sum, key) => sum + (product.product_score?.[key] ?? 0), 0) / scoreKeys.length * 100) / 10;
  if (product.product_score?.TotalScore !== expectedTotal) errors.push(`${product.id}: TotalScore must be ${expectedTotal}`);
  const result = publishability(product, source);
  if (product.publishable !== result.publishable) errors.push(`${product.id}: publishable must be ${result.publishable}; ${result.reasons.join(", ")}`);
}
for (const [category, productIds] of Object.entries(library.categories ?? {})) {
  for (const id of productIds) if (!ids.has(id)) errors.push(`categories.${category}: unknown product ${id}`);
}
for (const id of ids) {
  const occurrences = Object.values(library.categories ?? {}).flat().filter(value => value === id).length;
  if (occurrences !== 1) errors.push(`${id}: must appear in exactly one category, found ${occurrences}`);
}

const articleIds = new Set(articleData.articles.map(article => article.id));
for (const article of articleData.articles) {
  if (!article.title || !article.subtitle || !article.category || !isHttps(article.heroImage?.url)) errors.push(`${article.id}: reusable article metadata is incomplete`);
  if (!Array.isArray(article.productIds) || article.productIds.some(id => !ids.has(id))) errors.push(`${article.id}: productIds contain an unknown product`);
  const groupedIds = (article.productGroups ?? []).flatMap(group => group.productIds ?? []);
  if (article.productGroups?.length && (groupedIds.length !== article.productIds.length || new Set(groupedIds).size !== groupedIds.length || article.productIds.some(id => !groupedIds.includes(id)))) errors.push(`${article.id}: productGroups must contain every productId exactly once`);
  if (article.productGroups?.some(group => !group.id || !group.title || !group.description)) errors.push(`${article.id}: productGroups metadata is incomplete`);
  const axes = article.comparison?.axes ?? [];
  if (axes.length === 0 || new Set(axes.map(axis => axis.id)).size !== axes.length) errors.push(`${article.id}: comparison axes are missing or duplicated`);
  for (const productId of article.productIds ?? []) {
    for (const axis of axes) if (!axis.productField && !article.comparison?.values?.[productId]?.[axis.id]) errors.push(`${article.id}: comparison value missing for ${productId}.${axis.id}`);
  }
  if (!Array.isArray(article.beforeYouChoose) || article.beforeYouChoose.length === 0 || article.beforeYouChoose.some(item => !item.label || !item.text)) errors.push(`${article.id}: beforeYouChoose is incomplete`);
  if (!article.closing?.title || !article.closing?.body) errors.push(`${article.id}: closing copy is incomplete`);
  if (!Array.isArray(article.relatedArticleIds) || article.relatedArticleIds.some(id => !articleIds.has(id) || id === article.id)) errors.push(`${article.id}: relatedArticleIds contain an invalid article`);
}

if (errors.length) {
  console.error(`Product Library validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Product Library valid: ${library.products.length} products, ${sources.size} sources, ${categoryNames.length} categories, ${articleData.articles.length} editorial template`);
