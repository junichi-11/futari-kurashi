import { renderArticlePageV3 } from "./article-template-v2.mjs";
import { highResolutionRakutenImage, normalizeLivingArea } from "./site-config.mjs";

const text = value => String(value ?? "").trim();
const esc = value => text(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const xml = esc;
const formatDate = value => text(value).slice(0, 10);
export const renderArticlePage = renderArticlePageV3;

export function renderArticlesIndexPage(origin) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JOURNAL｜MARGINの記事一覧</title><meta name="description" content="新婚・同棲・ふたり暮らしの家具を、使う場所と過ごし方から選ぶMARGINの記事一覧。"><link rel="canonical" href="${origin}/articles/"><meta property="og:url" content="${origin}/articles/"><link rel="stylesheet" href="/assets/discovery.css"></head><body><header class="site-head"><nav class="site-nav wrap" aria-label="サイトナビゲーション"><a class="brand" href="/">MARGIN</a><span>JOURNAL</span></nav></header><main><section class="hero"><div class="wrap"><p class="eyebrow">MARGIN Journal</p><h1>使う場所から、家具を選ぶ。</h1><p>リビング、ダイニング、寝室。ふたりが過ごす場所と用途から、家具選びの判断材料をまとめています。</p></div></section><section class="section"><div class="wrap"><nav id="filters" class="filter-list" aria-label="生活エリアで記事を絞り込む"></nav><div id="articles" class="article-grid" aria-live="polite"><p class="status">記事を読み込んでいます。</p></div></div></section></main><footer class="site-footer"><div class="wrap"><nav class="footer-links" aria-label="フッターナビゲーション"><a href="/">MARGINトップ</a><a href="/about/">運営者情報</a><a href="/privacy/">プライバシーポリシー</a><a href="/contact/">お問い合わせ</a><a href="/affiliate-disclosure/">アフィリエイト広告について</a><a href="/disclaimer/">免責事項</a></nav></div></footer><script src="/assets/article-cards.js"></script><script>fetch('/articles/index.json').then(r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{const params=new URLSearchParams(location.search),area=params.get('area'),legacy=params.get('room'),theme=params.get('theme'),all=(data.articles||[]).filter(a=>a.status==='Published').sort((a,b)=>Date.parse(b.updatedAt||b.publishedAt)-Date.parse(a.updatedAt||a.publishedAt)),shown=all.filter(a=>(!area||a.livingArea===area)&&(!legacy||a.livingArea===legacy)&&(!theme||(a.productCategory===theme||(a.editorialThemes||[]).includes(theme)||String(a.mainKeyword||'').includes(theme))));MarginArticleCards.render(document.querySelector('#articles'),shown);const areas=[...new Set(all.map(a=>a.livingArea).filter(Boolean))];document.querySelector('#filters').innerHTML='<a href="/articles/">すべて</a>'+areas.map(value=>'<a href="/articles/?area='+encodeURIComponent(value)+'">'+value+'</a>').join('');if(!shown.length)document.querySelector('#articles').innerHTML='<p class="status">条件に合う記事はまだありません。</p>'}).catch(()=>document.querySelector('#articles').innerHTML='<p class="status">記事一覧を読み込めませんでした。</p>')</script></body></html>`;
}

export function normalizeArticleIndex(index) {
  return {
    ...index,
    articles: (index.articles || []).map(article => ({
      ...article,
      livingArea: normalizeLivingArea(article),
      thumbnail: highResolutionRakutenImage(article.thumbnail),
      roomType: undefined
    }))
  };
}

export function renderSitemapXml(index, origin) {
  const fixed = ["about", "privacy", "contact", "affiliate-disclosure", "disclaimer"].map(path => ({ url: `${origin}/${path}/`, lastmod: index.updatedAt }));
  const entries = [{ url: `${origin}/`, lastmod: index.updatedAt }, { url: `${origin}/articles/`, lastmod: index.updatedAt }, ...fixed, ...(index.articles || []).map(article => ({ url: `${origin}${article.url}`, lastmod: article.updatedAt }))];
  const unique = [...new Map(entries.map(entry => [entry.url, entry])).values()];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map(entry => `  <url><loc>${xml(entry.url)}</loc><lastmod>${xml(formatDate(entry.lastmod))}</lastmod></url>`).join("\n")}\n</urlset>\n`;
}

export function renderFeedXml(index, origin) {
  const articles = [...(index.articles || [])].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 20);
  const items = articles.map(article => `<item><title>${xml(article.displayTitle)}</title><link>${xml(`${origin}${article.url}`)}</link><guid isPermaLink="true">${xml(`${origin}${article.url}`)}</guid><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><description>${xml(article.metaDescription)}</description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>MARGIN Journal</title><link>${xml(`${origin}/articles/`)}</link><description>ふたり暮らしの家具とインテリアを、使う場所から選ぶ</description><language>ja</language><lastBuildDate>${new Date(index.updatedAt).toUTCString()}</lastBuildDate>${items}</channel></rss>\n`;
}
