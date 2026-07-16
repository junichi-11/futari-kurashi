const textObject = (content, annotations = {}, link) => ({ type: "text", text: { content: content.slice(0, 2000), link: link ? { url: link } : null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default", ...annotations } });

export function richText(source) {
  const output = []; let remaining = source;
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/;
  while (remaining) {
    const match = remaining.match(pattern);
    if (!match) { output.push(textObject(remaining)); break; }
    if (match.index) output.push(textObject(remaining.slice(0, match.index)));
    if (match[2]) output.push(textObject(match[2], { bold: true }));
    else if (match[3]) output.push(textObject(match[3], { italic: true }));
    else if (match[4]) output.push(textObject(match[4], { code: true }));
    else output.push(textObject(match[5], {}, match[6]));
    remaining = remaining.slice(match.index + match[0].length);
  }
  return output.length ? output : [textObject("")];
}

const block = (type, text, extra = {}) => ({ object: "block", type, [type]: type === "divider" ? {} : { rich_text: richText(text), ...extra } });

export function markdownToBlocks(markdown, { warn = () => {} } = {}) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/); const blocks = [];
  let paragraph = []; let code = null; let codeLanguage = "plain text"; let table = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push(block("paragraph", paragraph.join(" "))); paragraph = []; };
  const flushTable = () => { if (!table.length) return; warn("Markdown table converted to a code block for safe Notion rendering."); blocks.push({ object: "block", type: "code", code: { rich_text: [textObject(table.join("\n"))], language: "plain text", caption: [] } }); table = []; };
  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (fence) { flushParagraph(); flushTable(); if (code === null) { code = []; codeLanguage = fence[1].trim() || "plain text"; } else { blocks.push({ object: "block", type: "code", code: { rich_text: [textObject(code.join("\n"))], language: codeLanguage, caption: [] } }); code = null; } continue; }
    if (code) { code.push(line); continue; }
    if (/^\|.*\|\s*$/.test(line)) { flushParagraph(); table.push(line); continue; } else flushTable();
    if (!line.trim()) { flushParagraph(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/); if (heading) { flushParagraph(); blocks.push(block(`heading_${heading[1].length}`, heading[2], { is_toggleable: false, color: "default" })); continue; }
    if (/^---+$/.test(line.trim())) { flushParagraph(); blocks.push(block("divider", "")); continue; }
    const todo = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/); if (todo) { flushParagraph(); blocks.push(block("to_do", todo[2], { checked: todo[1].toLowerCase() === "x", color: "default" })); continue; }
    const bullet = line.match(/^[-*]\s+(.+)$/); if (bullet) { flushParagraph(); blocks.push(block("bulleted_list_item", bullet[1], { color: "default" })); continue; }
    const number = line.match(/^\d+[.)]\s+(.+)$/); if (number) { flushParagraph(); blocks.push(block("numbered_list_item", number[1], { color: "default" })); continue; }
    const quote = line.match(/^>\s?(.*)$/); if (quote) { flushParagraph(); blocks.push(block("quote", quote[1], { color: "default" })); continue; }
    const callout = line.match(/^!>\s*(.+)$/); if (callout) { flushParagraph(); blocks.push(block("callout", callout[1], { icon: { type: "emoji", emoji: "ℹ️" }, color: "gray_background" })); continue; }
    if (/^</.test(line.trim())) warn(`Unsupported raw HTML preserved as paragraph: ${line.trim().slice(0, 60)}`);
    paragraph.push(line.trim());
  }
  flushParagraph(); flushTable();
  if (code) { warn("Unclosed code fence preserved as code block."); blocks.push({ object: "block", type: "code", code: { rich_text: [textObject(code.join("\n"))], language: codeLanguage, caption: [] } }); }
  return blocks;
}

export function blockPlainText(blockValue) {
  const body = blockValue?.[blockValue.type];
  return (body?.rich_text || body?.caption || []).map(item => item.plain_text ?? item.text?.content ?? "").join("");
}
