export const normalizeItemUrl = value => {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== "https:" || url.hostname !== "item.rakuten.co.jp") return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}/`;
  } catch { return null; }
};

export const extractAffiliateUrl = input => {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const href = raw.match(/href\s*=\s*(["'])(https:\/\/hb\.afl\.rakuten\.co\.jp\/[^"']+)\1/i);
  if (/[<>]/.test(raw) && !href) return "";
  const candidate = href ? href[2].replaceAll("&amp;", "&") : raw;
  return candidate.replace(/\s+/g, "");
};

export const validateAffiliateUrl = (input, officialUrl) => {
  const value = extractAffiliateUrl(input);
  if (!value) return { valid:false, value, code:"empty", message:"Affiliate URLを入力してください" };
  let url;
  try { url = new URL(value); } catch { return {valid:false,value:"",code:"format",message:"有効なURLではありません"}; }
  if (url.protocol !== "https:" || url.hostname !== "hb.afl.rakuten.co.jp")
    return {valid:false,value:"",code:"host",message:"楽天アフィリエイトのHTTPS URLを入力してください"};
  const destination = url.searchParams.get("pc");
  if (!destination || !normalizeItemUrl(destination))
    return {valid:false,value:"",code:"destination",message:"pcパラメータに楽天商品URLがありません"};
  if (normalizeItemUrl(destination) !== normalizeItemUrl(officialUrl))
    return {valid:false,value:"",code:"mismatch",message:"対象商品とリンク先商品が一致しません"};
  return {valid:true,value,code:"valid",message:"リンク先一致",destination:normalizeItemUrl(destination)};
};
