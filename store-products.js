//We tried to oggonize by category but it would not work no matter what we did...
//just changing 1 to be the entire name...
const CATEGORY_NAMES = { 1: "Plants / Tech / Coffee", 2: "Coffee", 3: "Retro Gear" };

function centsToMoney(cents) {
  const n = Number(cents || 0);
  return "$" + (n / 100).toFixed(2);
}

function productCard(p) {
  const img = p.image ? p.image : "placeholder.png";
  const priceNumber = p.price != null
    ? Number(p.price)
    : (p.price_cents != null ? Number(p.price_cents) / 100 : 0);

  const priceStr = p.price != null
    ? "$" + priceNumber.toFixed(2)
    : centsToMoney(p.price_cents);

  const pid = p.id ?? p.product_id ?? null;

  return `
    <div class="product-card">
      <img src="img/${img}" alt="${p.name}"
        onerror="this.onerror=null; this.src='img/' + (this.getAttribute('data-name-fallback')||'placeholder.png');"
        data-name-fallback="${p.name}.png">
      <h2>${p.name}</h2>
      <p class="price" style="font-weight:700; margin:.25rem 0;">${priceStr}</p>
      <p>${p.description ?? ""}</p>
      <button onclick='(window.addToCart||function(){console.warn("addToCart missing")})({
        id: ${JSON.stringify(pid)},
        name: ${JSON.stringify(p.name)},
        price: ${JSON.stringify(priceNumber)},
        img: "img/${img}"
      })'>Add to Cart</button>
    </div>
  `;
}

function renderCategorySection(catId, products) {
  const sectionId = `cat-${catId}`;
  const title = CATEGORY_NAMES[catId] || `Category ${catId}`;
  const cards = products.map(productCard).join("");

  return `
    <section class="category-section" id="${sectionId}" style="margin-top:2rem;">
      <h2 style="margin:0 0 1rem;">${title}</h2>
      <div class="product-grid">
        ${cards || '<p>No products available.</p>'}
      </div>
    </section>
  `;
}

function renderJumpLinks(catOrder) {
  const jumps = document.getElementById("category-jumps");
  if (!jumps) return;

  const links = catOrder.map((cid, idx) => {
    const title = CATEGORY_NAMES[cid] || `Category ${cid}`;
    const sep = idx === catOrder.length - 1 ? "" : " · ";
    return `<a href="#cat-${cid}" style="margin:0 .5rem;">${title}</a>${sep}`;
  }).join("");

  jumps.innerHTML = links;
}


function showError(msg) {
  const container = document.getElementById("store-sections");
  if (container) container.innerHTML = `<p>${msg}</p>`;
  console.error(msg);
}

async function fetchProducts() {
  const r = await fetch("/api/products", { credentials: "include" });
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    throw new Error("Products API did not return JSON. Status " + r.status + ". Body: " + text.slice(0,200));
  }
  const data = await r.json();
  // Accept either an array or {products:[…]}
  const arr = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : null);
  if (!arr) throw new Error("Unexpected API shape. Expected [] or {products:[…]}");
  return arr;
}

async function main() {
  try {
    const products = await fetchProducts();

    //tired removing this and EVERYTHING broke...
    const groups = {};
    for (const p of products) {
      const k = Number(p.category_id ?? 1) || 3;
      (groups[k] = groups[k] || []).push(p);
    }

    //this did not work...
    const allKeys = Object.keys(groups).map(Number);
    const other = allKeys.filter(k => ![1,2,3].includes(k)).sort((a,b)=>a-b);
    const orderedKeys = [1,2,3, ...other].filter(k => groups[k] && groups[k].length);

    renderJumpLinks(orderedKeys);

    //this section stuff is making me lose my mind
    //I don't understand why it won't properly break them apart but we're kinda out of time
    const container = document.getElementById("store-sections");
    container.innerHTML = orderedKeys.map(k => renderCategorySection(k, groups[k])).join("");

    if (typeof window.updateCartCount === "function") window.updateCartCount();
  } catch (e) {
    showError("Could not load products.");
    console.error(e);
  }
}

//online said to add this at the end as there was times things would bug out loading up...
//and now it's much smoother
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
