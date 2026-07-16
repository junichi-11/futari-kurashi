const secretPatterns = [/(secret_|ntn_)[A-Za-z0-9_-]+/g, /https:\/\/hb\.afl\.rakuten\.co\.jp\/[^\s)]+/g];
export const redact = value => secretPatterns.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), String(value));

export class SyncLogger {
  constructor({ mode = "dry-run", commitSha = "local-worktree" } = {}) {
    this.summary = { mode, documents: [], add: 0, update: 0, unchanged: 0, warnings: [], errors: [], commitSha, executedAt: new Date().toISOString() };
  }
  info(message) { console.log(redact(message)); }
  warn(message) { const safe = redact(message); this.summary.warnings.push(safe); console.warn(`WARN: ${safe}`); }
  error(message) { const safe = redact(message); this.summary.errors.push(safe); console.error(`ERROR: ${safe}`); }
  document(id, action) { this.summary.documents.push({ id, action }); if (action === "add") this.summary.add++; else if (action === "update") this.summary.update++; else this.summary.unchanged++; }
  markdown() {
    const s = this.summary;
    return [`## MARGIN MOS → Notion`, `- Mode: ${s.mode}`, `- Documents: ${s.documents.length}`, `- Add: ${s.add}`, `- Update: ${s.update}`, `- Unchanged: ${s.unchanged}`, `- Warnings: ${s.warnings.length}`, `- Errors: ${s.errors.length}`, `- Commit: ${s.commitSha}`, `- Executed: ${s.executedAt}`].join("\n");
  }
}
