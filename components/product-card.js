const formatPrice = price => new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: price.currency,
  maximumFractionDigits: 0
}).format(price.amount);

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const renderFacts = (label, values) => {
  const wrapper = element("div");
  wrapper.append(element("strong", "", label));
  const list = element("ul");
  for (const value of values) list.append(element("li", "", value));
  wrapper.append(list);
  return wrapper;
};

class MarginProductList extends HTMLElement {
  async connectedCallback() {
    this.setAttribute("aria-live", "polite");
    this.replaceChildren(element("p", "product-status", "Product Libraryを読み込んでいます。"));
    try {
      const [libraryResponse, articlesResponse] = await Promise.all([
        fetch("/data/products.json"),
        fetch("/data/articles.json")
      ]);
      if (!libraryResponse.ok || !articlesResponse.ok) throw new Error("Product Library request failed");
      const [library, articleData] = await Promise.all([libraryResponse.json(), articlesResponse.json()]);
      const article = articleData.articles.find(item => item.id === this.getAttribute("article-id"));
      if (!article) throw new Error("Article registry entry not found");
      const preview = new URLSearchParams(location.search).get("preview") === "1";
      const sources = new Map(library.source_registry.map(source => [source.id, source]));
      const products = new Map(library.products.map(product => [product.id, product]));
      const selected = article.productIds.map(id => products.get(id)).filter(Boolean).filter(product => product.publishable || preview);
      if (!preview && selected.length === 0) {
        this.replaceChildren(element("p", "product-status", "商品リンクの準備中です。公開可能になり次第掲載します。"));
        return;
      }
      this.replaceChildren(...selected.map(product => this.renderCard(product, sources.get(product.source_id), preview)));
    } catch (error) {
      console.error("Product Library load failed", error);
      this.replaceChildren(element("p", "product-status", "商品情報を読み込めませんでした。時間をおいて再度お試しください。"));
    }
  }

  renderCard(product, source, preview) {
    const card = element("section", "product-card");
    card.dataset.productId = product.id;
    const meta = element("div", "product-card__meta");
    meta.append(
      element("span", "", `${product.selection_role} / ${product.brand}`),
      element("span", "", `${formatPrice(product.price)} · Score ${product.product_score.TotalScore}`)
    );
    const rating = product.rating?.value !== null
      ? `★ ${product.rating.value} / ${product.rating.scale}（${product.rating.count}件）`
      : product.rating?.count ? `評価集計前（${product.rating.count}件）` : "レビューなし";
    const facts = element("div", "product-card__facts");
    facts.append(renderFacts("Pros", product.pros), renderFacts("Cons", product.cons));
    const link = element("a", "product-card__link", product.affiliate_url ? "楽天市場で確認する ↗" : "Preview: 出典ページを確認する ↗");
    link.href = product.affiliate_url || (preview ? source?.rakuten_url : "");
    link.target = "_blank";
    link.rel = product.affiliate_url ? "nofollow sponsored noopener" : "nofollow noopener";
    card.append(meta, element("h3", "", product.name), element("p", "product-card__summary", product.summary), element("p", "product-card__rating", rating), facts, link);
    return card;
  }
}

customElements.define("margin-product-list", MarginProductList);
