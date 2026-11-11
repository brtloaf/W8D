// Run: node test/pricing.test.js   (no installs needed)
// Tests pricing + the checkout functions against a fake PayPal API.
import assert from "node:assert/strict";
import { TAX, SHIPPING } from "../public/catalog.js";
import { buildLines, quote, paypalItems, itemsFromSkus, CartError } from "../lib/pricing.js";
import { onRequestPost as create } from "../functions/api/orders/index.js";
import { onRequestPost as ship } from "../functions/api/orders/[id]/shipping.js";
import { onRequestPost as capture } from "../functions/api/orders/[id]/capture.js";

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok -", name); };

// Use known settings for the test regardless of what's in catalog.js
Object.assign(SHIPPING, { countries: ["US"], freeOver: 200 });
for (const k of Object.keys(TAX)) delete TAX[k];
Object.assign(TAX, { TX: { rate: 0.0825, shipping: true }, MN: { rate: 0.06875, shipping: true, clothingExempt: true } });

const hoodie = { id: "weighted-sweatshirt", options: { Size: "L" }, qty: 1 };

await t("rejects bad carts", () => {
  assert.throws(() => buildLines([]), CartError);
  assert.throws(() => buildLines([{ id: "nope", qty: 1 }]), CartError);
  assert.throws(() => buildLines([{ ...hoodie, options: {} }]), CartError);
  assert.throws(() => buildLines([{ ...hoodie, options: { Size: "XS" } }]), CartError);
  assert.throws(() => buildLines([{ ...hoodie, qty: 0 }]), CartError);
  assert.throws(() => buildLines([{ ...hoodie, qty: 1.5 }]), CartError);
  assert.throws(() => buildLines([{ id: "weighted-beanie", options: {}, qty: 1 }]), CartError); // sold out
});
await t("ignores price sent by browser", () => {
  const l = buildLines([{ ...hoodie, price: 1 }]);
  assert.equal(quote(l, null).breakdown.item_total.value, "500.00");
});
await t("free shipping over threshold, no tax before address", () => {
  const q = quote(buildLines([hoodie]), null);
  assert.deepEqual([q.breakdown.shipping.value, q.breakdown.tax_total.value, q.value], ["0.00", "0.00", "500.00"]);
});
await t("TX tax on items", () => {
  const q = quote(buildLines([{ ...hoodie, qty: 2 }]), { countryCode: "US", state: "TX" });
  assert.equal(q.breakdown.tax_total.value, "82.50");
  assert.equal(q.value, "1082.50");
});
await t("MN clothing exempt", () => {
  const q = quote(buildLines([hoodie]), { countryCode: "US", state: "MN" });
  assert.equal(q.breakdown.tax_total.value, "0.00");
});
await t("untaxed state", () => {
  assert.equal(quote(buildLines([hoodie]), { countryCode: "US", state: "OR" }).breakdown.tax_total.value, "0.00");
});
await t("non-shipping country rejected", () => {
  assert.throws(() => quote(buildLines([hoodie]), { countryCode: "CA", state: "ON" }), CartError);
});
await t("one Large Flat Rate Box per sweatshirt, shipping taxed in TX", () => {
  SHIPPING.freeOver = null;
  const q = quote(buildLines([{ ...hoodie, qty: 3 }]), { countryCode: "US", state: "TX" });
  assert.equal(q.breakdown.shipping.value, "88.53"); // 3 × 29.51
  assert.equal(q.breakdown.tax_total.value, ((1500 + 88.53) * 0.0825).toFixed(2));
  const sum = (+q.breakdown.item_total.value + +q.breakdown.shipping.value + +q.breakdown.tax_total.value).toFixed(2);
  assert.equal(q.value, sum);
});
await t("MN: sweatshirt + shipping tax-free", () => {
  const q = quote(buildLines([hoodie]), { countryCode: "US", state: "MN" });
  assert.deepEqual([q.breakdown.shipping.value, q.breakdown.tax_total.value, q.value], ["29.51", "0.00", "529.51"]);
  SHIPPING.freeOver = 200;
});
await t("sku round-trip", () => {
  const items = paypalItems(buildLines([hoodie]));
  assert.equal(items[0].name, "Weighted Sweatshirt – L");
  assert.deepEqual(itemsFromSkus(items), [{ id: "weighted-sweatshirt", qty: 1, options: { Size: "L" } }]);
});

// ---------- Fake PayPal ----------
const orders = {};
let n = 0;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const res = (s, d) => new Response(d === undefined ? null : JSON.stringify(d), { status: s });
  if (u.pathname === "/v1/oauth2/token") return res(200, { access_token: "tok" });
  const body = init.body ? JSON.parse(init.body) : null;
  let m;
  if (u.pathname === "/v2/checkout/orders" && init.method === "POST") {
    const id = "ORDER" + ++n;
    orders[id] = { id, status: "CREATED", purchase_units: body.purchase_units };
    return res(201, orders[id]);
  }
  if ((m = u.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)$/))) {
    const o = orders[m[1]]; if (!o) return res(404, { name: "RESOURCE_NOT_FOUND" });
    if (init.method === "GET") return res(200, o);
    if (init.method === "PATCH") { o.purchase_units[0].amount = body[0].value; return res(204); }
  }
  if ((m = u.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/))) {
    const o = orders[m[1]];
    if (o.decline) return res(422, { details: [{ issue: "INSTRUMENT_DECLINED" }] });
    o.status = "COMPLETED"; o.captured = o.purchase_units[0].amount.value;
    return res(201, { id: o.id, status: "COMPLETED" });
  }
  return res(500, {});
};
const env = { PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "s", PAYPAL_ENV: "sandbox" };
const req = (b) => ({ json: async () => b });
const call = async (fn, ctx) => { const r = await fn({ env, ...ctx }); return [r.status, await r.json()]; };

await t("full checkout flow with tax", async () => {
  const [s1, c] = await call(create, { request: req({ items: [{ ...hoodie, qty: 2 }] }) });
  assert.equal(s1, 200);
  const [s2] = await call(ship, { request: req({ address: { countryCode: "US", state: "TX" } }), params: { id: c.id } });
  assert.equal(s2, 200);
  orders[c.id].purchase_units[0].shipping = { address: { country_code: "US", admin_area_1: "TX" } };
  const [s3, d] = await call(capture, { params: { id: c.id }, request: req({}) });
  assert.equal(s3, 200); assert.equal(d.status, "COMPLETED");
  assert.equal(orders[c.id].captured, "1082.50");
});
await t("capture fixes tax if buyer spoofed a no-tax state", async () => {
  const [, c] = await call(create, { request: req({ items: [hoodie] }) });
  await call(ship, { request: req({ address: { countryCode: "US", state: "OR" } }), params: { id: c.id } });
  orders[c.id].purchase_units[0].shipping = { address: { country_code: "US", admin_area_1: "TX" } };
  await call(capture, { params: { id: c.id }, request: req({}) });
  assert.equal(orders[c.id].captured, "541.25");
});
await t("shipping endpoint rejects Canada", async () => {
  const [, c] = await call(create, { request: req({ items: [hoodie] }) });
  const [s, d] = await call(ship, { request: req({ address: { countryCode: "CA", state: "ON" } }), params: { id: c.id } });
  assert.equal(s, 400); assert.equal(d.code, "COUNTRY");
});
await t("create rejects sold-out / empty cart with 400", async () => {
  assert.equal((await call(create, { request: req({ items: [] }) }))[0], 400);
  assert.equal((await call(create, { request: req({ items: [{ id: "weighted-beanie", options: {}, qty: 1 }] }) }))[0], 400);
});
await t("declined card asks buyer to retry", async () => {
  const [, c] = await call(create, { request: req({ items: [hoodie] }) });
  orders[c.id].decline = true;
  orders[c.id].purchase_units[0].shipping = { address: { country_code: "US", admin_area_1: "OR" } };
  const [s, d] = await call(capture, { params: { id: c.id }, request: req({}) });
  assert.equal(s, 402); assert.equal(d.restart, true);
});
await t("missing keys → 500 with friendly message", async () => {
  const r = await create({ env: {}, request: req({ items: [hoodie] }) });
  assert.equal(r.status, 500);
});

console.log(`\n${pass} tests passed`);
