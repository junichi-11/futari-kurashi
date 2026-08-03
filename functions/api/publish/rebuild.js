const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const origin = value => { try { const url = new URL(value); return url.protocol === "https:" ? url.origin : null; } catch { return null; } };

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") return json({ error: "POSTのみ利用できます。" }, 405);
  const upstreamOrigin = origin(context.env?.PUBLISH_VERCEL_ORIGIN || context.env?.RAKUTEN_VERCEL_ORIGIN);
  if (!upstreamOrigin) return json({ error: "Cloudflare PagesのPUBLISH_VERCEL_ORIGINを設定してください。" }, 500);
  let response;
  try {
    response = await fetch(new URL("/api/publish/rebuild", upstreamOrigin), { method: "POST", headers: { "content-type": "application/json", "origin": new URL(request.url).origin, "x-margin-publish-key": request.headers.get("x-margin-publish-key") || "" }, body: "{}", redirect: "manual" });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "公開サービスへ接続できません。" }, 502); }
  const text = await response.text(), type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return json({ ok: false, error: text || "VercelからJSON以外のレスポンスが返されました。", upstreamStatus: response.status }, response.ok ? 502 : response.status);
  try { return json(text ? JSON.parse(text) : {}, response.status); }
  catch { return json({ ok: false, error: "VercelのJSONレスポンスを解析できませんでした。", upstreamStatus: response.status }, 502); }
}
