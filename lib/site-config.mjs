export const PUBLIC_SITE_ORIGIN = "https://futari-kurashi.vercel.app";

export const LIVING_AREAS = [
  "リビング",
  "ダイニング",
  "リビング・ダイニング",
  "寝室",
  "収納",
  "水まわり",
  "玄関",
  "ワークスペース"
];

export function highResolutionRakutenImage(value, size = "960x720") {
  const source = String(value || "").trim();
  if (!source) return "";
  try {
    const url = new URL(source);
    if (url.hostname === "thumbnail.image.rakuten.co.jp") url.searchParams.set("_ex", size);
    return url.toString();
  } catch {
    return source;
  }
}

export function normalizeLivingArea(record = {}) {
  if (LIVING_AREAS.includes(record.livingArea)) return record.livingArea;
  const text = [record.displayTitle, record.seoTitle, record.metaDescription, record.mainKeyword, record.slug].join(" ");
  if (/ダイニング|食卓|チェア|ペンダント/.test(text)) return "ダイニング";
  if (/ベッド|寝室|全身鏡|姿見/.test(text)) return "寝室";
  if (/収納|ラック|キャビネット|シェルフ/.test(text)) return "収納";
  if (/ゴミ箱|洗面|ランドリー/.test(text)) return "水まわり";
  if (/デスク|仕事|ワーク/.test(text)) return "ワークスペース";
  return "リビング";
}
