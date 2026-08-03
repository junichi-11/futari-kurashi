import publishHandler from "../api/publish/article.js";
import { onRequest } from "../functions/api/publish/article.js";
import rebuildHandler from "../api/publish/rebuild.js";
import { onRequest as onRebuildRequest } from "../functions/api/publish/rebuild.js";

const expect = (condition, label) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) process.exitCode = 1;
};

const mockResponse = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  status(code) { this.statusCode = code; return this; },
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  json(value) { this.body = value; return this; }
});

const callVercel = async (req) => {
  const res = mockResponse();
  await publishHandler(req, res);
  return res;
};

const callRebuild = async (req) => {
  const res = mockResponse();
  await rebuildHandler(req, res);
  return res;
};

const vercelMethod = await callVercel({ method: "GET", headers: {} });
expect(vercelMethod.statusCode === 405 && vercelMethod.headers["content-type"].includes("application/json") && typeof vercelMethod.body === "object", "Vercel 405 JSON");
const rebuildMethod = await callRebuild({ method: "GET", headers: {} });
expect(rebuildMethod.statusCode === 405 && rebuildMethod.headers["content-type"].includes("application/json"), "Rebuild Vercel 405 JSON");

const originalEnv = Object.fromEntries(["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH", "MARGIN_PUBLISH_SECRET"].map(key => [key, process.env[key]]));
for (const key of Object.keys(originalEnv)) delete process.env[key];
const vercelMissing = await callVercel({ method: "POST", headers: { origin: "https://futari-kurashi.pages.dev", "content-type": "application/json" }, body: {} });
expect(vercelMissing.statusCode === 500 && vercelMissing.headers["content-type"].includes("application/json") && Array.isArray(vercelMissing.body.missing), "Vercel missing env JSON");
Object.assign(process.env, { GITHUB_TOKEN: "test", GITHUB_OWNER: "owner", GITHUB_REPO: "repo", GITHUB_BRANCH: "main", MARGIN_PUBLISH_SECRET: "correct" });
const vercelUnauthorized = await callVercel({ method: "POST", headers: { origin: "https://futari-kurashi.pages.dev", "content-type": "application/json", "x-margin-publish-key": "wrong" }, body: {} });
expect(vercelUnauthorized.statusCode === 401 && vercelUnauthorized.headers["content-type"].includes("application/json") && typeof vercelUnauthorized.body.error === "string", "Vercel 401 JSON");
const rebuildUnauthorized = await callRebuild({ method: "POST", headers: { origin: "https://futari-kurashi.pages.dev", "content-type": "application/json", "x-margin-publish-key": "wrong" }, body: {} });
expect(rebuildUnauthorized.statusCode === 401 && rebuildUnauthorized.headers["content-type"].includes("application/json"), "Rebuild Vercel 401 JSON");
for (const [key, value] of Object.entries(originalEnv)) value === undefined ? delete process.env[key] : process.env[key] = value;

const cloudflareMethod = await onRequest({ request: new Request("https://futari-kurashi.pages.dev/api/publish/article", { method: "GET" }), env: {} });
expect(cloudflareMethod.status === 405 && cloudflareMethod.headers.get("content-type").includes("application/json") && typeof await cloudflareMethod.json() === "object", "Cloudflare 405 JSON");

const cloudflareMissing = await onRequest({ request: new Request("https://futari-kurashi.pages.dev/api/publish/article", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env: {} });
expect(cloudflareMissing.status === 500 && cloudflareMissing.headers.get("content-type").includes("application/json") && typeof await cloudflareMissing.json() === "object", "Cloudflare missing origin JSON");
const rebuildCloudflareMethod = await onRebuildRequest({ request: new Request("https://futari-kurashi.pages.dev/api/publish/rebuild", { method: "GET" }), env: {} });
expect(rebuildCloudflareMethod.status === 405 && rebuildCloudflareMethod.headers.get("content-type").includes("application/json"), "Rebuild Cloudflare 405 JSON");

const cloudflareUpstream = await onRequest({ request: new Request("https://futari-kurashi.pages.dev/api/publish/article", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env: { PUBLISH_VERCEL_ORIGIN: "https://127.0.0.1:9" } });
expect(cloudflareUpstream.status === 502 && cloudflareUpstream.headers.get("content-type").includes("application/json") && typeof await cloudflareUpstream.json() === "object", "Cloudflare upstream failure JSON");

const admin = await (await import("node:fs/promises")).readFile("admin/articles.html", "utf8");
expect(admin.includes('response.headers.get("content-type")') && admin.includes("responseBody=await response.text()"), "Frontend content-type fallback");
expect(admin.includes("HTTP Status") && admin.includes("Response Headers") && admin.includes("Response Body"), "Publish response debug fields");
expect(admin.includes("Rebuild Published Articles") && admin.includes("/api/publish/rebuild"), "Article Builder rebuild control");
