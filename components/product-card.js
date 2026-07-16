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

let dataPromise;
const loadEditorialData = () => {
  dataPromise ??= Promise.all([
    fetch("/data/products.json"),
    fetch("/data/articles.json")
  ]).then(async ([libraryResponse, articlesResponse]) => {
    if (!libraryResponse.ok || !articlesResponse.ok) throw new Error("Editorial data request failed");
    return Promise.all([libraryResponse.json(), articlesResponse.json()]);
  });
  return dataPromise;
};

const evaluationLabels = {
  Space: "部屋の余白",
  Together: "ふたりの姿勢",
  Comfort: "長い時間",
  Care: "手入れ",
  Delivery: "搬入・設置",
  Longevity: "長く使う理由"
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

const renderEvaluation = product => {
  const section = element("section", "editorial-evaluation");
  section.setAttribute("aria-label", `${product.name}のMARGIN Editorial Evaluation`);
  section.append(element("p", "editorial-evaluation__title", "MARGIN Editorial Evaluation"));
  const list = element("div", "editorial-evaluation__list");
  for (const [axis, evaluation] of Object.entries(product.editorial_evaluation)) {
    const item = element("div", "editorial-evaluation__item");
    item.setAttribute("aria-label", `${axis}、5段階中${evaluation.level}、${evaluation.note}`);
    const heading = element("div", "editorial-evaluation__heading");
    heading.append(element("span", "", axis), element("small", "", evaluationLabels[axis]));
    const track = element("span", "editorial-evaluation__track");
    const fill = element("i", "");
    fill.style.width = `${evaluation.level * 20}%`;
    track.append(fill);
    item.append(heading, track, element("p", "", evaluation.note));
    list.append(item);
  }
  section.append(list);
  return section;
};

const comparisonValue = (article, product, axis) => {
  if (axis.productField === "price") return `${formatPrice(product.price)}${product.price.from ? "〜" : ""}`;
  return article.comparison.values[product.id][axis.id];
};

const comparisonMark = (product, axis) => {
  const evaluationAxis = {
    compact: "Space", morning: "Comfort", movie: "Together", recline: "Comfort",
    guests: "Together", care: "Care", delivery: "Delivery"
  }[axis.id];
  if (!evaluationAxis) return "—";
  const level = product.editorial_evaluation[evaluationAxis]?.level ?? 3;
  return level >= 4 ? "◎" : level === 3 ? "○" : "△";
};

const renderList = (title, items, className) => {
  const section = element("section", `product-story__aside ${className}`);
  section.append(element("p", "product-story__aside-title", title));
  const list = element("ul");
  for (const item of items) list.append(element("li", "", item));
  section.append(list);
  return section;
};

class MarginProductList extends HTMLElement {
  async connectedCallback() {
    this.setAttribute("aria-live", "polite");
    this.replaceChildren(element("p", "product-status", "Product Libraryを読み込んでいます。"));
    try {
      const [library, articleData] = await loadEditorialData();
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
      const groups = article.productGroups?.length
        ? article.productGroups
        : [{ id: "selection", title: "Editorial Selection", description: "", productIds: article.productIds }];
      let storyIndex = 0;
      const renderedGroups = groups.map(group => {
        const groupProducts = group.productIds.map(id => products.get(id)).filter(product => selected.includes(product));
        if (!groupProducts.length) return null;
        const section = element("section", "product-group");
        section.dataset.group = group.id;
        const heading = element("header", "product-group__head");
        heading.append(element("p", "eyebrow", "MARGIN Selection"), element("h2", "", group.title));
        if (group.description) heading.append(element("p", "", group.description));
        section.append(heading, ...groupProducts.map(product => this.renderStory(product, sources.get(product.source_id), preview, storyIndex++)));
        return section;
      }).filter(Boolean);
      this.replaceChildren(...renderedGroups);
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
    const canUseVisualization = product.active_image_source === "editorial_visualization"
      && product.visualization_review_status === "approved"
      && product.visualization_identity_check === "pass"
      && product.editorial_visualization_url;
    image.src = canUseVisualization ? product.editorial_visualization_url : (product.source_image_url || product.image_url);
    image.alt = product.image_alt;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    image.style.objectFit = product.image_display?.fit ?? "contain";
    image.style.objectPosition = product.image_display?.position ?? "center";
    media.append(image);
    if (canUseVisualization) {
      const disclosure = element("figcaption", "product-story__visualization-disclosure");
      disclosure.append(
        element("strong", "", product.visualization_label || "MARGIN編集イメージ"),
        element("span", "", "商品形状・色・仕様は販売ページでご確認ください。")
      );
      media.append(disclosure);
    }

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
      renderDetail("Updated", new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(source.last_verified)))
    );
    const editorComment = element("blockquote", "product-story__comment");
    editorComment.append(element("p", "eyebrow", "From the editors"), element("p", "", product.editor_comment));
    const commerce = element("div", "product-story__commerce");
    const commerceMeta = element("dl", "product-story__commerce-meta");
    commerceMeta.append(
      renderDetail("Current price", `${formatPrice(product.price)}${product.price.from ? "〜" : ""}`),
      renderDetail("Shipping", product.shipping.display),
      renderDetail("Dispatch", product.shipping.dispatch)
    );
    const link = element("a", "product-story__link", product.affiliate_url ? "楽天で価格を見る ↗" : "Preview: 出典ページを見る ↗");
    link.href = product.affiliate_url || (preview ? source?.rakuten_url : "");
    link.target = "_blank";
    link.rel = product.affiliate_url ? "nofollow sponsored noopener" : "nofollow noopener";
    commerce.append(commerceMeta, link, element("p", "product-story__price-note", "価格・在庫・送料は変動します。購入前に楽天の商品ページで最新情報をご確認ください。"));
    copy.append(role, title, scene, body, renderList("こんな人におすすめ", product.recommended_for, "product-story__recommend"), renderList("気になる点", product.purchase_notes, "product-story__concerns"), editorComment, renderEvaluation(product), details, commerce);
    story.append(media, copy);
    if (preview && product.visualization_candidates?.length) story.append(this.renderVisualizationReview(product, source));
    return story;
  }

  renderVisualizationReview(product, source) {
    const review = element("aside", "visualization-review");
    review.setAttribute("aria-label", `${product.name} Product Visualization Pilot`);
    const head = element("header", "visualization-review__head");
    head.append(
      element("p", "eyebrow", "Preview only / Product Visualization Pilot"),
      element("h4", "", "AGRA 編集ビジュアル・レビュー"),
      element("p", "", "商品画像の入力利用権限が未確認のため、候補画像は生成していません。Productionでは正式な商品画像を維持します。")
    );
    const original = element("a", "visualization-review__original", "Original referenceを確認 ↗");
    original.href = source?.rakuten_url || product.image_source_url;
    original.target = "_blank";
    original.rel = "nofollow noopener";
    head.append(original);
    const grid = element("div", "visualization-review__grid");
    for (const candidate of product.visualization_candidates.slice(0, 3)) {
      const card = element("section", "visualization-review__candidate");
      card.append(
        element("span", "visualization-review__id", candidate.id),
        element("h5", "", candidate.concept),
        element("p", "", "Not generated — rights confirmation required"),
        element("dl", "visualization-review__status")
      );
      const status = card.querySelector("dl");
      status.append(
        renderDetail("Identity", product.visualization_identity_check),
        renderDetail("Review", product.visualization_review_status)
      );
      grid.append(card);
    }
    review.append(head, grid, element("p", "visualization-review__label", "MARGIN編集イメージ候補 — 商品形状・色・仕様は販売ページでご確認ください。"));
    return review;
  }
}

customElements.define("margin-product-list", MarginProductList);

class MarginArticleExtras extends HTMLElement {
  async connectedCallback() {
    this.replaceChildren(element("p", "product-status", "記事データを読み込んでいます。"));
    try {
      const [library, articleData] = await loadEditorialData();
      const article = articleData.articles.find(item => item.id === this.getAttribute("article-id"));
      if (!article) throw new Error("Article registry entry not found");
      const products = new Map(library.products.map(product => [product.id, product]));
      const preview = new URLSearchParams(location.search).get("preview") === "1";
      const selected = article.productIds.map(id => products.get(id)).filter(Boolean).filter(product => product.publishable || preview);
      this.hydrateShell(article);
      const mode = this.getAttribute("mode") ?? "all";
      if (mode === "comparison") this.replaceChildren(this.renderComparison(article, selected));
      else if (mode === "hero-note") this.replaceChildren(this.renderHeroNote(article));
      else if (mode === "footer") this.replaceChildren(this.renderBeforeYouChoose(article), this.renderClosing(article), this.renderRelated(article, articleData.articles));
      else this.replaceChildren(this.renderComparison(article, selected), this.renderBeforeYouChoose(article), this.renderClosing(article), this.renderEditorsNote(article), this.renderRelated(article, articleData.articles));
    } catch (error) {
      console.error("Article extras load failed", error);
      this.replaceChildren(element("p", "product-status", "記事情報を読み込めませんでした。"));
    }
  }

  hydrateShell(article) {
    const title = document.querySelector("[data-article-title]");
    const subtitle = document.querySelector("[data-article-subtitle]");
    const description = document.querySelector("[data-article-description]");
    const hero = document.querySelector("[data-article-hero]");
    if (title) title.textContent = article.title;
    if (subtitle) subtitle.textContent = article.subtitle;
    if (description) description.textContent = article.description;
    if (hero && article.heroImage) {
      hero.src = article.heroImage.url;
      hero.alt = article.heroImage.alt;
    }
  }

  renderComparison(article, products) {
    const section = element("section", "comparison-section");
    section.id = "comparison";
    const head = element("header", "comparison-section__head");
    head.append(element("p", "eyebrow", "Comparison / Living scenes"), element("h2", "", article.comparison.title), element("p", "", article.comparison.description));

    const tableWrap = element("div", "comparison-table-wrap");
    const table = element("table", "comparison-table");
    const thead = element("thead");
    const headerRow = element("tr");
    headerRow.append(element("th", "", "Scene"), ...products.map(product => element("th", "", product.selection_role)));
    thead.append(headerRow);
    const tbody = element("tbody");
    for (const axis of article.comparison.axes) {
      const row = element("tr");
      row.append(element("th", "", axis.label), ...products.map(product => {
        const cell = element("td");
        if (!axis.productField) cell.append(element("span", "comparison-mark", comparisonMark(product, axis)));
        cell.append(element("span", "comparison-text", comparisonValue(article, product, axis)));
        return cell;
      }));
      tbody.append(row);
    }
    table.append(thead, tbody);
    tableWrap.append(table);

    const mobile = element("div", "comparison-mobile");
    mobile.setAttribute("aria-label", "商品を横にスワイプして比較");
    for (const product of products) {
      const card = element("section", "comparison-mobile__item");
      card.append(element("p", "", product.selection_role), element("h3", "", product.name));
      const details = element("dl");
      for (const axis of article.comparison.axes) {
        const value = element("span", "comparison-value");
        if (!axis.productField) value.append(element("b", "comparison-mark", comparisonMark(product, axis)));
        value.append(element("span", "", comparisonValue(article, product, axis)));
        const row = element("div", "product-story__detail");
        row.append(element("dt", "", axis.label), element("dd", ""));
        row.querySelector("dd").append(value);
        details.append(row);
      }
      card.append(details);
      mobile.append(card);
    }
    const mobileCue = element("p", "comparison-mobile__cue", "Swipe to compare →");
    section.append(head, tableWrap, mobileCue, mobile);
    return section;
  }

  renderBeforeYouChoose(article) {
    const section = element("section", "before-you-choose");
    section.id = "before-you-choose";
    section.append(element("p", "eyebrow", "Practical notes"), element("h2", "", "Before you choose"));
    const list = element("dl", "before-you-choose__list");
    for (const item of article.beforeYouChoose) list.append(renderDetail(item.label, item.text));
    section.append(list);
    return section;
  }

  renderClosing(article) {
    const section = element("section", "closing-copy");
    section.append(element("p", "eyebrow", article.closing.eyebrow), element("h2", "", article.closing.title), element("p", "", article.closing.body));
    return section;
  }

  renderEditorsNote(article) {
    const section = element("aside", "editors-note");
    const copy = element("div", "editors-note__copy");
    copy.append(element("p", "eyebrow", article.editorsNote.eyebrow), element("h2", "", article.editorsNote.title), element("p", "", article.editorsNote.body));
    section.append(copy, element("p", "editors-note__signature", article.editorsNote.signature));
    return section;
  }

  renderHeroNote(article) {
    const note = element("aside", "hero-editors-note");
    note.append(element("p", "eyebrow", "Editor's Note"), element("p", "", article.heroEditorsNote));
    return note;
  }

  renderRelated(article, articles) {
    const section = element("section", "related-articles");
    const relatedIds = new Set(article.relatedArticleIds ?? []);
    const related = articles.filter(item => relatedIds.has(item.id) && item.status === "published");
    section.append(element("p", "eyebrow", "Continue reading"), element("h2", "", related.length ? "Related Journal" : "Journalへ戻る"));
    if (!related.length) {
      const back = element("a", "related-articles__back", "MARGIN Journalを見る ←");
      back.href = article.journalPath ?? "/#journal";
      const coming = element("div", "coming-soon-grid");
      for (const item of article.comingSoon ?? []) {
        const card = element("article", "coming-soon-card");
        card.setAttribute("aria-disabled", "true");
        card.append(element("p", "eyebrow", "Coming Soon"), element("h3", "", item.title), element("p", "", item.subtitle));
        coming.append(card);
      }
      section.append(coming, back);
      return section;
    }
    const grid = element("div", "related-articles__grid");
    for (const item of related) {
      const link = element("a", "related-article");
      link.href = item.path;
      const image = element("img");
      image.src = item.heroImage?.url ?? item.image;
      image.alt = item.heroImage?.alt ?? "";
      image.loading = "lazy";
      link.append(image, element("span", "", item.category), element("h3", "", item.title), element("p", "", item.subtitle));
      grid.append(link);
    }
    section.append(grid);
    return section;
  }
}

customElements.define("margin-article-extras", MarginArticleExtras);
