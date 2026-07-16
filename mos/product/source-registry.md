# Source Registry

Source Registryは `source_id`、`official_url`、`rakuten_url`、`manufacturer`、`last_verified`、`source_type` を一元管理します。

- 公式・メーカー・正規販売店を優先する。
- 商品ページと画像、affiliate URLの遷移先を一致させる。
- 価格、在庫、送料、仕様を公開直前に再確認する。
- `last_verified` はISO 8601で更新し、古い出典を公開判定へ通さない。
- URLや名称の変更理由をコミットへ残す。

参照元: `docs/Product-Library.md`、`data/products.json`。最終レビュー: 2026-07-16。
