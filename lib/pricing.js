// Server-side pricing. Everything is recomputed from catalog.js here,
// so nothing the browser sends can change a price.
import { PRODUCTS, SHIPPING, TAX, STORE } from "../public/catalog.js";

const MAX_QTY = 20;
const MAX_LINES = 25;
const cents = (usd) => Math.round(usd * 100);
const money = (c) => ({ currency_code: STORE.currency, value: (c / 100).toFixed(2) });

export class CartError extends Error {}

// Turn [{id, options, qty}] into validated line items.
export function buildLines(items) {
  if (!Array.isArray(items) || items.length === 0) throw new CartError("Your cart is empty.");
  if (items.length > MAX_LINES) throw new CartError("Too many items in cart.");
  return items.map((it) => {
    const p = PRODUCTS.find((x) => x.id === it?.id);
    if (!p) throw new CartError("A product in your cart no longer exists.");
    if (p.soldOut) throw new CartError(`${p.name} is sold out.`);
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new CartError("Invalid quantity.");
    const opts = {};
    for (const [key, values] of Object.entries(p.options || {})) {
      const v = it.options?.[key];
      if (!values.includes(v)) throw new CartError(`Please choose a ${key.toLowerCase()} for ${p.name}.`);
      opts[key] = v;
    }
    return { product: p, options: opts, qty, unit: cents(p.price) };
  });
}

// SKU format: id|Key=Value|Key=Value  (lets us rebuild the cart from a PayPal order)
export const skuFor = (l) =>
  [l.product.id, ...Object.entries(l.options).map(([k, v]) => `${k}=${v}`)].join("|");

export function itemsFromSkus(ppItems) {
  return (ppItems || []).map((i) => {
    const [id, ...pairs] = String(i.sku || "").split("|");
    return { id, qty: Number(i.quantity), options: Object.fromEntries(pairs.map((s) => s.split("="))) };
  });
}

export function shippingFor(lines, country) {
  if (country && !SHIPPING.countries.includes(country)) return null; // not shippable
  const sub = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  if (SHIPPING.freeOver != null && sub >= cents(SHIPPING.freeOver)) return 0;
  return lines.reduce((s, l) => s + cents(l.product.shipping || 0) * l.qty, 0);
}

export function taxFor(lines, shipping, address) {
  if (!address || address.countryCode !== "US") return 0;
  const rule = TAX[String(address.state || address.adminArea1 || "").toUpperCase()];
  if (!rule) return 0;
  const taxable = lines.reduce((s, l) => {
    const exempt = rule.clothingExempt && l.product.taxCategory === "clothing";
    return s + (exempt ? 0 : l.unit * l.qty);
  }, 0);
  const base = taxable + (rule.shipping && taxable > 0 ? shipping : 0);
  return Math.round(base * rule.rate);
}

// Full PayPal amount object. address may be null (before buyer picks one).
export function quote(lines, address) {
  const country = address?.countryCode || null;
  const shipping = shippingFor(lines, country);
  if (shipping === null) throw new CartError("Sorry, we don't ship to that country yet.");
  const itemTotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const tax = taxFor(lines, shipping, address);
  return {
    currency_code: STORE.currency,
    value: ((itemTotal + shipping + tax) / 100).toFixed(2),
    breakdown: {
      item_total: money(itemTotal),
      shipping: money(shipping),
      tax_total: money(tax),
    },
  };
}

export function paypalItems(lines) {
  return lines.map((l) => ({
    name: (l.product.name + (Object.keys(l.options).length ? " – " + Object.values(l.options).join(" / ") : "")).slice(0, 127),
    sku: skuFor(l).slice(0, 127),
    unit_amount: money(l.unit),
    quantity: String(l.qty),
    category: "PHYSICAL_GOODS",
  }));
}
