#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { environment, loadManifest, validateManifest } from "./notion/config.mjs";
import { NotionClient } from "./notion/client.mjs";
import { buildManagedSection } from "./notion/managed-section.mjs";
import { diffManagedSection } from "./notion/diff.mjs";
import { SyncLogger } from "./notion/logger.mjs";

const root = process.cwd(); const command = process.argv[2] || "dry-run"; const config = environment();
const logger = new SyncLogger({ mode: command, commitSha: config.commitSha });
const fail = message => { logger.error(message); process.exitCode = 1; };
const writeSummary = () => { logger.info(logger.markdown()); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${logger.markdown()}\n`); };

async function main() {
  let manifest;
  try { manifest = loadManifest(root); } catch (error) { fail(error.message); return; }
  const errors = validateManifest(manifest, root);
  const suspicious = manifest.documents.flatMap(document => {
    const source = fs.existsSync(path.join(root, document.source_path)) ? fs.readFileSync(path.join(root, document.source_path), "utf8") : "";
    return /(secret_|ntn_)[A-Za-z0-9_-]{10,}|hb\.afl\.rakuten\.co\.jp/.test(source) ? [`${document.id}: possible secret or affiliate URL in MOS source`] : [];
  });
  errors.push(...suspicious);
  if (errors.length) { errors.forEach(fail); return; }
  logger.info(`MOS manifest valid: ${manifest.documents.length} documents.`);
  if (command === "validate") return;
  if (!config.token || !config.rootPageId) { fail("NOTION_TOKEN and NOTION_ROOT_PAGE_ID are required for connection checks. No write was attempted."); return; }
  const client = new NotionClient(config);
  await client.retrievePage(config.rootPageId);
  logger.info("Notion connection and root page access confirmed (read-only check).");
  if (command === "check") return;
  const apply = command === "sync";
  if (apply && (config.dryRun || config.requestedMode !== "apply")) { fail("Apply requires NOTION_SYNC_MODE=apply and NOTION_DRY_RUN=false."); return; }
  const selected = manifest.documents.filter(item => item.enabled && (config.target === "all" || item.id === config.target));
  if (!selected.length) { fail(`No enabled MOS document matched target: ${config.target}`); return; }
  logger.info(`${apply ? "Apply" : "Dry-run"}: ${selected.length} document(s).`);
  const rootChildren = await client.listChildren(config.rootPageId);
  const plans = [];
  for (const document of selected) {
    const markdown = fs.readFileSync(path.join(root, document.source_path), "utf8");
    const configuredPageId = process.env[document.notion_page_id_env];
    const childPage = document.sync_mode === "create_child_page" ? rootChildren.find(block => block.type === "child_page" && block.child_page?.title === document.title) : null;
    const pageId = configuredPageId || childPage?.id || config.rootPageId;
    const warnings = []; const next = buildManagedSection(document, markdown, { commitSha: config.commitSha, syncedAt: new Date().toISOString() }, { warn: warning => warnings.push(warning) });
    warnings.forEach(warning => logger.warn(`${document.id}: ${warning}`));
    const existing = document.sync_mode === "create_child_page" && !configuredPageId && !childPage ? [] : await client.listChildren(pageId); const difference = diffManagedSection(existing, next, document.id); logger.document(document.id, difference.action);
    logger.info(`${document.id}: ${difference.action}`);
    plans.push({ document, configuredPageId, childPage, pageId, next, difference });
  }
  const changes = plans.filter(plan => plan.difference.action !== "unchanged");
  logger.info(`Plan complete: ${plans.length} target page(s), ${changes.length} change(s).`);
  if (!apply) return;
  for (const { document, configuredPageId, childPage, pageId, next, difference } of changes) {
    if (document.sync_mode === "append_managed_section" && difference.action === "update") { logger.warn(`${document.id}: append mode keeps the prior managed section and appends a new version.`); }
    if (document.sync_mode === "create_child_page") {
      const targetPageId = configuredPageId || childPage?.id || (await client.createChildPage(config.rootPageId, document.title)).id;
      await client.appendChildren(targetPageId, next);
      if (difference.current.found) for (const block of difference.current.blocks) await client.trashBlock(block.id);
    } else {
      await client.appendChildren(pageId, next);
      if (document.sync_mode === "replace_managed_section" && difference.current.found) for (const block of difference.current.blocks) await client.trashBlock(block.id);
    }
  }
}

try { await main(); } catch (error) { fail(error.message); } finally { writeSummary(); }
