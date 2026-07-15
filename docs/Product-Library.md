# MARGIN Product Library

Product Libraryは、商品情報・編集評価・出典・公開状態を一元管理するための正本です。記事には商品データを複製せず、`data/articles.json` の `productIds` から参照します。

## Product登録手順

1. 商品が `Living`、`Dining`、`Lighting`、`Storage`、`Kitchen`、`Home Appliance`、`Bedroom` のどれに属するか決める。
2. 変更しないkebab-caseの `id` を作り、`data/products.json` の `products` に登録する。
3. 同じIDを `categories` の該当配列へ追加する。
4. 公式情報と楽天市場の商品ページを確認し、`source_registry` に出典を登録して `source_id` で商品と結ぶ。
5. 価格、評価、寸法、素材、送料、長所、短所、要約を記録する。
6. 6項目のProduct Scoreをレビューし、算術平均を100点換算した値を `TotalScore` に入れる。
7. Selection Roleを設定し、記事の `productIds` に商品IDを追加する。
8. `node scripts/validate-products.mjs` を実行してからPreviewでカードを確認する。

## レビュー方法

Product Scoreの各項目は0〜10の整数で採点します。`TotalScore` は6項目の算術平均×10で、小数第1位に丸めます。点数はランキング順位ではなく、採用判断の一要素です。

- `EditorialFit`: MARGINの読者と記事テーマへの適合度
- `Design`: 小さな住空間へのなじみやすさと造形
- `Function`: 寸法、手入れ、可変性など実用面
- `Price`: 仕様と価格の納得感。安さだけでは評価しない
- `Longevity`: 構造、素材、保証、補修性など長期使用の見込み
- `ReviewQuality`: 件数、新しさ、具体性、評価の偏りを含むレビューの信頼度

レビュー担当者は公式・メーカー情報を優先し、価格・送料・評価は楽天市場の現行ページと照合します。確認日時はSource Registryの `last_verified` にISO 8601形式で残します。

## publishable判定

`scripts/validate-products.mjs` が次の条件をコードとして検証します。

- `affiliate_url` が有効なHTTPS URLである
- `source_id` が完全なSource Registryを参照している
- `official_url` と `rakuten_url` がHTTPSである
- 出典確認が30日以内である
- 価格と送料が確認済みである
- pros、cons、summaryが揃っている
- Product Scoreが正しく、`TotalScore` が60点以上である

全条件を満たす場合だけ `publishable: true` にします。条件を満たす商品を `false` のままにすることも、条件不足の商品を `true` にすることも検証エラーです。アフィリエイトURL未設定の商品はPreviewのみ表示でき、Productionには出ません。

## Selection Role運用

Selection Roleは「誰の、どの場面に合うか」を短く示す編集ラベルです。順位や受賞表現ではありません。

- 同じ記事内では役割を重複させない。
- 商品名やカテゴリではなく、読者が得る価値を表す。
- 採用理由をsummary、pros、consで説明できる役割だけを付ける。
- 商品を差し替える場合も、先に記事が必要とする役割を確認する。
- 複数記事で同じ商品を参照する場合、記事ごとの役割が異なるなら将来の記事参照データ側へ役割を移すことを検討する。

## Product Card

`components/product-card.js` の `<margin-product-list>` が、記事ID、記事の商品ID配列、Product Library、Source Registryからカードを生成します。商品名、価格、スコア、説明、長所、短所、リンクをHTMLへ直接重複記載しません。商品データ更新後はJSONだけでカードへ反映されます。
