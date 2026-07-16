export const selectProducts = (catalog, articleId) => catalog.products.filter(product => product.articleId === articleId);
