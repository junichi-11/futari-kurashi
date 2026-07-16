# Re:CENO AGRA Product Visualization Pilot

実画像は未生成です。楽天・販売元の商品画像について、外部生成ツールへの入力、二次生成、生成物公開の権利が確認できないため、元画像を保存せずURL参照だけを記録しています。

## Production rule

`active_image_source` は `source` のまま維持します。候補画像は、人間による権利確認とIdentity Review完了後も、自動ではProductionへ切り替えません。

## Required rights confirmation

- 商品画像を画像生成サービスへ入力できるか
- 入力画像がモデル学習や品質改善へ利用されるか
- 生成物をアフィリエイト記事で公開できるか
- 商品を特定できる派生画像の商用利用が許可されるか
- Re:CENO、楽天、販売ショップの各規約に追加条件がないか

## Generation prompts

すべて共通で、元商品の外形、寸法比率、座面厚、背クッション数、肘、脚、木部、張地色・質感を厳密に維持します。35〜50mm相当、座面より少し高い視線、正面寄りの斜め構図、商品全体を画面の55〜70%に収めた4:3横位置、文字なしとします。

### A — Gallery White

白い左官壁、明るいオーク床、生成りの無地ラグ。最も白く、商品形状と奥行きが読み取れる比較記事向け。小物は置かず、朝の拡散光のみ。

### B — Quiet Morning

朝8〜10時の柔らかな自然光。生成りのラグ、黒い小さなローテーブル、黒いマグ1点、本は最大2冊。生活感は控えめで人物なし。

### C — Material Focus

商品全景を維持し、アッシュ無垢材フレームと生成りの張地の質感が読める光。寄りすぎず、植物は最大1点、背景をぼかしすぎない。

## Output requirements after approval

- `margin-visualization-a.webp` / `b.webp` / `c.webp`
- 4:3、十分な解像度、過剰圧縮なし
- EXIFと不要metadataを除去
- 使用ツール、モデル、日時、入力素材、権利根拠を記録
- `identity-review.json` の全項目を判定し、FAILが1件でもあれば不採用

## Rollback

生成物を削除するか `active_image_source: source` に戻すだけで、Product Libraryの `source_image_url` へ即時復帰できます。
