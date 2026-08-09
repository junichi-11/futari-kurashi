# futari-kurashi

## MARGIN Article Discovery & Navigation v1

公開記事の導線は `articles/index.json` を単一の一覧データとして利用します。トップページの JOURNAL は公開日の新しい順に最大3件、`/articles/` は公開済み記事をすべて表示します。記事詳細は同じデータから編集テーマ・キーワード・記事タイプ・読者・部屋条件を照合し、関連記事を最大3件表示します。

Publish Systemで新しい記事を公開すると、記事HTML・記事JSONと同じ原子的コミットで `articles/index.json`、`articles/index.html`、`sitemap.xml`、`feed.xml` が更新されます。トップページは `articles/index.json` を読み込むため、記事情報を手作業で追記する必要はありません。読み込みに失敗してもトップページ本体と `/articles/` への通常リンクは維持されます。

## MARGIN Article Generation Prompt v3

Article BuilderのChatGPT連携はPrompt Version 3.1を標準とします。ChatGPTへJSON本文を返させず、JSON構文検証済みの `{slug}.json`（UTF-8）を生成・添付させます。記事データの `version` は引き続き `1.0` とし、既存のJSON Import、Quality Gate、Publish Systemとの互換性を維持します。

Prompt Version 3.1では、固定の `article.json` を廃止し、記事slugと同じ
`{slug}.json` を標準ファイル名とします。slugが空の場合はArticle Builderが
候補を用意し、ChatGPTにも記事内容から有効なslugを確定するよう指示します。
Import前にはファイル名・JSON内slug・現在編集中のslugを比較し、選択商品、
`productBlocks`、`comparisonTable.rows` のitemCode・role・affiliateUrlを3者で
完全照合します。検証と利用者の承認が終わるまで編集中データは変更しません。

文章品質のルールはPrompt Version 2.0を継承します。リードは180〜280文字、H2本文は120〜300文字、商品summaryは90〜180文字、editorCommentは80〜160文字、FAQ回答は100〜220文字、結論は220〜380文字を目安にします。詩的表現はタイトル、リード、編集コメント、結論に限定し、比較・確認事項・FAQは簡潔な実用文とします。

商品見出しは楽天の商品名全文を転載せず、「ブランドまたはショップ＋シリーズ・識別名＋商品種別」へ短縮します。元の商品名は選択商品データに保持します。比較表の特徴と向いている暮らしは30文字以内を目安にし、affiliateUrlは専用フィールドへ保持して表示用セルや本文には入れません。

APIにない寸法、素材、保証、耐久性、座り心地は推測せず、確認対象を具体的にしたうえで「商品ページで確認」と記載します。`itemCode`、`role`、`affiliateUrl` は選択商品データから変更しません。v1・v2の下書きと履歴は引き続き読み込み可能で、履歴上は各Prompt Versionを区別して表示します。将来OpenAI APIによる自動生成へ切り替える場合も、Prompt Version 3.1と同じSchema・文章品質・誠実性ルールを使用してください。

## MARGIN Article Template v3

楽天の商品画像は、楽天画像ホストがサイズ指定に対応する場合に高解像度URLを生成し、商品セクションでは480px・800px、比較カードでは160px・320px・480pxの `srcset` を出力します。楽天画像ホストで確認できた800pxの上限を超える架空のwidth descriptorは指定しません。ブラウザが表示幅と端末解像度に合う画像を選択するため、Retina表示と転送量を両立します。

商品画像と比較画像は4:3へ統一し、`object-fit: contain` で商品全体を見切れにくく表示します。`width`・`height`・`aspect-ratio`で表示領域を予約し、CLSを抑えます。`loading="lazy"` と `decoding="async"` は維持します。既存のarticle.json Schema、Article Builder、Publish Systemとの互換性は変更しません。

## Rakuten Ichiba Item Search API

The Rakuten API runs in a Vercel Serverless Function. The public
`/api/rakuten/search` route is proxied from Cloudflare Pages to Vercel.
The MARGIN HTML and visual design do not depend on this API implementation.

```text
Browser
  -> Cloudflare Pages: /api/rakuten/search?q=sofa
  -> Vercel Function:  /api/rakuten/search?q=sofa
  -> Rakuten Ichiba Item Search API
```

### Vercel Environment Variables

Add these three variables to the Production environment of the Vercel project:

- `RAKUTEN_APPLICATION_ID`
- `RAKUTEN_ACCESS_KEY`
- `RAKUTEN_AFFILIATE_ID`

Optionally set `RAKUTEN_HTTP_REFERER` to an HTTPS URL registered in Rakuten
Developers Allowed websites. It defaults to `https://futari-kurashi.pages.dev/`.

### Cloudflare Pages Variables

Add the public Vercel project origin to the Cloudflare Pages Production
environment:

- `RAKUTEN_VERCEL_ORIGIN` (example: `https://futari-kurashi.vercel.app`)

Specify the HTTPS origin only, without `/api/rakuten/search`, and redeploy
Cloudflare Pages after saving it. Once the migration has been verified, the
three Rakuten API credentials can be removed from Cloudflare.

### Verification URLs

- Cloudflare proxy: `/api/rakuten/search?q=ソファ`
- Direct Vercel diagnostic: `https://<vercel-project>.vercel.app/api/rakuten/search?q=ソファ`

Use the Cloudflare URL for normal traffic. The direct Vercel URL is intended
only for diagnostics.

Never commit `RAKUTEN_ACCESS_KEY` or any other credential to source code,
README files, or `.env` files. Store all credentials in Vercel Environment
Variables.

## MARGIN AI Research Engine

The Article Builder uses the admin-only `POST /api/ai/research` endpoint to
propose search intent, editorial direction, titles, article structure, and
Rakuten search queries. Template generation remains available when AI research
is unavailable. AI research results are planning assistance and are saved only
in the browser's localStorage with the article draft.

### Vercel Environment Variables

In **Vercel -> futari-kurashi -> Settings -> Environment Variables**, add the
following to the **Production** environment, then redeploy:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional; the function uses a cost-conscious default)

Do not save the API key in GitHub, HTML, client-side JavaScript, logs, or API
responses. This endpoint is intended for the MARGIN administration screen;
full administrator authentication is not included in v1. The endpoint accepts
POST only, applies input limits and basic per-instance rate limiting, and sends
`Cache-Control: no-store`.

AI does not have verified search-volume, ranking, competitor-count, or keyword
difficulty data. A human editor must review all output before publication.
Product dimensions, materials, shipping, stock, and other specifications must
be verified on the relevant Rakuten product page.

### AI Editorial Planner

After selecting products in Product Manager, open Article Builder and choose
**AI企画を5案つくる**. The planner evaluates the selected product names, shops,
prices, review counts and averages, editorial roles, descriptions, and inferred
category. It returns five distinct editorial directions with titles, SEO
metadata, keywords, audience, room type, editorial themes, article type, slug,
and an editor-facing planning note.

Selecting a plan fills the existing Article Builder fields in one action. The
planner first attempts to use the existing `/api/ai/research` service. When the
OpenAI service or environment variable is unavailable, it automatically uses
the local `ruleBasedEditorialPlans(input)` generator, so product selection and
article creation can continue without an API key. The provider-facing request
and rule-based generator are kept separate to allow a future AI implementation
to replace the provider without changing the Article Builder data structure.

Article theme and display title may be empty when planning starts. Product
selection alone generates five plans. Each plan separates `planningTheme`
(editor-facing concept) from `displayTitle` (public H1), and includes SEO title,
meta description, slug, keywords, audience, room type, editorial themes,
article type, and rationale. Applying a plan writes `planningTheme` to the
existing theme field and stores both `theme` and `planningTheme` in new drafts.
Older drafts that only contain `theme` remain compatible. If editable text
fields already contain values, Article Builder asks before overwriting them.

Planner suggestions are starting points, not verified product claims. Review
product facts and editorial suitability before generating or publishing an
article.

## MARGIN Product Manager v2

楽天検索は1ページ最大30件を取得し、「さらに読み込む」で楽天APIの次ページを最大100ページまで追加できます。並び順は楽天順位、レビュー件数、レビュー評価、価格の昇順・降順、新着に対応します。価格帯、ショップ、レビュー4.0以上、レビュー100件以上、在庫ありの条件は取得済み商品へ即時適用されます。

検索ワード、並び順、フィルターはブラウザのlocalStorageへ保存します。取得済みページも検索語・並び順・ページ単位で30分間キャッシュし、同じ検索で楽天APIを再呼び出さないようにします。キャッシュは新しい50ページ分を保持します。候補商品の保存形式 `margin.productCandidates.v1` は変更していないため、既存Article Builderとの互換性を維持します。

## ChatGPT Plus editorial workflow

The Article Builder can create a self-contained prompt and import the JSON
returned by ChatGPT Plus without using an API key or making an external request.

1. Search for products in Product Manager.
2. Add useful products to candidates.
3. Select the products to use in an article.
4. Enter the article brief in Article Builder.
5. Generate and copy the ChatGPT prompt.
6. Paste the prompt into ChatGPT Plus.
7. Save the returned JSON as a UTF-8 `.json` file and load it in Article Builder.
8. Review the Quality Gate and approve the import.
9. Save the article draft.
10. Export the finished HTML.

Prompt text, the latest five prompt-history entries, imported article data, and
Quality Gate status are stored with the article draft in localStorage. The
importer removes Markdown code fences, rejects unselected products and unsafe
URLs, strips dangerous embedded tags, and never overwrites the current draft
before explicit approval.

### Recommended JSON import flow

Article BuilderでPrompt Version 3.1を生成 → ChatGPTで `{slug}.json`（UTF-8）を生成・添付 → 添付ファイルを保存 → Article
Builderの「JSONファイルを選択」から読み込み → Quality Gateを確認 →
「承認して反映」の順で運用します。ファイルは最大2MBで、HTMLやMarkdown、
ブラウザのリンク変換を通さず生テキストとして読み込みます。従来の貼り付けも
利用できますが、`https://`を含む長い楽天リンクがMarkdownリンクへ変換される
可能性があるため、JSONファイル経由を推奨します。

Importerは `](https://`、URLエンコードされたJSONキー、300文字以上の商品見出し、
200文字以上のメインキーワードを検出すると、コピー時のリンク変換による破損として
Quality Gateを停止します。読み込み後はファイル名、文字数、`JSON.parse`結果を画面で
確認してください。

For a future API-based workflow, replace the manual ChatGPT copy/import step
with a server call that returns the same version `1.0` JSON schema. The existing
Prompt Builder, importer, Quality Gate, template generator, and AI Research
Engine can remain as fallbacks.

## MARGIN Publish System v1

Article Builder can publish a reviewed article through `POST /api/publish/article`.
The Cloudflare Pages Function proxies the request to Vercel, where the article
HTML, article JSON, article index, sitemap, and RSS feed are committed through
the GitHub Git Data API as one atomic commit. Cloudflare Pages then deploys the
new commit through its existing Git integration.

Cloudflare and Vercel return `application/json` for success and error responses.
The publish dialog records HTTP status, response headers, and the raw response
body under **Publish Response Debug**. If an upstream service unexpectedly
returns plain text, the builder displays that text without calling `JSON.parse`.

### Vercel Environment Variables

Configure these for the Production environment and redeploy Vercel:

- `GITHUB_TOKEN`
- `GITHUB_OWNER` (recommended: `junichi-11`)
- `GITHUB_REPO` (recommended: `futari-kurashi`)
- `GITHUB_BRANCH` (recommended: `main`)
- `MARGIN_PUBLISH_SECRET`
- `PUBLIC_SITE_ORIGIN` (recommended: `https://futari-kurashi.pages.dev`)
- `PUBLISH_DEPLOY_TIMEOUT_MS` (optional; default: `120000`)

The fine-grained GitHub token must be limited to this repository with
**Contents: Read and write** and **Metadata: Read**. Do not grant unrelated
permissions.

Cloudflare Pages uses `PUBLISH_VERCEL_ORIGIN` for the Vercel origin and falls
back to the existing `RAKUTEN_VERCEL_ORIGIN` when it is not set.

### Publishing workflow

1. Create the article in Article Builder.
2. Import and review the ChatGPT JSON.
3. Confirm the Quality Gate.
4. Preview the current article content.
5. Select **公開する**.
6. Enter the publish key. It is kept only in `sessionStorage` for that tab.
7. Confirm the four publication acknowledgements.
8. Publish the six generated files in one GitHub commit.
9. Wait for the Cloudflare Pages deployment and open the published URL.

### Rebuild Published Articles

Published articles are not rendered from JSON on every request. The Publish
System stores `articles/{slug}/article.json` as the canonical article data and
writes a static `articles/{slug}/index.html` at publish time. Static delivery
keeps the public site fast and resilient, but a later template change does not
automatically alter previously published HTML.

Article Builder therefore provides **Rebuild Published Articles**. It calls
`POST /api/publish/rebuild`, reads every Published entry from
`articles/index.json`, renders its saved `article.json` with the current Article
Template, and replaces all affected article HTML files in one atomic GitHub
commit. Article JSON, article metadata, publication dates, sitemap, and feed are
not changed. If the generated HTML is already current, no duplicate commit is
created. The endpoint uses the same `MARGIN_PUBLISH_SECRET`; the key remains in
`sessionStorage` only.

New articles always use the current template when published. Run the rebuild
after a template release to apply it to past articles as well.

Never place the GitHub token or publish secret in HTML, source control,
localStorage, API responses, or logs. Verify product prices, stock, shipping,
and delivery information immediately before publishing. The operator remains
responsible for the published content after automated publication. Search
Console index submission is not implemented in v1.

## Affiliate disclosure and legal pages

Published articles that contain a Rakuten affiliate URL display an always-visible
`広告` disclosure immediately after the lead and before the table of contents.
If `article.disclosure` is missing or invalid, the renderer uses the standard
MARGIN disclosure instead; it does not duplicate a valid disclosure. Product
images, product names, and CTA links use the saved affiliate URL without
decoding, re-encoding, shortening, or removing query parameters. The CTA label
is `楽天市場で見る`.

Prices, stock, shipping, and delivery dates can change. A missing or zero price
is rendered as `楽天市場で確認`, and a product without collected review data is
rendered as `評価情報なし` rather than a zero-star score. Operators must verify
all product information on Rakuten immediately before publication.

The public footer links to `/about/`, `/privacy/`, `/contact/`,
`/affiliate-disclosure/`, and `/disclaimer/`. These pages are also included in
the generated sitemap. The same rules apply to new publications and to
**Rebuild Published Articles**, because both use the shared Article Template v3
renderer.
