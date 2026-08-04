(function (root) {
  "use strict";

  const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const articleKeys = ["displayTitle", "seoTitle", "metaDescription", "slug", "lead", "conclusion", "editorialNote", "disclosure"];
  const productKeys = ["itemCode", "heading", "role", "summary", "bestFor", "checkPoints", "editorComment", "affiliateUrl"];
  const rowKeys = ["itemCode", "product", "price", "review", "shop", "role", "feature", "bestFor", "label", "affiliateUrl"];
  const seoKeys = ["mainKeyword", "relatedKeywords", "internalLinkIdeas", "factsToVerify"];
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const code = value => String(value == null ? "" : value).trim();
  const duplicateValues = values => [...new Set(values.filter((value, index) => value && values.indexOf(value) !== index))];
  const missing = (object, keys, path, errors) => keys.forEach(key => { if (!has(object, key)) errors.push(`${path}.${key} がありません。`); });
  const setDifference = (left, right) => [...left].filter(value => !right.has(value));

  function validateSlug(value, allowEmpty) {
    const slug = String(value || "").trim();
    if (!slug && allowEmpty) return "";
    if (!slug) return "slugがありません。";
    if (slug.length < 3 || slug.length > 80) return "slugは3文字以上80文字以内にしてください。";
    if (!SLUG_PATTERN.test(slug)) return "slugは半角英小文字・数字・ハイフンのみ使用できます。先頭・末尾や連続したハイフンは使用できません。";
    return "";
  }

  function validateSchema(data) {
    const errors = [];
    ["version", "article", "sections", "productBlocks", "comparisonTable", "faq", "seo"].forEach(key => {
      if (!has(data, key)) errors.push(`${key} がありません。`);
    });
    if (has(data, "version") && data.version !== "1.0") errors.push('versionは「1.0」である必要があります。');
    if (data.article && typeof data.article === "object") missing(data.article, articleKeys, "article", errors);
    if (!Array.isArray(data.sections)) errors.push("sections は配列である必要があります。");
    if (!Array.isArray(data.productBlocks)) errors.push("productBlocks は配列である必要があります。");
    else data.productBlocks.forEach((block, index) => missing(block, productKeys, `productBlocks[${index}]`, errors));
    if (!data.comparisonTable || typeof data.comparisonTable !== "object") errors.push("comparisonTable はオブジェクトである必要があります。");
    else {
      missing(data.comparisonTable, ["columns", "rows"], "comparisonTable", errors);
      if (!Array.isArray(data.comparisonTable.columns)) errors.push("comparisonTable.columns は配列である必要があります。");
      if (!Array.isArray(data.comparisonTable.rows)) errors.push("comparisonTable.rows は配列である必要があります。");
      else data.comparisonTable.rows.forEach((row, index) => {
        if (!row || Array.isArray(row) || typeof row !== "object") errors.push(`comparisonTable.rows[${index}] はキー付きオブジェクトである必要があります。`);
        else missing(row, rowKeys, `comparisonTable.rows[${index}]`, errors);
      });
    }
    if (!Array.isArray(data.faq)) errors.push("faq は配列である必要があります。");
    else data.faq.forEach((item, index) => missing(item, ["question", "answer"], `faq[${index}]`, errors));
    if (data.seo && typeof data.seo === "object") missing(data.seo, seoKeys, "seo", errors);
    return errors;
  }

  function analyze(data, selectedProducts, options) {
    const errors = validateSchema(data), warnings = [];
    const selected = Array.isArray(selectedProducts) ? selectedProducts : [];
    const selectedMap = new Map(selected.map(product => [code(product.itemCode), product]));
    const blocks = Array.isArray(data.productBlocks) ? data.productBlocks : [];
    const rows = Array.isArray(data.comparisonTable && data.comparisonTable.rows) ? data.comparisonTable.rows : [];
    const blockCodes = blocks.map(block => code(block && block.itemCode));
    const rowCodes = rows.map(row => code(row && !Array.isArray(row) && row.itemCode));
    const selectedCodes = selected.map(product => code(product.itemCode));
    const selectedSet = new Set(selectedCodes), blockSet = new Set(blockCodes), rowSet = new Set(rowCodes);
    const missingFromBlocks = setDifference(selectedSet, blockSet), extraInBlocks = setDifference(blockSet, selectedSet);
    const missingFromRows = setDifference(selectedSet, rowSet), extraInRows = setDifference(rowSet, selectedSet);
    const blockOnly = setDifference(blockSet, rowSet), rowOnly = setDifference(rowSet, blockSet);
    const roleMismatches = [], affiliateMismatches = [], crossMismatches = [];

    duplicateValues(blockCodes).forEach(itemCode => errors.push(`productBlocksでitemCodeが重複しています: ${itemCode}`));
    duplicateValues(rowCodes).forEach(itemCode => errors.push(`comparisonTable.rowsでitemCodeが重複しています: ${itemCode}`));
    missingFromBlocks.forEach(itemCode => errors.push(`現在選択中だがproductBlocksにない商品: ${itemCode}`));
    extraInBlocks.forEach(itemCode => errors.push(`productBlocksにあるが現在選択されていない商品: ${itemCode}`));
    missingFromRows.forEach(itemCode => errors.push(`現在選択中だがcomparisonTableにない商品: ${itemCode}`));
    extraInRows.forEach(itemCode => errors.push(`comparisonTableにあるが現在選択されていない商品: ${itemCode}`));
    blockOnly.forEach(itemCode => errors.push(`productBlocksにのみ存在する商品: ${itemCode}`));
    rowOnly.forEach(itemCode => errors.push(`comparisonTableにのみ存在する商品: ${itemCode}`));

    for (const itemCode of new Set([...blockCodes, ...rowCodes])) {
      if (!itemCode) continue;
      const product = selectedMap.get(itemCode), block = blocks.find(item => code(item && item.itemCode) === itemCode), row = rows.find(item => code(item && !Array.isArray(item) && item.itemCode) === itemCode);
      if (product && block) {
        if (String(block.role || "") !== String(product.role || "")) roleMismatches.push(`${itemCode}: selectedProducts / productBlocks`);
        if (String(block.affiliateUrl || "").trim() !== String(product.affiliateUrl || "").trim()) affiliateMismatches.push(`${itemCode}: selectedProducts / productBlocks`);
      }
      if (product && row && !Array.isArray(row)) {
        if (String(row.role || "") !== String(product.role || "")) roleMismatches.push(`${itemCode}: selectedProducts / comparisonTable`);
        if (String(row.affiliateUrl || "").trim() !== String(product.affiliateUrl || "").trim()) affiliateMismatches.push(`${itemCode}: selectedProducts / comparisonTable`);
      }
      if (block && row && !Array.isArray(row)) {
        if (String(block.role || "") !== String(row.role || "")) crossMismatches.push(`${itemCode}: role`);
        if (String(block.affiliateUrl || "").trim() !== String(row.affiliateUrl || "").trim()) crossMismatches.push(`${itemCode}: affiliateUrl`);
      }
    }
    roleMismatches.forEach(value => errors.push(`roleが一致しない商品: ${value}`));
    affiliateMismatches.forEach(value => errors.push(`affiliateUrlが一致しない商品: ${value}`));
    crossMismatches.forEach(value => errors.push(`productBlocksとcomparisonTableで内容が違う商品: ${value}`));
    if (selectedCodes.length === blockCodes.length && selectedCodes.length && selectedCodes.join("\n") !== blockCodes.join("\n") && !missingFromBlocks.length && !extraInBlocks.length) warnings.push("productBlocksの商品順が現在の選択順と異なります。");
    if (blockCodes.length === rowCodes.length && blockCodes.length && blockCodes.join("\n") !== rowCodes.join("\n") && !blockOnly.length && !rowOnly.length) warnings.push("productBlocksとcomparisonTableの商品順が異なります。");

    const jsonSlug = String(data.article && data.article.slug || "").trim(), currentSlug = String(options && options.currentSlug || "").trim();
    const slugError = validateSlug(jsonSlug, false);
    if (slugError) errors.push(`article.slug: ${slugError}`);
    const fileName = String(options && options.fileName || "").trim();
    const fileSlug = fileName.toLowerCase().endsWith(".json") ? fileName.slice(0, -5) : "";
    if (fileSlug && fileSlug !== jsonSlug) warnings.push("ファイル名とJSON内のslugが一致していません。");
    const slugConflict = Boolean(currentSlug && jsonSlug && currentSlug !== jsonSlug);
    const productsMatch = !missingFromBlocks.length && !extraInBlocks.length && !missingFromRows.length && !extraInRows.length && !blockOnly.length && !rowOnly.length && !roleMismatches.length && !affiliateMismatches.length && !crossMismatches.length && selectedCodes.length === blockCodes.length && selectedCodes.length === rowCodes.length;
    if (slugConflict) {
      warnings.push(`読み込んだJSONのslug「${jsonSlug}」は現在の記事slug「${currentSlug}」と異なります。別の記事JSONである可能性があります。`);
      if (!productsMatch) errors.push("slugと商品構成の両方が現在の記事と異なるため、インポートできません。");
    }
    const matchedCount = selectedCodes.filter(itemCode => blockSet.has(itemCode) && rowSet.has(itemCode)).length;
    return {
      errors: [...new Set(errors)], warnings: [...new Set(warnings)], slugConflict, productsMatch,
      identity: {
        title: String(data.article && data.article.displayTitle || ""), seoTitle: String(data.article && data.article.seoTitle || ""), slug: jsonSlug,
        selectedCount: selectedCodes.length, productCount: blockCodes.length, matchedCount, mismatchCount: Math.max(selectedCodes.length, blockCodes.length, rowCodes.length) - matchedCount,
        blockCodes, rowCodes, fileName: fileName || "貼り付け入力", fileSlug, fileMatchesSlug: !fileSlug || fileSlug === jsonSlug,
        missingFromBlocks, extraInBlocks, missingFromRows, extraInRows, roleMismatches, affiliateMismatches, crossMismatches
      }
    };
  }

  root.MarginImportValidation = { SLUG_PATTERN, validateSlug, validateSchema, analyze };
})(typeof window !== "undefined" ? window : globalThis);
