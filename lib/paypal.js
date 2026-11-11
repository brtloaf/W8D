// Minimal PayPal Orders v2 client for Cloudflare Pages Functions.
// Needs env vars: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV ("live" or "sandbox")
import { CartError } from "./pricing.js";

const base = (env) =>
  env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function token(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error("PayPal keys are not set.");
  const r = await fetch(base(env) + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_CLIENT_SECRET),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error("PayPal auth failed: " + r.status);
  return (await r.json()).access_token;
}

export async function paypal(env, method, path, body) {
  const r = await fetch(base(env) + path, {
    method,
    headers: {
      Authorization: "Bearer " + (await token(env)),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) {
    const e = new Error("PayPal error " + r.status + ": " + (data.details?.[0]?.issue || data.name || ""));
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Wrap a handler: shopper-facing errors → 400 with message, everything else → 500.
export const handle = (fn) => async (ctx) => {
  try {
    return await fn(ctx);
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message }, 400);
    console.error(e.message, JSON.stringify(e.data || {}));
    return json({ error: "Checkout error. Please try again or email us." }, 500);
  }
};
