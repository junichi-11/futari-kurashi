import { createHash, timingSafeEqual } from "node:crypto";

let renderArticlePageV3;
async function loadRenderer() {
  if (!renderArticlePageV3) ({ renderArticlePageV3 } = await import("../../lib/article-template-v2.mjs"));
  return renderArticlePageV3;
}

export const config = { maxDuration: 180 };

const ALLOWED_ORIGIN = "https://futari-kurashi.pages.dev";
const REQUIRED_ENV = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH", "MARGIN_PUBLISH_SECRET"];
const allowedOrigin = origin => origin === ALLOWED_ORIGIN || origin === "https://futari-kurashi.vercel.app" || /^https:\/\/[a-z0-9-]+\.futari-kurashi\.pages\.dev$/i.test(origin || "");
const safeEqual = (left, right) => timingSafeEqual(createHash("sha256").update(String(left || "")).digest(), createHash("sha256").update(String(right || "")).digest());
const json = (response, status, body, origin = ALLOWED_ORIGIN) => {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vary", "Origin");
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  return response.json(body);
};
const headers = token => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" });

async function github(path, env, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${env.owner}/${env.repo}${path}`, { ...options, headers: { ...headers(env.token), ...(options.headers || {}) } });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) { const error = new Error(`GitHub API ${response.status}`); error.status = response.status; throw error; }
  return data;
}

export async function readFile(path, env) {
  const data = await github(`/contents/${path}?ref=${encodeURIComponent(env.branch)}`, env);
  return Buffer.from(data.content || "", "base64").toString("utf8");
}

export async function commitFiles(files, env, message = `Rebuild published articles with Article Template v3\n\nArticles: ${Object.keys(files).length}`) {
  const ref = await github(`/git/ref/heads/${encodeURIComponent(env.branch)}`, env);
  const parent = await github(`/git/commits/${ref.object.sha}`, env);
  const tree = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await github("/git/blobs", env, { method: "POST", body: JSON.stringify({ content, encoding: "utf-8" }) });
    tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const nextTree = await github("/git/trees", env, { method: "POST", body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  if (nextTree.sha === parent.tree.sha) return { sha: ref.object.sha, unchanged: true };
  const commit = await github("/git/commits", env, { method: "POST", body: JSON.stringify({ message, tree: nextTree.sha, parents: [ref.object.sha] }) });
  await github(`/git/refs/heads/${encodeURIComponent(env.branch)}`, env, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return { sha: commit.sha, unchanged: false };
}

async function rebuildHandler(request, response) {
  const origin = request.headers.origin || "";
  if (request.method !== "POST") { response.setHeader("Allow", "POST"); return json(response, 405, { error: "POSTのみ利用できます。" }, allowedOrigin(origin) ? origin : null); }
  if (!allowedOrigin(origin)) return json(response, 403, { error: "Originが許可されていません。" }, null);
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) return json(response, 415, { error: "Content-Typeはapplication/jsonにしてください。" }, origin);
  const missing = REQUIRED_ENV.filter(name => !String(process.env[name] || "").trim());
  if (missing.length) return json(response, 500, { error: "VercelのEnvironment Variablesが不足しています。", missing }, origin);
  if (!safeEqual(request.headers["x-margin-publish-key"], process.env.MARGIN_PUBLISH_SECRET)) return json(response, 401, { error: "公開認証に失敗しました。" }, origin);

  const env = { token: process.env.GITHUB_TOKEN, owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, branch: process.env.GITHUB_BRANCH };
  const siteOrigin = String(process.env.PUBLIC_SITE_ORIGIN || ALLOWED_ORIGIN).replace(/\/$/, "");
  try {
    const index = JSON.parse(await readFile("articles/index.json", env));
    const articles = (index.articles || []).filter(article => article.status === "Published");
    if (!articles.length) return json(response, 200, { status: "unchanged", rebuilt: 0, message: "公開済み記事はありません。" }, origin);
    if (articles.length > 100) return json(response, 413, { error: "一度に再生成できる記事は100件までです。" }, origin);
    const render = await loadRenderer();
    const files = {}, rebuilt = [];
    for (const metadata of articles) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug || "")) throw new Error("Invalid article slug");
      const record = JSON.parse(await readFile(`articles/${metadata.slug}/article.json`, env));
      files[`articles/${metadata.slug}/index.html`] = render({ ...record, articleType: metadata.articleType, target: metadata.target, roomType: metadata.roomType, editorialThemes: metadata.editorialThemes }, siteOrigin, record.publishedAt, record.updatedAt);
      rebuilt.push({ articleId: record.articleId, slug: metadata.slug, url: `${siteOrigin}${metadata.url}` });
    }
    const result = await commitFiles(files, env);
    return json(response, 200, { status: result.unchanged ? "unchanged" : "committed", rebuilt: rebuilt.length, articles: rebuilt, githubCommitSha: result.sha, githubCommitUrl: `https://github.com/${env.owner}/${env.repo}/commit/${result.sha}`, templateVersion: "3.0" }, origin);
  } catch (error) {
    if (error.status === 401 || error.status === 403) return json(response, 502, { error: "GitHub Tokenの権限を確認してください。" }, origin);
    return json(response, 502, { error: "公開済み記事の再生成に失敗しました。" }, origin);
  }
}

export default async function handler(request, response) {
  try { return await rebuildHandler(request, response); }
  catch (error) { return json(response, 500, { ok: false, error: error instanceof Error ? error.message : "A server error occurred." }, allowedOrigin(request.headers.origin || "") ? request.headers.origin : null); }
}
