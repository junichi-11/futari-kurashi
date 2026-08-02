const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-nano";
const REQUEST_TIMEOUT_MS = 45_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 6;
const requestsByClient = new Map();

const json = (response, status, body) => {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.json(body);
};

const text = (value, limit) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const list = (value, limit, itemLimit = 120) =>
  Array.isArray(value)
    ? value.slice(0, limit).map((item) => text(item, itemLimit)).filter(Boolean)
    : [];
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const sanitizeInput = (body) => ({
  theme: text(body?.theme, 200),
  articleType: text(body?.articleType, 80),
  target: text(body?.target, 120),
  roomType: text(body?.roomType, 120),
  editorialThemes: list(body?.editorialThemes, 12, 40),
  mainKeyword: text(body?.mainKeyword, 120),
  relatedKeywords: list(body?.relatedKeywords, 20, 120),
  memo: text(body?.memo, 2000),
  selectedProducts: Array.isArray(body?.selectedProducts)
    ? body.selectedProducts.slice(0, 20).map((product) => ({
        itemCode: text(product?.itemCode, 160),
        name: text(product?.name, 300),
        price: number(product?.price),
        shopName: text(product?.shopName, 200),
        reviewAverage: number(product?.reviewAverage),
        reviewCount: number(product?.reviewCount),
        catchcopy: text(product?.catchcopy, 500),
      }))
    : [],
});

const stringArray = { type: "array", items: { type: "string" } };
const object = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const researchSchema = object({
  searchIntent: object({
    primaryIntent: { type: "string" },
    secondaryIntents: stringArray,
    readerSituation: { type: "string" },
    readerProblems: stringArray,
    readerQuestions: stringArray,
  }),
  editorialDirection: object({
    articleGoal: { type: "string" },
    marginPointOfView: { type: "string" },
    tone: { type: "string" },
    avoid: stringArray,
  }),
  titleSuggestions: {
    type: "array",
    minItems: 5,
    maxItems: 5,
    items: object({
      displayTitle: { type: "string" },
      seoTitle: { type: "string" },
      reason: { type: "string" },
    }),
  },
  recommendedStructure: {
    type: "array",
    items: object({
      id: { type: "string" },
      level: { type: "integer", enum: [2] },
      heading: { type: "string" },
      purpose: { type: "string" },
      subheadings: {
        type: "array",
        items: object({
          level: { type: "integer", enum: [3] },
          heading: { type: "string" },
          purpose: { type: "string" },
        }),
      },
    }),
  },
  productStrategy: object({
    recommendedProductCount: { type: "integer" },
    selectionCriteria: stringArray,
    recommendedRoles: stringArray,
    excludeConditions: stringArray,
    rakutenSearchQueries: { type: "array", maxItems: 5, items: { type: "string" } },
    comparisonAngles: stringArray,
    compositionBias: stringArray,
    missingProductTypes: stringArray,
    selectedProductRecommendations: {
      type: "array",
      items: object({
        itemCode: { type: "string" },
        suggestedRole: { type: "string" },
        suggestedOrder: { type: "integer" },
        comparisonAngle: { type: "string" },
        recommendation: { type: "string" },
        shouldExclude: { type: "boolean" },
      }),
    },
  }),
  seoSupport: object({
    mainKeyword: { type: "string" },
    relatedKeywords: stringArray,
    questionsToAnswer: stringArray,
    internalLinkIdeas: stringArray,
    metaDescriptionDraft: { type: "string" },
    slugSuggestion: { type: "string" },
  }),
  researchNotes: object({
    factsToVerify: stringArray,
    claimsToAvoid: stringArray,
    missingInformation: stringArray,
  }),
});

const systemPrompt = `You are the planning desk for MARGIN, a Japanese lifestyle editorial medium about furniture, appliances, and interiors for newlyweds, cohabiting couples, and two-person households.
Brand values: quietness, space, attachment, honesty.
Decision priority: 1 reader trust, 2 fit with daily life, 3 editorial quality, 4 design, 5 search acquisition, 6 revenue.
Write all output in natural Japanese. Support editorial judgment; do not imitate a ranking or sales site.
Never invent search volume, ranking, competitor counts, or keyword difficulty. State that external SEO data is required when such data would be needed.
Never infer product dimensions, materials, durability, comfort, shipping, or availability. Separate product-page descriptions from editorial observations.
Never use claims equivalent to: absolute recommendation, buy or lose, No.1, dirt cheap, god-tier item, suits everyone, or other pressure language.
Do not restate Rakuten product copy as verified fact.
Create exactly five title suggestions. Create an H2/H3 structure suited to the article type. Rakuten queries must be no more than five short, concrete Japanese search phrases.
When selected products exist, propose roles, order, comparison angles, bias, missing types, and possible exclusions. Suggestions must not pretend to have changed the products.`;

const clientKey = (request) =>
  String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();

const isRateLimited = (key) => {
  const now = Date.now();
  const recent = (requestsByClient.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  requestsByClient.set(key, recent);
  return false;
};

const outputText = (payload) => {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method Not Allowed" });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return json(response, 500, {
      error: "VercelのEnvironment VariablesにOPENAI_API_KEYを登録してください。",
    });
  }

  if (isRateLimited(clientKey(request))) {
    return json(response, 429, { error: "AIリサーチの実行回数が上限に達しました。しばらく待ってから再度お試しください。" });
  }

  const input = sanitizeInput(request.body);
  if (!input.theme) {
    return json(response, 400, { error: "記事テーマを入力してください。" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
        instructions: systemPrompt,
        input: JSON.stringify(input),
        max_output_tokens: 7000,
        text: {
          format: {
            type: "json_schema",
            name: "margin_article_research",
            strict: true,
            schema: researchSchema,
          },
        },
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    return json(response, error?.name === "AbortError" ? 504 : 502, {
      error: error?.name === "AbortError"
        ? "AIリサーチがタイムアウトしました。既存のテンプレート生成をご利用ください。"
        : "AIリサーチへ接続できませんでした。既存のテンプレート生成をご利用ください。",
    });
  }
  clearTimeout(timeout);

  if (!upstream.ok) {
    return json(response, upstream.status === 429 ? 429 : 502, {
      error: upstream.status === 429
        ? "AIリサーチが混み合っています。しばらく待ってから再度お試しください。"
        : "AIリサーチを完了できませんでした。既存のテンプレート生成をご利用ください。",
    });
  }

  let research;
  try {
    const payload = await upstream.json();
    research = JSON.parse(outputText(payload));
  } catch {
    return json(response, 502, {
      error: "AIリサーチ結果を解析できませんでした。既存のテンプレート生成をご利用ください。",
    });
  }

  return json(response, 200, { research, generatedAt: new Date().toISOString() });
}
