# Editorial Pipeline

`data/editorial-pipeline.json`でBrief、Research、Product Selection、Affiliate Links、Build、Editorial Review、Visual Review、SEO Review、Publicationを記事単位で管理する。

標準フェーズは `brief → research → product_selection → affiliate_link_waiting → article_build → human_review → release_review → published`。

Publication GateはArticle Brief、商品参照、全Affiliate URL、publishable、Source Registry、広告表記、価格・在庫注意書き、Preview目視、編集承認、公開状態をすべて確認する。未達の記事はProductionへ出さない。公開後も更新サイクルで可変商品情報とリンク切れを点検する。
