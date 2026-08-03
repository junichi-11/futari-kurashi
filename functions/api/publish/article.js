const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const origin = (value) => { try { const url = new URL(value); return url.protocol === "https:" ? url.origin : null; } catch { return null; } };

async function proxyPublish(context) {
  const { request } = context;
  if (request.method !== "POST") return json({ error: "POSTのみ利用できます。" }, 405);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) return json({ error: "Content-Typeはapplication/jsonにしてください。" }, 415);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2 * 1024 * 1024) return json({ error: "公開データが2MBを超えています。" }, 413);
  const upstreamOrigin = origin(context.env?.PUBLISH_VERCEL_ORIGIN || context.env?.RAKUTEN_VERCEL_ORIGIN);
  if (!upstreamOrigin) return json({ error: "Cloudflare PagesのPUBLISH_VERCEL_ORIGINを設定してください。" }, 500);
  const body = await request.arrayBuffer();
  if (body.byteLength > 2 * 1024 * 1024) return json({ error: "公開データが2MBを超えています。" }, 413);
  let response;
  try {
    response = await fetch(new URL("/api/publish/article", upstreamOrigin), { method: "POST", headers: { "content-type": "application/json", "origin": new URL(request.url).origin, "x-margin-publish-key": request.headers.get("x-margin-publish-key") || "", "idempotency-key": request.headers.get("idempotency-key") || "" }, body, redirect: "manual" });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "公開サービスへ接続できません。" }, 502); }
  const responseText = await response.text();
  const responseType = response.headers.get("content-type") || "";
  if (!responseType.toLowerCase().includes("application/json")) return json({ ok: false, error: responseText || "VercelからJSON以外のレスポンスが返されました。", upstreamStatus: response.status }, response.ok ? 502 : response.status);
  try { return json(responseText ? JSON.parse(responseText) : {}, response.status); }
  catch { return json({ ok: false, error: responseText || "VercelのJSONレスポンスを解析できませんでした。", upstreamStatus: response.status }, response.ok ? 502 : response.status); }
}

export async function onRequest(context) {
  try { return await proxyPublish(context); }
  catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "A server error occurred." }, 500); }
}
