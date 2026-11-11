// Shared header/footer, cart storage and helpers.
import { STORE, PRODUCTS } from "./catalog.js";

const KEY = "w8d_cart";
export const fmt = (n) => "$" + Number(n).toFixed(2) + " " + STORE.currency;
export const productById = (id) => PRODUCTS.find((p) => p.id === id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export { esc };

// ---------- Cart (stored in this browser) ----------
export function getCart() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "[]");
    // drop anything that no longer exists in the catalog
    return Array.isArray(c) ? c.filter((l) => productById(l.id)) : [];
  } catch { return []; }
}
export function saveCart(cart) {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
  updateCount();
}
const sameLine = (a, b) => a.id === b.id && JSON.stringify(a.options || {}) === JSON.stringify(b.options || {});
export function addToCart(id, options, qty) {
  const cart = getCart();
  const line = { id, options, qty };
  const found = cart.find((l) => sameLine(l, line));
  if (found) found.qty = Math.min(20, found.qty + qty);
  else cart.push(line);
  saveCart(cart);
}
export const clearCart = () => saveCart([]);
export const cartCount = () => getCart().reduce((s, l) => s + l.qty, 0);
function updateCount() {
  const el = document.getElementById("cartCount");
  if (el) { const n = cartCount(); el.textContent = n ? `(${n})` : ""; }
}

// ---------- Images ----------
export function imgTag(im) {
  if (!im) return `<div class="placeholder">Photo coming soon</div>`;
  const fb = im.fallback ? `data-fallback="${esc(im.fallback)}"` : "";
  return `<img src="${esc(im.src)}" ${fb} alt="${esc(im.alt || "")}" loading="lazy" onerror="imgFail(this)">`;
}
window.imgFail = (el) => {
  const fb = el.dataset.fallback;
  if (fb && el.src !== fb) { el.src = fb; return; }
  el.replaceWith(Object.assign(document.createElement("div"), { className: "placeholder", textContent: "Photo coming soon" }));
};

// ---------- Toast ----------
export function toast(html) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.innerHTML = html;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 4000);
}

// ---------- Header / footer ----------
const page = document.body.dataset.page || "";
const cur = (p) => (page === p ? 'aria-current="page"' : "");
document.body.insertAdjacentHTML("afterbegin", `
  <a class="skip" href="#main">Skip to content</a>
  ${STORE.announcement ? `<div class="announce">${esc(STORE.announcement)}</div>` : ""}
  <header class="site"><div class="bar">
    <nav aria-label="Main">
      <a href="index.html" ${cur("home")}>Home</a>
      <a href="index.html#shop">Shop</a>
      <a href="about.html" ${cur("about")}>About</a>
    </nav>
    <a class="logo" href="index.html">${esc(STORE.name)}</a>
    <div class="right"><a href="cart.html" ${cur("cart")}>Cart <span id="cartCount"></span></a></div>
  </div></header>`);
document.body.insertAdjacentHTML("beforeend", `
  <footer class="site"><div class="inner">
    <span>© ${new Date().getFullYear()}, ${esc(STORE.name)}</span>
    <span><a href="about.html">About</a> · <a href="mailto:${esc(STORE.contactEmail)}">${esc(STORE.contactEmail)}</a></span>
  </div></footer>`);
updateCount();
window.addEventListener("storage", updateCount);
