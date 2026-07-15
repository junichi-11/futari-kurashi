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

const formatDimensions = dimensions => [
  `幅${dimensions.width_cm}cm`,
  `奥行${dimensions.depth_cm}cm`,
  `高さ${dimensions.height_cm}cm`,
  dimensions.seat_height_cm ? `座面高${dimensions.seat_height_cm}cm` : null
].filter(Boolean).join(" × ");

const renderDetail = (label, value) => {
  const row = element("div", "product-story__detail");
  row.append(element("dt", "", label), element("dd", "", value));
  return row;
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
      this.replaceChildren(...selected.map((product, index) => this.renderStory(product, sources.get(product.source_id), preview, index)));
    } catch (error) {
      console.error("Product Library load failed", error);
      this.replaceChildren(element("p", "product-status", "商品情報を読み込めませんでした。時間をおいて再度お試しください。"));
    }
  }

  renderStory(product, source, preview, index) {
    const story = element("section", "product-story");
    story.dataset.productId = product.id;
    story.dataset.position = index % 2 === 0 ? "image-left" : "image-right";

    const media = element("figure", "product-story__media");
    const image = element("img");
    image.src = product.image_url;
    image.alt = product.image_alt;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    media.append(image);

    const copy = element("div", "product-story__copy");
    const role = element("p", "product-story__role", `${String(index + 1).padStart(2, "0")} / ${product.selection_role}`);
    const title = element("h3", "", product.name);
    const scene = element("p", "product-story__scene", product.editorial_copy);
    const body = element("p", "product-story__body", product.editorial_body);
    const details = element("dl", "product-story__details");
    details.append(
      renderDetail("Price", `${formatPrice(product.price)}${product.price.from ? "〜" : ""}`),
      renderDetail("Size", formatDimensions(product.dimensions)),
      renderDetail("Material", product.materials.join("、")),
      renderDetail("For", product.suited_for),
      renderDetail("Note", product.cons.join("。")),
      renderDetail("Updated", new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(source.last_verified)))
    );
    const link = element("a", "product-story__link", product.affiliate_url ? "楽天市場で商品を見る ↗" : "Preview: 出典ページを見る ↗");
    link.href = product.affiliate_url || (preview ? source?.rakuten_url : "");
    link.target = "_blank";
    link.rel = product.affiliate_url ? "nofollow sponsored noopener" : "nofollow noopener";
    copy.append(role, title, scene, body, details, link);
    story.append(media, copy);
    return story;
  }
}

customElements.define("margin-product-list", MarginProductList);
