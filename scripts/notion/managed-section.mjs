import { blockPlainText, markdownToBlocks } from "./markdown.mjs";

export const startMarker = id => `[MARGIN MOS START:${id}]`;
export const endMarker = id => `[MARGIN MOS END:${id}]`;

const markerBlock = (text, emoji) => ({ object: "block", type: "callout", callout: { rich_text: [{ type: "text", text: { content: text } }], icon: { type: "emoji", emoji }, color: "gray_background" } });

export function buildManagedSection(document, markdown, metadata, options = {}) {
  const header = `${startMarker(document.id)}\nSource: ${document.source_path}\nVersion: ${metadata.commitSha}\nLast synced: ${metadata.syncedAt}`;
  return [markerBlock(header, "◼️"), ...markdownToBlocks(markdown, options), markerBlock(endMarker(document.id), "◻️")];
}

export function findManagedSection(blocks, id) {
  const start = blocks.findIndex(item => blockPlainText(item).includes(startMarker(id)));
  const end = start < 0 ? -1 : blocks.findIndex((item, index) => index > start && blockPlainText(item).includes(endMarker(id)));
  return { found: start >= 0 && end > start, start, end, blocks: start >= 0 && end > start ? blocks.slice(start, end + 1) : [] };
}

export function managedDigest(blocks) {
  return blocks.map(item => `${item.type}:${blockPlainText(item)}`).join("\n").replace(/Version: .+|Last synced: .+/g, "");
}
