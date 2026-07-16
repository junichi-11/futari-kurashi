# Product Library

`data/products.json` は商品データの正本です。商品IDを不変にし、記事は `productIds` で参照します。

## 登録と公開

1. categoryと読者向けの商品名を決める。
2. Source Registry、価格、寸法、素材、送料、レビュー、画像を登録する。
3. 選定理由、向いている暮らし、長所、気になる点、編集部コメントを記録する。
4. Selection RoleとEditorial Evaluationを設定する。
5. `scripts/validate-products.mjs` を通し、Previewで目視する。

品番や意味不明な文字列を表示名にせず「ブランド名＋理解できる一般名称」にします。正式名称と販売ページはSource Registryに保持します。

参照元: `docs/Product-Library.md`、`data/products.json`、`scripts/validate-products.mjs`。最終レビュー: 2026-07-16。
