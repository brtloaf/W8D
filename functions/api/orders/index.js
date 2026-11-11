// POST /api/orders  { items: [{ id, options, qty }] }  → { id }
import { buildLines, quote, paypalItems } from "../../../lib/pricing.js";
import { paypal, json, handle } from "../../../lib/paypal.js";
import { STORE } from "../../../public/catalog.js";

export const onRequestPost = handle(async ({ request, env }) => {
  const { items } = await request.json().catch(() => ({}));
  const lines = buildLines(items);
  const order = await paypal(env, "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: "default",
      description: STORE.name,
      amount: quote(lines, null), // shipping/tax finalised once PayPal has the address
      items: paypalItems(lines),
    }],
    application_context: {
      brand_name: STORE.name.slice(0, 127),
      shipping_preference: "GET_FROM_FILE",
      user_action: "PAY_NOW",
    },
  });
  return json({ id: order.id });
});
