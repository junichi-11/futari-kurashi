# Product Visualization Guideline

## Product Identity Preservation

編集ビジュアルは撮影環境の再構成であり、商品デザインの再解釈ではありません。外形、寸法比率、クッション、肘、脚、フレーム、張地、木部、商品固有ディテールを維持します。同一性を確認できない画像は公開しません。

## Permitted Adjustments

- 背景、床、壁、自然光、カメラ位置
- MARGIN Photography Directionに沿う最小限の小物
- 商品を切らない範囲での4:3構図
- 色を変えない露出・ホワイトバランス調整
- 過剰圧縮を避けたWebP最適化とmetadata除去

## Prohibited Adjustments

商品の形、寸法比率、クッション数、肘、脚、木部、張地色・素材感、付属品を変更しません。高級化、欠点の隠蔽、存在しないロゴ・品番・オットマン追加、過度な広角や遠近感を禁止します。

## Photography Direction

朝8〜10時の柔らかな拡散光、白い左官壁、明るいオーク床、生成りの無地ラグ、必要に応じて黒い小さなローテーブルを使用します。高級ホテル、分譲マンション広告、夜景、ドラマチックな光を避けます。

## Composition

35〜50mm相当、座面より少し高い目線、正面寄りの斜め角度、商品全体を画面の55〜70%に収めます。4:3横位置、十分な余白、文字なしを基本とします。

## Color

White、Charcoal、Natural wood、Ecruを中心とし、Beigeは小さなアクセントに限定します。商品固有色を変更しません。

## Props

黒いマグ1点、本は最大2冊、植物は最大1点。商品理解を妨げる小物、金色、大理石、シャンデリア、大量のクッションを置きません。

## Human Presence

人物は原則として使用しません。必要性が生じた場合は顔を主役にせず、商品同一性と権利を別途審査します。

## Source Rights

販売元・楽天の商品画像を権利確認なしに保存、生成入力、再配布しません。入力利用、学習利用、派生物の商用公開、販売元規約を確認し、根拠を記録します。確認できなければプロンプトと構造の準備で停止します。

## AI Generation Disclosure

生成画像付近に「MARGIN編集イメージ」「商品形状・色・仕様は販売ページでご確認ください。」を表示します。使用ツール、モデル、生成日、入力素材、権利確認を内部記録します。

## Identity Review

全体シルエット、クッション、肘、脚、木部、張地、寸法比率、固有ディテールを `MATCH` / `MINOR DIFFERENCE` / `FAIL` で判定します。1項目でもFAILなら不採用です。

## Human Approval

Codexや生成ツールは候補を自動採用しません。PreviewでOriginal referenceと最大3案を比較し、人間が権利・同一性・採用案を承認します。

## Production Publication Rule

`active_image_source` は承認前まで `source` とします。Productionで編集ビジュアルを使えるのは、権利確認済み、Identity Review合格、人間承認済み、開示表示実装済みの場合だけです。

## Removal / Rollback Rule

`editorial_visualization_url` を削除するか `active_image_source: source` へ戻すと、既存の `source_image_url` へ即時復帰できる構造を維持します。元画像URLを上書きしません。
