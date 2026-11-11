// GET /api/config — public PayPal client ID for the browser.
import { json } from "../../lib/paypal.js";

export const onRequestGet = ({ env }) =>
  json({ clientId: env.PAYPAL_CLIENT_ID || null, env: env.PAYPAL_ENV === "live" ? "live" : "sandbox" });
