import { readFile } from "node:fs/promises";
import process from "node:process";

const libraryPath = new URL("../data/products.json", import.meta.url);
const articlesPath = new URL("../data/articles.json", import.meta.url);
const draftCatalogPath = new URL("../data/article-products.json", import.meta.url);
const draftSourcesPath = new URL("../data/article-sources.json", import.meta.url);
const library = JSON.parse(await readFile(libraryPath, "utf8"));
const articleData = JSON.parse(await readFile(articlesPath, "utf8"));
const draftCatalog = JSON.parse(await readFile(draftCatalogPath, "utf8"));
const draftSources = JSON.parse(await readFile(draftSourcesPath, "utf8"));
const errors = [];
if (draftCatalog.products.length !== 40) errors.push("draft catalog must contain 40 products");
if (draftSources.sources.length !== 40) errors.push("draft source registry must contain 40 sources");
const draftSourceIds = new Set(draftSources.sources.map(source => source.id));
for (const product of draftCatalog.products) {
  if (product.affiliate_url !== null || product.publishable !== false) errors.push(`${product.id}: draft affiliate/publication defaults are invalid`);
  if (!draftSourceIds.has(product.source_id)) errors.push(`${product.id}: draft source reference is missing`);
  if (!/^https:\/\/item\.rakuten\.co\.jp\//.test(product.official_url)) errors.push(`${product.id}: draft official_url must be a Rakuten item page`);
}
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
  if (!['cover', 'contain'].includes(product.image_display?.fit) || !product.image_display?.position) errors.push(`${product.id}: image_display must define fit and position`);
  if (product.image_source_url !== source?.rakuten_url) errors.push(`${product.id}: image_source_url must match source rakuten_url`);
  if (product.active_image_source) {
    if (!['source', 'editorial_visualization'].includes(product.active_image_source)) errors.push(`${product.id}: active_image_source is invalid`);
    if (product.source_image_url !== product.image_url || product.original_product_image_url !== product.image_url) errors.push(`${product.id}: source and original image URLs must preserve image_url`);
    if ((product.visualization_candidates?.length ?? 0) > 3) errors.push(`${product.id}: visualization_candidates must contain at most 3 entries`);
    if (product.active_image_source === 'editorial_visualization' && (!product.editorial_visualization_url || product.visualization_review_status !== 'approved' || product.visualization_identity_check !== 'pass')) errors.push(`${product.id}: editorial visualization requires URL, approval, and identity pass`);
    if (product.active_image_source === 'source' && product.image_type !== 'source_product_image') errors.push(`${product.id}: source image must use source_product_image type`);
  }
  if (!product.image_alt || !product.editorial_copy || !product.suited_for) errors.push(`${product.id}: editorial presentation is incomplete`);
  if (!product.editorial_body || product.editorial_body.length < 180 || product.editorial_body.length > 420) errors.push(`${product.id}: editorial_body must be 180-420 characters`);
  if (!Array.isArray(product.recommended_for) || product.recommended_for.length < 3) errors.push(`${product.id}: recommended_for must contain at least 3 entries`);
  if (!Array.isArray(product.purchase_notes) || product.purchase_notes.length < 2 || !product.editor_comment) errors.push(`${product.id}: editorial purchase guidance is incomplete`);
  if (!product.shipping?.display || !product.shipping?.dispatch) errors.push(`${product.id}: commerce shipping display is incomplete`);
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
  if (!article.editorsNote?.title || !article.editorsNote?.body || !article.editorsNote?.signature) errors.push(`${article.id}: editorsNote is incomplete`);
  if (!article.heroEditorsNote || article.heroEditorsNote.length < 100 || article.heroEditorsNote.length > 150) errors.push(`${article.id}: heroEditorsNote must be 100-150 characters`);
  if (!Array.isArray(article.comingSoon) || article.comingSoon.length < 2 || article.comingSoon.some(item => !item.title || !item.subtitle)) errors.push(`${article.id}: comingSoon is incomplete`);
  if (!Array.isArray(article.relatedArticleIds) || article.relatedArticleIds.some(id => !articleIds.has(id) || id === article.id)) errors.push(`${article.id}: relatedArticleIds contain an invalid article`);
}

if (errors.length) {
  console.error(`Product Library validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Product Library valid: ${library.products.length} published products + ${draftCatalog.products.length} draft products, ${sources.size} published sources + ${draftSources.sources.length} draft sources, ${categoryNames.length} categories, ${articleData.articles.length} editorial template`);
