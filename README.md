# weighted incorporated: self-hosted store

Static site + a tiny checkout server, all on **Cloudflare Pages (free)**. It has a cart, PayPal checkout (PayPal, Venmo, Pay Later and cards), flat-rate shipping and state sales tax. There are no monthly fees, only PayPal's normal per-sale fee.

```
public/            ← the website (what visitors see)
  catalog.js       ← ★ products, prices, shipping and tax settings: the file you edit
  index.html  product.html  cart.html  thanks.html  about.html  404.html
  styles.css  site.js  favicon.svg
  images/          ← product photos
functions/api/     ← checkout server (Cloudflare runs these automatically)
lib/               ← pricing + PayPal code used by the server
test/              ← `node test/pricing.test.js` checks pricing/checkout, no installs needed
```

## How checkout works
1. Shoppers add items to the cart. The cart is saved in their browser.
2. On the cart page they click PayPal, Venmo or Card.
3. The server rebuilds the order from `catalog.js`, so prices can't be tampered with in the browser.
4. When the buyer picks a shipping address in PayPal, the server adds **shipping + sales tax** and PayPal shows the final total.
5. Before charging, the server re-checks the final address and totals, then captures the payment.

Orders appear in PayPal → **Activity**, with the shipping address and each item, e.g. "Weighted Sweatshirt – L".

---

## 1. Save your old photos (before cancelling Shopify)
Download these from your current site into `public/images/`:
`HoodieBlk.png` → `hoodie-black.png`, `sdwear.png` → `sideview.png`, `natural.png` → `natural.png`.
(Until you do, they load from Shopify, which stops working when you cancel.)

## 2. PayPal keys
1. Go to https://developer.paypal.com and log in with your PayPal **Business** account → **Apps & Credentials**.
2. Create an app under **Sandbox** first (for testing). Copy its **Client ID** and **Secret**.
3. Later, switch to **Live**, create an app, and copy the live Client ID and Secret.

The Secret goes into Cloudflare (step 3), **never into GitHub**.

## 3. Deploy on Cloudflare Pages
1. Push this whole folder to a GitHub repo (keep the structure; `functions/` and `lib/` must be at the top level).
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings: Framework **None** · Build command **(empty)** · Build output directory **`public`**.
4. Project → **Settings → Variables and Secrets** (Production), add:
   | Name | Value |
   |---|---|
   | `PAYPAL_CLIENT_ID` | your client ID |
   | `PAYPAL_CLIENT_SECRET` | your secret (choose **Encrypt**) |
   | `PAYPAL_ENV` | `sandbox` to test, `live` for real sales |
5. **Deployments → Retry deployment** so the variables take effect.
6. **Custom domains** → add `weightedincorporated.com` and `www.weightedincorporated.com`.
   If the domain was bought through Shopify, move it to Cloudflare first.

**Test before going live:** with `PAYPAL_ENV=sandbox`, buy something using a sandbox *personal* account (developer.paypal.com → Testing Tools → Sandbox Accounts). Check that shipping and tax look right, then switch the keys and `PAYPAL_ENV` to live and redeploy.

## 4. Shipping
Each sweatshirt ships in its own **USPS Priority Mail Large Flat Rate Box**, and the shopper pays what the box costs you: the `shipping` value on each product × quantity (2 sweatshirts = 2 boxes).

| Period | USPS commercial price | Set sweatshirt `shipping` to |
|---|---|---|
| Now through Jan 17, 2027 (holiday surcharge) | $29.51 | `29.51` (current) |
| After Jan 17, 2027 | $27.76 | `27.76` (check for a new January price first) |

**Commercial pricing:** the post office counter charges retail ($36.10 right now). Free label tools give you the cheaper commercial price:
- **PayPal Shipping:** in PayPal → Activity → open the order → **Ship**. The address is already filled in.
- **Pirate Ship** (pirateship.com): free; import or paste the address.

Choose *Priority Mail → Large Flat Rate Box*, print the label, and use free Large Flat Rate Boxes from USPS.com or the post office.

Other settings in `SHIPPING`: `countries` (where you ship), and `freeOver` (an items total that triggers free shipping; `null` = off).

## 5. Sales tax (Minnesota)
Already set up: `TAX = { MN: { rate: 0.06875, shipping: true, clothingExempt: true } }`.
- Minnesota doesn't tax general clothing, so **sweatshirts and beanies are tax-free**, and so is their shipping. Orders from other states aren't taxed either.
- If you add something that isn't clothing (a tote bag, for example), give it `taxCategory: "general"` and MN buyers will be charged 6.875%. Local taxes (e.g. Minneapolis) aren't included, so use a service like TaxJar if you start selling taxable items.
- You still need a Minnesota sales tax permit and must file returns, even if they're $0 returns. Confirm with the MN Department of Revenue or an accountant (I'm not a tax professional), including that a weighted sweatshirt counts as general clothing.
- Selling into other states only matters once you pass their thresholds (often $100,000 a year in that state). Then add that state to `TAX`.

## Everyday edits (all in `public/catalog.js`)
- **Price / description:** edit the product.
- **Sold out:** `soldOut: true`. The cart and the server both block it.
- **New photo:** add the file to `public/images/` and add a line to `images: [...]`. The first photo is the main one.
- **Colors:** add `Color: ["Black/Tan", "Sand"]` to `options`, next to `Size`.
- **New product:** copy a product block and give it a new `id`.

Push to GitHub and Cloudflare redeploys in about 30 seconds.

## Run it locally (optional)
Install Node, copy `.dev.vars.example` to `.dev.vars` with your sandbox keys, then `npx wrangler pages dev public`.
To preview only the look (checkout off): `cd public && python3 -m http.server`.
