import test from "node:test";import assert from "node:assert/strict";
import {extractAffiliateUrl,validateAffiliateUrl} from "../scripts/affiliate-url.mjs";
const official="https://item.rakuten.co.jp/example/item-a/";
const link=`https://hb.afl.rakuten.co.jp/ichiba/test/?pc=${encodeURIComponent(official)}`;
test("validates matching destination",()=>assert.equal(validateAffiliateUrl(link,official).valid,true));
test("rejects another product",()=>assert.equal(validateAffiliateUrl(link,"https://item.rakuten.co.jp/example/item-b/").message,"対象商品とリンク先商品が一致しません"));
test("extracts only href from HTML",()=>assert.equal(extractAffiliateUrl(`<a data-token="discard" href="${link.replaceAll("&","&amp;")}">item</a>`),link));
test("rejects unrelated HTML",()=>assert.equal(validateAffiliateUrl("<script>token</script>",official).valid,false));
