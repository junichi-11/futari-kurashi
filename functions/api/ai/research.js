const respond = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const getOrigin = (env) => {
  const value = env?.AI_VERCEL_ORIGIN || env?.RAKUTEN_VERCEL_ORIGIN;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
};

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return respond({ error: "Method Not Allowed" }, 405);
  }

  const origin = getOrigin(context.env);
  if (!origin) {
    return respond({ error: "Vercel AI service origin is not configured." }, 500);
  }

  let body;
  try {
    body = await context.request.text();
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  try {
    const upstream = await fetch(new URL("/api/ai/research", origin), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body,
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return respond({ error: "AIリサーチへ接続できませんでした。" }, 502);
  }
}
