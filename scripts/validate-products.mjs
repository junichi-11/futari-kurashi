import { readFile } from "node:fs/promises";
import process from "node:process";

const libraryPath = new URL("../data/products.json", import.meta.url);
const library = JSON.parse(await readFile(libraryPath, "utf8"));
const errors = [];
const scoreKeys = ["EditorialFit", "Design", "Function", "Price", "Longevity", "ReviewQuality"];
const categoryNames = ["Living", "Dining", "Lighting", "Storage", "Kitchen", "Home Appliance", "Bedroom"];
const sourceTypes = new Set(["manufacturer_direct", "brand_direct", "authorized_retailer"]);
const sources = new Map(library.source_registry.map(source => [source.id, source]));
const ids = new Set();

const isHttps = value => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

const verifiedWithinDays = (value, days = 30) => {
  const verified = Date.parse(value);
  return Number.isFinite(verified) && Date.now() - verified <= days * 86400000;
};

export const publishability = (product, source) => {
  const reasons = [];
  if (!product.affiliate_url || !isHttps(product.affiliate_url)) reasons.push("affiliate_url_missing");
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

if (errors.length) {
  console.error(`Product Library validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Product Library valid: ${library.products.length} products, ${sources.size} sources, ${categoryNames.length} categories`);
