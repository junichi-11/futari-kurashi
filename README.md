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

## Product Library運用ルール

`data/products.json` は商品情報の唯一の正本です。記事に価格や評価を直接書かず、商品の `id` を介して参照します。

- `id` はブランド・商品・バリエーションを表す変更しないkebab-caseとする。
- `price` は `amount`、`currency`、`tax_included` を持つ。セール価格ではなく通常の確認価格を基本とする。
- `rating` は `value`、`scale`、`count` を持つ。公式ページで評価が公開されていない場合は `null` とする。
- `pros` と `cons` は公式仕様と編集部の利用場面評価を分け、断定しすぎない。
- `selection_role` は記事内の役割を表し、ランキング順位として扱わない。同一記事内で重複させない。
- `shop`、`dimensions`、`materials`、`shipping` に販売主体、寸法、素材、送料条件の確認結果を残す。
- `affiliate_url` は発行済みの正規URLだけを登録する。未契約・未発行時は `null` とする。
- `source` は検証に使った一次情報URL、`last_verified` は確認日時をISO 8601形式で記録する。
- `affiliate_url` が未設定の商品は必ず `publishable: false` とする。アフィリエイトURL設定済みかつ出典確認済みの場合だけ `true` にできる。
- Productionでは `publishable: true` の商品のみ表示する。Preview（記事URLに `?preview=1`）では検証用に `official_url` へのフォールバックを許可する。
- 価格、評価、在庫、仕様は公開前と定期メンテナンス時に再確認する。変更時はルートの `updated_at` も更新する。
- 商品を削除せず、掲載を止める場合は `publishable: false` にして記事から除外する。

記事側では表示順を `data/articles.json` の `productIds` で管理します。Product Libraryの配列順には依存しません。

初期6商品は第一号記事専用の候補です。将来30商品以上へ増やす際も、商品IDを不変にし、記事ごとの参照配列で採用範囲を分離します。

公開URL: <https://futari-kurashi.vercel.app>
