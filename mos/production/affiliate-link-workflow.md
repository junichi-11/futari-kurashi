# Affiliate Link Workflow

楽天アフィリエイトURLは人間が楽天アフィリエイト管理画面で発行する。文字列の推測、商品URLからの機械生成、別商品のリンク流用を禁止する。

1. `docs/Affiliate-Link-Queue.md`から公式楽天URLを開く。
2. 商品名、ショップ、仕様がProduct Libraryと一致することを確認する。
3. 商品リンクを発行し、対応するproduct IDへ登録する。
4. Source Registryと可変情報を更新する。
5. Product ValidationとArticle Validationを実行する。
6. 全商品が条件を満たすまで`publishable: false`を維持する。

Previewは公式楽天URLへフォールバックできる。Productionは有効なaffiliate URLを持つpublishable商品だけを表示する。
