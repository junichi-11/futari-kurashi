import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public");
const entries = ["index.html", "about", "articles", "components", "data", "robots.txt", "sitemap.xml", "_headers", "_redirects"];

if (!output.startsWith(root + path.sep)) throw new Error("Unsafe static output path");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) throw new Error(`Missing static source: ${entry}`);
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}
console.log(`Static output ready: ${entries.length} entries in public/`);
