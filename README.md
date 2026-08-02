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
