const affiliatePattern = /^https:\/\/hb\.afl\.rakuten\.co\.jp\//;
export const publicationGate = (brief, products) => {
  const blockers=[];
  if (brief.status !== "published") blockers.push("status is not published");
  if (brief.publicationStatus !== "published") blockers.push("publicationStatus is not published");
  if (brief.editorialReviewStatus !== "approved") blockers.push("editorial review is pending");
  if (brief.heroImageStatus !== "approved") blockers.push("hero is not approved");
  if (products.length !== brief.productCount) blockers.push("product count mismatch");
  if (products.some(product => !affiliatePattern.test(product.affiliate_url ?? ""))) blockers.push("affiliate links are incomplete");
  if (products.some(product => product.publishable !== true)) blockers.push("products are not publishable");
  if (products.some(product => !product.official_url)) blockers.push("source registry is incomplete");
  if (!brief.previewReviewed) blockers.push("preview visual review is pending");
  return {pass:blockers.length===0,blockers};
};
