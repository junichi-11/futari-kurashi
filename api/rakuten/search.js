const RAKUTEN_SEARCH_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const DEFAULT_HTTP_REFERER = "https://futari-kurashi.pages.dev/";

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

const safeResponseHeaders = (headers) => {
  const allowed = [
    "content-type",
    "date",
    "server",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
  ];

  return Object.fromEntries(
    allowed
      .map((name) => [name, headers.get(name)])
      .filter(([, value]) => value !== null),
  );
};

const sendJson = (response, status, body, cacheControl = "no-store") => {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", cacheControl);
  response.json(body);
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { error: "Method Not Allowed" });
  }

  const requestUrl = new URL(request.url, "https://function.local");
  const keyword = requestUrl.searchParams.get("q")?.trim() ?? "";

  if (Array.from(keyword).length < 2) {
    return sendJson(response, 400, {
      error: "The search keyword must contain at least 2 characters.",
    });
  }

  const applicationId = process.env.RAKUTEN_APPLICATION_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;

  if (!applicationId || !accessKey || !affiliateId) {
    return sendJson(response, 500, {
      error: "Set the Rakuten API credentials in Vercel Environment Variables.",
    });
  }

  const configuredReferer =
    process.env.RAKUTEN_HTTP_REFERER || DEFAULT_HTTP_REFERER;
  let refererUrl;
  try {
    refererUrl = new URL(configuredReferer);
  } catch {
    return sendJson(response, 500, {
      error: "RAKUTEN_HTTP_REFERER must be a valid HTTPS URL.",
    });
  }

  if (refererUrl.protocol !== "https:") {
    return sendJson(response, 500, {
      error: "RAKUTEN_HTTP_REFERER must be a valid HTTPS URL.",
    });
  }

  const apiUrl = new URL(RAKUTEN_SEARCH_ENDPOINT);
  apiUrl.search = new URLSearchParams({
    applicationId,
    affiliateId,
    accessKey,
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
      headers: {
        Accept: "application/json",
        Origin: refererUrl.origin,
        Referer: refererUrl.href,
      },
    });
  } catch (error) {
    console.error("Rakuten API request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return sendJson(response, 502, {
      error: "Unable to connect to the Rakuten Ichiba Item Search API.",
    });
  }

  const apiResponseBody = await apiResponse.text();

  if (!apiResponse.ok) {
    console.error("Rakuten API response", {
      status: apiResponse.status,
      headers: safeResponseHeaders(apiResponse.headers),
      body: apiResponseBody,
    });

    if (apiResponse.status === 429) {
      return sendJson(response, 429, {
        error: "The Rakuten Ichiba Item Search API rate limit was reached.",
      });
    }

    return sendJson(response, 502, {
      error: "The Rakuten Ichiba Item Search API returned an error.",
    });
  }

  let data;
  try {
    data = JSON.parse(apiResponseBody);
  } catch {
    return sendJson(response, 502, {
      error: "Unable to parse the Rakuten Ichiba Item Search API response.",
    });
  }

  const sourceItems = data.items ?? data.Items ?? [];
  const items = Array.isArray(sourceItems)
    ? sourceItems.slice(0, 12).map(normalizeItem)
    : [];

  return sendJson(
    response,
    200,
    {
      keyword,
      count: numberOrZero(data.count),
      page: numberOrZero(data.page) || 1,
      pageCount: numberOrZero(data.pageCount),
      hits: numberOrZero(data.hits) || items.length,
      items,
    },
    "public, max-age=60",
  );
}
