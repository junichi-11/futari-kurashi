const jsonResponse = (body, status, cacheControl = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });

const normalizeOrigin = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const requestUrl = new URL(request.url);
  const keyword = requestUrl.searchParams.get("q")?.trim() ?? "";

  if (Array.from(keyword).length < 2) {
    return jsonResponse(
      { error: "The search keyword must contain at least 2 characters." },
      400,
    );
  }

  const vercelOrigin = normalizeOrigin(context.env?.RAKUTEN_VERCEL_ORIGIN);
  if (!vercelOrigin) {
    return jsonResponse(
      { error: "Set RAKUTEN_VERCEL_ORIGIN in Cloudflare Pages Variables." },
      500,
    );
  }

  const upstreamUrl = new URL("/api/rakuten/search", vercelOrigin);
  upstreamUrl.searchParams.set("q", keyword);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      redirect: "manual",
    });
  } catch (error) {
    console.error("Vercel Rakuten proxy request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse(
      { error: "Unable to connect to the Rakuten search service." },
      502,
    );
  }

  const body = await upstreamResponse.text();
  const contentType =
    upstreamResponse.headers.get("content-type") ??
    "application/json; charset=utf-8";
  const cacheControl =
    upstreamResponse.headers.get("cache-control") ??
    (upstreamResponse.ok ? "public, max-age=60" : "no-store");

  return new Response(body, {
    status: upstreamResponse.status,
    headers: {
      "content-type": contentType,
      "cache-control": cacheControl,
    },
  });
}
