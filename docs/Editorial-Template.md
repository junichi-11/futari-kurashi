# MARGIN Premium Editorial Template

第一号記事のHTMLは、MARGINの記事に共通する誌面構造を提供します。記事固有の内容は `data/articles.json`、商品固有の内容は `data/products.json` を正本とし、`components/product-card.js` が表示を生成します。

## 新しい記事を登録する

1. `data/articles.json` に一意な `id`、`slug`、`path` を追加する。
2. `title`、`subtitle`、`description`、`category`、`heroImage` を設定する。
3. Product Libraryに存在する商品を `productIds` へ掲載順に登録する。
4. 記事固有の `comparison.axes` と、各商品の場面別テキストを `comparison.values` に記録する。Product Libraryから取得する軸は `productField` を指定し、値を重複保存しない。
5. `beforeYouChoose`、`closing`、`relatedArticleIds` を設定する。
6. 記事HTMLでは `<margin-product-list>` と、comparison/footerモードの `<margin-article-extras>` に同じ `article-id` を渡す。
7. Validation、Preview、Productionの順で確認する。

## 再利用するデータ項目

- `title` / `subtitle` / `description`
- `category` / `tags`
- `heroImage.url` / `heroImage.alt`
- `productIds`
- `comparison.title` / `comparison.description` / `comparison.axes` / `comparison.values`
- `beforeYouChoose`
- `closing.eyebrow` / `closing.title` / `closing.body`
- `relatedArticleIds` / `journalPath`

ダイニングテーブル、照明、ラグ、テレビボード、ベッド、収納の記事でも同じ構造を使い、比較軸と実務メモだけをテーマに合わせて編集します。

## MARGIN Editorial Evaluation

商品側の `editorial_evaluation` は `Space`、`Together`、`Comfort`、`Care`、`Delivery`、`Longevity` の6軸です。`level` は1〜5の内部表示値、`note` は読者へ示す短い編集判断です。総合点へ合算せず、順位・星・受賞表現には使いません。

## 関連記事

`relatedArticleIds` に公開済み記事IDを入れると、タイトル、補助タイトル、カテゴリ、ヒーロー画像、記事URLから関連記事を自動生成します。0件の場合はダミーを出さず、`journalPath` への控えめな復帰リンクだけを表示します。
