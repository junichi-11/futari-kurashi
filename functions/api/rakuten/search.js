const RAKUTEN_SEARCH_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

const jsonResponse = (body, status, cacheControl) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstImageUrl = (item) => {
  const images =
    item.mediumImageUrls ?? item.itemImageUrls ?? item.smallImageUrls ?? [];
  const first = Array.isArray(images) ? images[0] : null;
  return typeof first === "string" ? first : first?.imageUrl ?? "";
};

const normalizeItem = (entry) => {
  const item = entry?.Item ?? entry ?? {};

  return {
    itemCode: item.itemCode ?? "",
    name: item.itemName ?? item.name ?? "",
    catchcopy: item.catchcopy ?? "",
    price: numberOrZero(item.itemPrice ?? item.price),
    imageUrl: firstImageUrl(item),
    itemUrl: item.itemUrl ?? "",
    affiliateUrl: item.affiliateUrl ?? "",
    shopName: item.shopName ?? "",
    shopUrl: item.shopUrl ?? "",
    reviewAverage: numberOrZero(item.reviewAverage),
    reviewCount: numberOrZero(item.reviewCount),
    availability: numberOrZero(item.availability),
    postageFlag: numberOrZero(item.postageFlag),
  };
};

export async function onRequest(context) {
  const { request } = context;
  const env = context.env ?? {};

  if (request.method !== "GET") {
    return jsonResponse(
      { error: "Method Not Allowed" },
      405,
      "no-store",
    );
  }

  const keyword = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (Array.from(keyword).length < 2) {
    return jsonResponse(
      { error: "検索キーワードは2文字以上で指定してください。" },
      400,
      "no-store",
    );
  }

  const RAKUTEN_APPLICATION_ID = env.RAKUTEN_APPLICATION_ID;
  const RAKUTEN_ACCESS_KEY = env.RAKUTEN_ACCESS_KEY;
  const RAKUTEN_AFFILIATE_ID = env.RAKUTEN_AFFILIATE_ID;
  const bindingStatus = {
    RAKUTEN_APPLICATION_ID:
      typeof RAKUTEN_APPLICATION_ID === "string" &&
      RAKUTEN_APPLICATION_ID.trim().length > 0,
    RAKUTEN_ACCESS_KEY:
      typeof RAKUTEN_ACCESS_KEY === "string" &&
      RAKUTEN_ACCESS_KEY.trim().length > 0,
    RAKUTEN_AFFILIATE_ID:
      typeof RAKUTEN_AFFILIATE_ID === "string" &&
      RAKUTEN_AFFILIATE_ID.trim().length > 0,
  };
  const missingBindings = Object.entries(bindingStatus)
    .filter(([, configured]) => !configured)
    .map(([name]) => name);

  // Secret values must never be logged. This status-only log is safe to use in
  // Cloudflare Pages Functions logs when diagnosing environment bindings.
  console.info("Rakuten API binding status", bindingStatus);

  if (missingBindings.length > 0) {
    return jsonResponse(
      {
        error:
          "CloudflareのVariables and Secretsに楽天API認証情報を登録してください。",
        missingBindings,
      },
      500,
      "no-store",
    );
  }

  const apiUrl = new URL(RAKUTEN_SEARCH_ENDPOINT);
  apiUrl.search = new URLSearchParams({
    applicationId: RAKUTEN_APPLICATION_ID,
    affiliateId: RAKUTEN_AFFILIATE_ID,
    keyword,
    format: "json",
    formatVersion: "2",
    hits: "12",
    page: "1",
    sort: "standard",
    imageFlag: "1",
    availability: "1",
  }).toString();

  let apiResponse;
  try {
    apiResponse = await fetch(apiUrl, {
      headers: { accessKey: RAKUTEN_ACCESS_KEY },
    });
  } catch {
    return jsonResponse(
      { error: "楽天市場商品検索APIへ接続できませんでした。" },
      502,
      "no-store",
    );
  }

  if (apiResponse.status === 429) {
    return jsonResponse(
      { error: "楽天市場商品検索APIの利用上限に達しました。" },
      429,
      "no-store",
    );
  }

  if (!apiResponse.ok) {
    return jsonResponse(
      { error: "楽天市場商品検索APIでエラーが発生しました。" },
      502,
      "no-store",
    );
  }

  let data;
  try {
    data = await apiResponse.json();
  } catch {
    return jsonResponse(
      { error: "楽天市場商品検索APIの応答を解析できませんでした。" },
      502,
      "no-store",
    );
  }

  const sourceItems = data.items ?? data.Items ?? [];
  const items = Array.isArray(sourceItems)
    ? sourceItems.slice(0, 12).map(normalizeItem)
    : [];

  return jsonResponse(
    {
      keyword,
      count: numberOrZero(data.count),
      page: numberOrZero(data.page) || 1,
      pageCount: numberOrZero(data.pageCount),
      hits: numberOrZero(data.hits) || items.length,
      items,
    },
    200,
    "public, max-age=60",
  );
}
