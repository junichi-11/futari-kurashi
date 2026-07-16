import fs from "node:fs"; import path from "node:path";
import { root, briefDir, draftBriefs } from "./config.mjs";
export const loadJson = file => JSON.parse(fs.readFileSync(path.join(root,file),"utf8"));
export const loadBriefs = () => draftBriefs.map(file => loadJson(path.join(briefDir,file)));
