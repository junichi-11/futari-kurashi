# Affiliate Rule

- `affiliate_url` 未設定の商品は `publishable: false`。
- affiliate URL、Source Registry、価格、送料、編集情報がValidationを満たす場合だけ公開可能。
- Productionは `publishable: true` のみ表示し、Previewは出典URLへのフォールバックを許可する。
- 外部リンクは `target="_blank"` と `rel="nofollow sponsored noopener"` を維持する。
- 広告表記と価格・在庫・送料の変動注意書きをリンク付近に置く。
- 報酬額でSelection Roleや掲載判断を変えない。

参照元: `README.md`、`docs/Product-Library.md`、`scripts/validate-products.mjs`。最終レビュー: 2026-07-16。
