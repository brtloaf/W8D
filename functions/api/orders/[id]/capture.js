// POST /api/orders/:id/capture
// Re-checks shipping + tax against the buyer's FINAL address, then takes the payment.
import { buildLines, itemsFromSkus, quote, CartError } from "../../../../lib/pricing.js";
import { paypal, json, handle } from "../../../../lib/paypal.js";

export const onRequestPost = handle(async ({ env, params }) => {
  const id = encodeURIComponent(params.id);
  const order = await paypal(env, "GET", `/v2/checkout/orders/${id}`);
  const pu = order.purchase_units?.[0] || {};
  const a = pu.shipping?.address || {};
  const lines = buildLines(itemsFromSkus(pu.items));
  const expected = quote(lines, { countryCode: a.country_code, state: a.admin_area_1 });

  if (expected.value !== pu.amount?.value) {
    try {
      await paypal(env, "PATCH", `/v2/checkout/orders/${id}`, [
        { op: "replace", path: "/purchase_units/@reference_id=='default'/amount", value: expected },
      ]);
    } catch {
      throw new CartError("Your total changed (shipping or tax). Please start checkout again.");
    }
  }

  try {
    const cap = await paypal(env, "POST", `/v2/checkout/orders/${id}/capture`);
    return json({ id: cap.id, status: cap.status });
  } catch (e) {
    if (e.data?.details?.[0]?.issue === "INSTRUMENT_DECLINED") return json({ restart: true }, 402);
    throw e;
  }
});
