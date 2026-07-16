# MARGIN リリースチェックリスト

## 内容

- [ ] 編集ガイドラインに沿い、誤字・事実・単位・出典を確認した
- [ ] 広告、提供、アフィリエイトの表示が明瞭である
- [ ] 記事HTMLと `data/articles.json` のメタデータが一致している
- [ ] 公開商品のURL、仕様、在庫、画像利用条件、Source Registryの `last_verified` を確認した
- [ ] `image_url` が対応商品の楽天提供画像であり、ローカルへ保存・再配布していない
- [ ] `node scripts/validate-products.mjs` が成功した
- [ ] Productionでは `publishable: true` の商品だけが表示され、Preview（`?preview=1`）は確認用途に限定されている
- [ ] 全アフィリエイトURLの `pc` 遷移先が、対応するSource Registryの `rakuten_url` と一致している
- [ ] 商品リンクに `target="_blank"` と `rel="nofollow sponsored noopener"` が付いている

## 表示とアクセシビリティ

- [ ] デスクトップ幅とモバイル幅で崩れがない
- [ ] 見出し順、ランドマーク、代替テキスト、キーボード操作を確認した
- [ ] 外部画像の失敗時も本文を読める
- [ ] ブラウザコンソールにエラーがない

## SEOと配信

- [ ] title、description、canonical、OGP、構造化データを確認した
- [ ] 内部リンク、目次リンク、リダイレクトが正しい
- [ ] `robots.txt` と `sitemap.xml` に公開URLが反映されている
- [ ] `_headers` のセキュリティヘッダーが配信環境で適用される

## GitHub

- [ ] 対象ファイルだけがコミットされている
- [ ] `index.html` に意図しない差分がない
- [ ] ローカル表示とリンク検査が成功している
- [ ] Draft Pull Requestに変更内容と検証結果を記載した
