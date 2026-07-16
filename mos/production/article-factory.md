# Article Factory

Article Briefを編集上の正本、Product Libraryを商品事実の正本として、共通テンプレートからPreview記事を生成する。

1. `data/article-briefs/`へBriefを作る。
2. 楽天の現行商品ページを確認し、候補をProduct Libraryのdraft catalogへ登録する。
3. `npm run article:validate`で参照と状態を検証する。
4. `npm run article:build`でPreview、Source Registry、Affiliate Queue、Review Indexを更新する。
5. `npm run article:report`でPublication Gateのブロッカーを確認する。

生成物をProductionへ出す判断は自動化しない。Affiliate URL、可変商品情報、広告表記、目視レビュー、編集承認が揃った記事だけを公開する。
