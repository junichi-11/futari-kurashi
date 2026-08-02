# futari-kurashi

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

## ChatGPT Plus editorial workflow

The Article Builder can create a self-contained prompt and import the JSON
returned by ChatGPT Plus without using an API key or making an external request.

1. Search for products in Product Manager.
2. Add useful products to candidates.
3. Select the products to use in an article.
4. Enter the article brief in Article Builder.
5. Generate and copy the ChatGPT prompt.
6. Paste the prompt into ChatGPT Plus.
7. Paste the returned JSON into Article Builder.
8. Review the Quality Gate and approve the import.
9. Save the article draft.
10. Export the finished HTML.

Prompt text, the latest five prompt-history entries, imported article data, and
Quality Gate status are stored with the article draft in localStorage. The
importer removes Markdown code fences, rejects unselected products and unsafe
URLs, strips dangerous embedded tags, and never overwrites the current draft
before explicit approval.

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

Never place the GitHub token or publish secret in HTML, source control,
localStorage, API responses, or logs. Verify product prices, stock, shipping,
and delivery information immediately before publishing. The operator remains
responsible for the published content after automated publication. Search
Console index submission is not implemented in v1.
