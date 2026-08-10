const json = (response, status, body) => {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.json(body);
};

const text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const list = (value, limit, itemLimit = 120) => Array.isArray(value) ? value.slice(0, limit).map(item => text(item, itemLimit)).filter(Boolean) : [];
const inputOf = body => ({
  theme: text(body?.theme, 200), articleType: text(body?.articleType, 80) || "比較・おすすめ記事",
  target: text(body?.target, 120) || "ふたり暮らし", roomType: text(body?.roomType, 120) || "1LDK",
  editorialThemes: list(body?.editorialThemes, 12, 40), mainKeyword: text(body?.mainKeyword, 120),
  relatedKeywords: list(body?.relatedKeywords, 20, 120), memo: text(body?.memo, 2000),
  selectedProducts: Array.isArray(body?.selectedProducts) ? body.selectedProducts.slice(0, 20) : []
});

const categoryOf = input => {
  const source = `${input.theme} ${input.mainKeyword} ${input.selectedProducts.map(item => item?.name || "").join(" ")}`;
  for (const value of ["ダイニングテーブル", "ダイニングチェア", "サイドテーブル", "テレビボード", "ペンダントライト", "フロアライト", "全身鏡", "オープンラック", "キャビネット", "ソファ", "ラグ", "照明", "デスク", "ベッド", "収納家具"]) if (source.includes(value)) return value;
  return "家具";
};

const buildResearch = input => {
  const category = categoryOf(input), keyword = input.mainKeyword || `${input.roomType} ${category}`;
  const titles = [
    `${input.roomType}で置きやすい${category}を、使い方から比べる`,
    `${category}選びで先に確認したい、サイズと使い方`,
    `${input.target}に合う${category}｜価格と特徴を比較`,
    `${category}は何で選ぶ？${input.roomType}の判断基準`,
    `長く使うために比べたい${category}の条件`
  ];
  const structure = ["先に確認しておきたいこと", "今回比べる基準", "商品ごとの違い", "注文前の確認事項"].map((heading, index) => ({id:`rule-${index + 1}`, level:2, heading, purpose:`${category}を選ぶための判断材料を整理する。`, subheadings:[]}));
  return {
    searchIntent:{primaryIntent:`${category}の違いを理解して選びたい`,secondaryIntents:["価格と特徴を比較したい","設置前の確認事項を知りたい"],readerSituation:`${input.target}が${input.roomType}に置く家具を検討している。`,readerProblems:["商品名だけでは違いが分かりにくい","未確認の仕様を整理したい"],readerQuestions:["どの条件を先に比べるか","購入前に何を確認するか"]},
    editorialDirection:{articleGoal:"読者が商品ごとの差と確認事項を把握できること。",marginPointOfView:"順位ではなく用途と条件から選択理由を示す。",tone:"簡潔で誠実",avoid:["未確認仕様の断定","過度な購入訴求","定型的な情緒表現の反復"]},
    titleSuggestions:titles.map((displayTitle,index)=>({displayTitle,seoTitle:`${keyword}｜${index ? "選び方" : "特徴を比較"} | MARGIN`,reason:"検索意図と具体的な判断材料を両立するため。"})),
    recommendedStructure:structure,
    productStrategy:{recommendedProductCount:input.selectedProducts.length || 5,selectionCriteria:["用途の違いが分かる","価格と商品情報を確認できる"],recommendedRoles:["Best Balance","Compact Living","Long-Term Choice"],excludeConditions:["商品情報を確認できない","記事テーマと用途が合わない"],rakutenSearchQueries:[keyword,`${category} ${input.roomType}`,`${category} 比較`].slice(0,5),comparisonAngles:["価格","用途","確認事項"],compositionBias:[],missingProductTypes:[],selectedProductRecommendations:input.selectedProducts.map((product,index)=>({itemCode:text(product?.itemCode,160),suggestedRole:"",suggestedOrder:index+1,comparisonAngle:"用途と価格",recommendation:"保存済み情報をもとに人が最終判断する。",shouldExclude:false}))},
    seoSupport:{mainKeyword:keyword,relatedKeywords:[...new Set([...input.relatedKeywords,`${category} 比較`,`${category} 選び方`])].slice(0,10),questionsToAnswer:["選ぶ基準は何か","注文前に何を確認するか"],internalLinkIdeas:[`${category}の選び方`,` ${input.roomType}の家具選び`.trim()],metaDescriptionDraft:`${input.target}が${input.roomType}で使う${category}を、価格、用途、確認事項から比較します。`,slugSuggestion:""},
    researchNotes:{factsToVerify:["寸法、素材、送料、在庫、納期は商品ページで確認"],claimsToAvoid:["耐久性や使い心地の断定"],missingInformation:["APIに含まれない仕様"]}
  };
};

export default function handler(request, response) {
  if (request.method !== "POST") { response.setHeader("Allow", "POST"); return json(response, 405, {error:"Method Not Allowed"}); }
  const input = inputOf(request.body);
  if (!input.theme) return json(response, 400, {error:"記事テーマを入力してください。"});
  return json(response, 200, {research:buildResearch(input), generatedAt:new Date().toISOString(), source:"MARGIN rule-based planner"});
}
