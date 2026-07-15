# MARGIN / futari-kurashi

ふたり暮らしの家具・家電選びを「余白」から編集する、静的メディアのリポジトリです。

## 構成

- `index.html` — 既存のホームページ
- `articles/` — 公開記事（記事ごとに `index.html` を配置）
- `data/articles.json` — 記事メタデータ
- `data/products.json` — 掲載商品データ
- `docs/` — 編集方針とリリース手順
- `robots.txt` / `sitemap.xml` — クローラー向け設定
- `_headers` / `_redirects` — 静的ホスティング向け配信設定

## ローカル確認

リポジトリ直下で静的HTTPサーバーを起動し、ホームと記事を確認します。

```sh
python -m http.server 8000
```

- Home: `http://localhost:8000/`
- Article: `http://localhost:8000/articles/sofa-for-couples/`

直接ファイルを開くのではなくHTTP経由で確認してください。ルート相対リンクやディレクトリURLを本番に近い条件で検証できます。

## 更新フロー

1. `docs/editorial-guidelines.md` に沿って記事とデータを更新する。
2. `docs/release-checklist.md` の内容・表示・リンク・SEO項目を確認する。
3. Draft Pull Requestでレビューし、承認後に `main` へマージする。

公開URL: <https://futari-kurashi.vercel.app>
