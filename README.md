# futari-kurashi

## 楽天市場商品検索API

Cloudflare Pages Functionsの `/api/rakuten/search` から楽天市場の商品を検索できます。Cloudflare PagesのVariables and Secretsへ次の3項目を設定してください。

- `RAKUTEN_APPLICATION_ID`
- `RAKUTEN_ACCESS_KEY`
- `RAKUTEN_AFFILIATE_ID`

テストURL: `/api/rakuten/search?q=ソファ`

`RAKUTEN_ACCESS_KEY`をソースコード、README、`.env`などへ記載してGitHubへ直接保存しないでください。CloudflareのSecretとして管理します。
