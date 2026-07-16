import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseManifest, validateManifest } from "../scripts/notion/config.mjs";
import { markdownToBlocks } from "../scripts/notion/markdown.mjs";
import { buildManagedSection, findManagedSection } from "../scripts/notion/managed-section.mjs";
import { diffManagedSection } from "../scripts/notion/diff.mjs";
import { NotionClient, NotionApiError } from "../scripts/notion/client.mjs";
import { redact } from "../scripts/notion/logger.mjs";

const root = path.resolve(import.meta.dirname, "..");
const document = { id: "sample", source_path: "mos/sample.md" };

test("index.yml parsing keeps document metadata", () => {
  const manifest = parseManifest("version: 1\ndocuments:\n  - id: a\n    title: A\n    enabled: true\n    tags: [one, two]\n");
  assert.deepEqual(manifest.documents[0], { id: "a", title: "A", enabled: true, tags: ["one", "two"] });
});

test("Markdown conversion supports required blocks and warns for safe table fallback", () => {
  const warnings = [];
  const blocks = markdownToBlocks(fs.readFileSync(path.join(root, "tests/fixtures/sample.md"), "utf8"), { warn: value => warnings.push(value) });
  for (const type of ["heading_1", "paragraph", "bulleted_list_item", "numbered_list_item", "to_do", "quote", "callout", "code"]) assert.ok(blocks.some(item => item.type === type), type);
  assert.ok(warnings.some(item => item.includes("table")));
  const paragraph = blocks.find(item => item.type === "paragraph");
  assert.ok(paragraph.paragraph.rich_text.some(item => item.annotations.bold));
  assert.ok(paragraph.paragraph.rich_text.some(item => item.text.link?.url === "https://example.com"));
});

test("managed section detection ignores blocks outside markers", () => {
  const managed = buildManagedSection(document, "# Managed", { commitSha: "abc", syncedAt: "2026-07-16T00:00:00Z" });
  const outside = { type: "paragraph", paragraph: { rich_text: [{ plain_text: "human note" }] } };
  const detected = findManagedSection([outside, ...managed, outside], "sample");
  assert.equal(detected.found, true);
  assert.equal(detected.blocks.length, managed.length);
});

test("dry-run diff reports add, update, and unchanged", () => {
  const current = buildManagedSection(document, "# A", { commitSha: "a", syncedAt: "one" });
  const same = buildManagedSection(document, "# A", { commitSha: "b", syncedAt: "two" });
  const changed = buildManagedSection(document, "# B", { commitSha: "b", syncedAt: "two" });
  assert.equal(diffManagedSection([], same, "sample").action, "add");
  assert.equal(diffManagedSection(current, same, "sample").action, "unchanged");
  assert.equal(diffManagedSection(current, changed, "sample").action, "update");
});

test("duplicate IDs, unsupported modes, missing paths, and empty documents fail validation", () => {
  const temp = fs.mkdtempSync(path.join(root, "tests", "tmp-"));
  fs.mkdirSync(path.join(temp, "mos"));
  fs.writeFileSync(path.join(temp, "mos", "empty.md"), "");
  const base = { title: "T", notion_page_id_env: "PAGE", order: 1, enabled: true, last_reviewed: "2026-07-16", owner: "M", tags: ["x"] };
  const errors = validateManifest({ documents: [
    { ...base, id: "dup", source_path: "mos/empty.md", sync_mode: "invalid" },
    { ...base, id: "dup", source_path: "mos/missing.md", sync_mode: "create_child_page" }
  ] }, temp);
  assert.ok(errors.some(item => item.includes("duplicate")));
  assert.ok(errors.some(item => item.includes("unsupported")));
  assert.ok(errors.some(item => item.includes("empty")));
  assert.ok(errors.some(item => item.includes("not found")));
  fs.rmSync(temp, { recursive: true, force: true });
});

test("missing secrets stop check without exposing values", () => {
  const result = spawnSync(process.execPath, ["scripts/notion-sync.mjs", "check"], { cwd: root, encoding: "utf8", env: { ...process.env, NOTION_TOKEN: "", NOTION_ROOT_PAGE_ID: "" } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /required/);
});

test("401, 403, and 404 produce actionable errors", async () => {
  for (const [status, message] of [[401, "invalid"], [403, "capability"], [404, "shared"]]) {
    const client = new NotionClient({ token: "test", maxRetries: 0, fetchImpl: async () => ({ ok: false, status }) });
    await assert.rejects(client.retrievePage("page"), error => error instanceof NotionApiError && error.status === status && error.message.includes(message));
  }
});

test("logger redacts secrets and affiliate URLs", () => {
  const output = redact("secret_abcdefghijklmnopqrstuvwxyz https://hb.afl.rakuten.co.jp/ichiba/example?token=1");
  assert.equal(output.includes("secret_"), false);
  assert.equal(output.includes("hb.afl"), false);
});

test("CLI validation runs with the Windows-safe Node entrypoint", () => {
  const result = spawnSync(process.execPath, ["scripts/notion-sync.mjs", "validate"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /manifest valid/);
});
