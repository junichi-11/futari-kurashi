# MARGIN / futari-kurashi

ふたり暮らしの家具・家電選びを「余白」から編集する、静的メディアのリポジトリです。

## 構成

- `index.html` — 既存のホームページ
- `articles/` — 公開記事（記事ごとに `index.html` を配置）
- `data/articles.json` — 記事メタデータ
- `data/products.json` — 掲載商品データ
- `docs/` — 編集方針とリリース手順
- `components/` — JSONから表示を生成する共通コンポーネント
- `scripts/` — Product Libraryの検証コード
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
- `source_id` でルートの `source_registry` を参照し、販売ページ、メーカー、出典種別、`last_verified` を一元管理する。
- `affiliate_url` が未設定の商品は必ず `publishable: false` とする。アフィリエイトURL設定済みかつ出典確認済みの場合だけ `true` にできる。
- Productionでは `publishable: true` の商品のみ表示する。
- 価格、評価、在庫、仕様は公開前と定期メンテナンス時に再確認する。変更時はルートの `updated_at` も更新する。
- 商品を削除せず、掲載を止める場合は `publishable: false` にして記事から除外する。

記事側では表示順を `data/articles.json` の `productIds` で管理します。Product Libraryの配列順には依存しません。

初期6商品は第一号記事専用の候補です。将来30商品以上へ増やす際も、商品IDを不変にし、記事ごとの参照配列で採用範囲を分離します。

詳細な登録・採点・公開判定・Selection Roleの運用は `docs/Product-Library.md` を参照してください。変更後は次を実行します。

```sh
node scripts/validate-products.mjs
```

## PreviewとProduction

- **Production**: 通常の記事URLを使用する。`publishable: true` かつ有効な `affiliate_url` と確認済みの出典を持つ商品だけをカード表示する。Phase 4では初期6商品の楽天アフィリエイトURLと出典を確認済みで、6件すべてを表示する。
- **Preview**: 記事URLに `?preview=1` を付ける。非公開商品も確認でき、リンク先は `affiliate_url`、Source Registryの `rakuten_url`、`official_url` の順でフォールバックする。編集・リンク確認専用であり、公開URLとして案内しない。

ローカルでは通常URLと `http://localhost:8000/articles/sofa-for-couples/?preview=1` の両方で6商品のカードを確認できます。商品情報の更新後は、楽天アフィリエイトURLの遷移先と出典を再確認し、Validationを再実行してください。

公開URL: <https://futari-kurashi.vercel.app>
