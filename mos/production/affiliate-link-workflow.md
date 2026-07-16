# Affiliate Link Workflow

楽天アフィリエイトURLは人間が楽天アフィリエイト管理画面で発行する。文字列の推測、商品URLからの機械生成、別商品のリンク流用を禁止する。

1. `docs/Affiliate-Link-Queue.md`から公式楽天URLを開く。
2. 商品名、ショップ、仕様がProduct Libraryと一致することを確認する。
3. 商品リンクを発行し、対応するproduct IDへ登録する。
4. Source Registryと可変情報を更新する。
5. Product ValidationとArticle Validationを実行する。
6. 全商品が条件を満たすまで`publishable: false`を維持する。

Previewは公式楽天URLへフォールバックできる。Productionは有効なaffiliate URLを持つpublishable商品だけを表示する。

## Affiliate Intake Console

`/preview/affiliate-intake/?preview=1` は40件のリンクを記事別に収集するPreview専用ツールとする。入力はブラウザのlocalStorageだけに一時保存し、GitHub、Analytics、外部APIへ自動送信しない。HTML貼り付け時は楽天Affiliateのhrefだけを抽出し、HTTPS、ホスト、`pc`の商品URL一致、重複を即時検証する。不一致は自動補正せず人間へ返す。

記事単位のPartial Exportを許可し、JSONは `npm run affiliate:validate -- <file>` と `npm run affiliate:import -- <file> --dry-run` を通す。`--apply` はHuman Approval後のみ実行する。Affiliate URL全文をログやMarkdown Queueへ出力しない。
