// ============================================================
//  CATALOG + STORE SETTINGS — the main file you edit.
//  The shop pages AND the checkout server both read this file,
//  so prices, shipping and tax can't be changed by a shopper.
// ============================================================

export const STORE = {
  name: "weighted incorporated",
  contactEmail: "hello@weightedincorporated.com", // change to your real email
  announcement: "A weighted blanket you can wear.", // top black bar; "" to hide
  currency: "USD",
};

// ---------- SHIPPING ----------
// Each product has its own "shipping" cost per unit (see PRODUCTS below).
// Order shipping = sum of (product shipping × quantity).
// Sweatshirts ship one per USPS Priority Mail Large Flat Rate Box.
//   USPS commercial price (what PayPal Shipping / Pirate Ship charge you):
//     $29.51 during holiday pricing, Oct 4 2026 – Jan 17 2027
//     $27.76 after Jan 17 2027  ← update the sweatshirt's "shipping" then
export const SHIPPING = {
  countries: ["US"],   // where you ship. e.g. ["US", "CA"]
  freeOver: null,      // free shipping when items total this much or more (null = never)
  service: "USPS Priority Mail (1–3 business days)",
};

// ---------- SALES TAX ----------
// Tax is only charged when the shipping address is in a state listed here.
//   rate:           decimal (0.06875 = 6.875% MN state rate)
//   shipping:       true if shipping is taxable (MN: only when the items are taxable)
//   clothingExempt: true → products with taxCategory "clothing" are tax-free there
// Minnesota exempts general clothing, so sweatshirts and beanies are $0 tax.
// Anything non-clothing you add later (taxCategory: "general") gets 6.875% + local tax.
export const TAX = {
  MN: { rate: 0.06875, shipping: true, clothingExempt: true },
};

// ---------- PRODUCTS ----------
//  price: USD.  soldOut: true hides checkout.
//  options: choices the buyer must pick, e.g. { Size: [...], Color: [...] }
//  images: first is the main photo. "fallback" = old Shopify URL, used only
//          if the local file is missing (remove once photos are in /images).
//  taxCategory: "clothing" or "general" (used with clothingExempt above)
//  shipping: USD charged per unit for shipping
export const PRODUCTS = [
  {
    id: "weighted-sweatshirt",
    name: "Weighted Sweatshirt",
    price: 500.0,
    soldOut: false,
    taxCategory: "clothing",
    shipping: 29.51, // 1 × USPS Priority Mail Large Flat Rate Box (commercial, holiday rate)
    description:
      "Evenly distributed weight sewn into a heavyweight quilted sweatshirt. The calm of a weighted blanket, wherever you go.",
    options: { Size: ["S", "M", "L", "XL", "XXL"] },
    images: [
      { src: "images/quilted-black-tan-flat.jpg", alt: "Quilted weighted hoodie in black with tan hood, pocket and cuffs" },
      { src: "images/hoodie-black.png", fallback: "https://www.weightedincorporated.com/cdn/shop/files/HoodieBlk.png", alt: "Weighted Sweatshirt in black" },
      { src: "images/quilted-black-tan-worn.jpg", alt: "Black and tan quilted weighted hoodie, worn" },
      { src: "images/quilted-natural-detail.jpg", alt: "Close-up of the quilted weight pockets and hood" },
      { src: "images/sideview.png", fallback: "https://www.weightedincorporated.com/cdn/shop/files/sdwear.png", alt: "Weighted Sweatshirt worn, side view" },
      { src: "images/quilted-two-tone-hanger.jpg", alt: "Quilted weighted hoodie in sand, rust and sage" },
      { src: "images/quilted-rust-cream-hanger.jpg", alt: "Quilted weighted hoodie in rust and cream" },
      { src: "images/quilted-cream-black-worn.jpg", alt: "Cream quilted weighted hoodie with black sleeves, worn" },
      { src: "images/quilted-cream-multi-worn.jpg", alt: "Cream quilted weighted hoodie with brown sleeves and sage pocket, worn" },
      { src: "images/natural.png", fallback: "https://www.weightedincorporated.com/cdn/shop/files/natural.png", alt: "Weighted Sweatshirt in natural" },
    ],
  },
  {
    id: "weighted-beanie",
    name: "Weighted Beanie",
    price: 50.0,
    soldOut: true,
    taxCategory: "clothing",
    shipping: 29.51, // placeholder: set a cheaper box rate before restocking
    description: "A soft knit beanie with a light weighted band.",
    options: {},
    images: [],
  },
];
