export class NotionApiError extends Error {
  constructor(status, message, { retryable = false, code = "notion_api_error" } = {}) { super(message); this.status = status; this.retryable = retryable; this.code = code; }
}

const messageFor = status => ({
  401: "Notion token is invalid or expired.",
  403: "The Notion connection lacks the required capability.",
  404: "The Notion page was not found or has not been shared with the connection."
}[status] || `Notion API request failed (${status}).`);

export class NotionClient {
  constructor({ token, apiVersion = "2026-03-11", fetchImpl = fetch, maxRetries = 2 }) { this.token = token; this.apiVersion = apiVersion; this.fetchImpl = fetchImpl; this.maxRetries = maxRetries; }
  async request(method, pathname, body) {
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await this.fetchImpl(`https://api.notion.com/v1${pathname}`, { method, headers: { Authorization: `Bearer ${this.token}`, "Notion-Version": this.apiVersion, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      } catch (error) {
        if (attempt < this.maxRetries) continue;
        throw new NotionApiError(0, "Notion API network request failed.", { retryable: true, code: "network_error" });
      }
      if (response.ok) return response.status === 204 ? null : response.json();
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < this.maxRetries) continue;
      throw new NotionApiError(response.status, messageFor(response.status), { retryable, code: response.status === 404 ? "object_not_found_or_unshared" : "http_error" });
    }
  }
  retrievePage(id) { return this.request("GET", `/pages/${id}`); }
  createChildPage(parentId, title) { return this.request("POST", "/pages", { parent: { type: "page_id", page_id: parentId }, properties: { title: { type: "title", title: [{ type: "text", text: { content: title } }] } } }); }
  async listChildren(id) {
    const results = []; let cursor;
    do { const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}&page_size=100` : "?page_size=100"; const page = await this.request("GET", `/blocks/${id}/children${query}`); results.push(...page.results); cursor = page.has_more ? page.next_cursor : null; } while (cursor);
    return results;
  }
  appendChildren(id, children) { return this.request("PATCH", `/blocks/${id}/children`, { children, position: { type: "end" } }); }
  trashBlock(id) { return this.request("PATCH", `/blocks/${id}`, { in_trash: true }); }
}
