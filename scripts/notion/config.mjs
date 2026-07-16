import fs from "node:fs";
import path from "node:path";

export const allowedSyncModes = new Set(["append_managed_section", "replace_managed_section", "create_child_page"]);

const scalar = value => {
  const text = value.trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) return text.slice(1, -1).split(",").map(item => item.trim()).filter(Boolean);
  return text.replace(/^['"]|['"]$/g, "");
};

export function parseManifest(source) {
  const documents = [];
  let current;
  for (const [index, raw] of source.replace(/^\uFEFF/, "").split(/\r?\n/).entries()) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim() || /^version:/.test(line) || /^documents:\s*$/.test(line)) continue;
    const first = line.match(/^\s*-\s+([a-z_]+):\s*(.*)$/);
    const next = line.match(/^\s+([a-z_]+):\s*(.*)$/);
    if (first) {
      current = { [first[1]]: scalar(first[2]) };
      documents.push(current);
    } else if (next && current) current[next[1]] = scalar(next[2]);
    else throw new Error(`index.yml:${index + 1}: unsupported YAML structure`);
  }
  return { version: 1, documents };
}

export function loadManifest(root = process.cwd()) {
  return parseManifest(fs.readFileSync(path.join(root, "mos", "index.yml"), "utf8"));
}

export function environment(env = process.env) {
  return {
    token: env.NOTION_TOKEN?.trim(),
    rootPageId: env.NOTION_ROOT_PAGE_ID?.trim(),
    apiVersion: env.NOTION_API_VERSION?.trim() || "2026-03-11",
    requestedMode: env.NOTION_SYNC_MODE?.trim() || "dry-run",
    dryRun: env.NOTION_DRY_RUN !== "false",
    target: env.NOTION_SYNC_TARGET?.trim() || "all",
    commitSha: env.GITHUB_SHA || "local-worktree"
  };
}

export function validateManifest(manifest, root = process.cwd()) {
  const errors = [];
  const ids = new Set();
  for (const document of manifest.documents) {
    for (const key of ["id", "title", "source_path", "notion_page_id_env", "sync_mode", "order", "enabled", "last_reviewed", "owner", "tags"]) {
      if (document[key] === undefined || document[key] === "") errors.push(`${document.id || "unknown"}: missing ${key}`);
    }
    if (ids.has(document.id)) errors.push(`${document.id}: duplicate id`);
    ids.add(document.id);
    if (!allowedSyncModes.has(document.sync_mode)) errors.push(`${document.id}: unsupported sync_mode ${document.sync_mode}`);
    const fullPath = path.resolve(root, document.source_path || "");
    if (!fullPath.startsWith(path.resolve(root, "mos") + path.sep)) errors.push(`${document.id}: source_path must remain under mos/`);
    else if (!fs.existsSync(fullPath)) errors.push(`${document.id}: source_path not found`);
    else if (!fs.readFileSync(fullPath, "utf8").trim()) errors.push(`${document.id}: empty document`);
  }
  return errors;
}
