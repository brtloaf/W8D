// POST /api/orders/:id/shipping  { address: { countryCode, state } }
// Called while the buyer is in PayPal and picks/changes their address.
// Recalculates shipping + sales tax and updates the PayPal order.
import { buildLines, itemsFromSkus, quote, CartError } from "../../../../lib/pricing.js";
import { paypal, json, handle } from "../../../../lib/paypal.js";

export const onRequestPost = handle(async ({ request, env, params }) => {
  const { address } = await request.json().catch(() => ({}));
  const addr = { countryCode: address?.countryCode, state: address?.state };
  const order = await paypal(env, "GET", `/v2/checkout/orders/${encodeURIComponent(params.id)}`);
  const lines = buildLines(itemsFromSkus(order.purchase_units?.[0]?.items));
  let amount;
  try {
    amount = quote(lines, addr);
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, code: "COUNTRY" }, 400);
    throw e;
  }
  await paypal(env, "PATCH", `/v2/checkout/orders/${encodeURIComponent(params.id)}`, [
    { op: "replace", path: "/purchase_units/@reference_id=='default'/amount", value: amount },
  ]);
  return json({ ok: true, amount });
});
