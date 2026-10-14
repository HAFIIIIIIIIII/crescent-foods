// Crescent Foods - parent / student ordering page
(() => {
  const $ = (id) => document.getElementById(id);
  const MENU = window.MENU;
  const rupee = (n) => "₹" + n;
  let cart = {};          // { itemId: qty }
  let user = null;

  // ---------- helpers ----------
  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    // re-trigger animation
    const el = $("view-" + name);
    void el.offsetWidth;
    el.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    updateCartBar();
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const total = () => MENU.reduce((s, m) => s + m.price * (cart[m.id] || 0), 0);
  const activeView = () => (document.querySelector(".view.active") || {}).id;

  // Student ID is stored as the part before "@" in the account email
  const studentIdOf = (u) => (u && u.email ? u.email.split("@")[0].toUpperCase() : "");

  function cutoffPassed() {
    const c = window.ORDER_CUTOFF;
    if (!c) return false;
    const [h, m] = c.split(":").map(Number);
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
  }
  function fmtCutoff(c) {
    const [h, m] = c.split(":").map(Number);
    return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM");
  }

  // ---------- menu ----------
  function renderMenu() {
    const grid = $("menuGrid");
    const closed = cutoffPassed();
    grid.innerHTML = "";
    MENU.forEach((m) => {
      const q = cart[m.id] || 0;
      const card = document.createElement("div");
      card.className = "food";
      card.innerHTML = `
        <div class="emoji">${m.emoji}</div>
        <h3>${m.name}</h3>
        <p>${m.desc}</p>
        <div class="price">${rupee(m.price)} <small>per plate</small></div>
        <div class="actions"></div>`;
      const actions = card.querySelector(".actions");
      if (q === 0) {
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = closed ? "Orders closed" : "+ Add";
        b.disabled = closed;
        b.onclick = () => { change(m.id, 1); openPopup(m); };
        actions.appendChild(b);
      } else {
        actions.innerHTML = `<div class="stepper"><button aria-label="Remove one">−</button><span>${q}</span><button aria-label="Add one">+</button></div>`;
        const [minus, , plus] = actions.querySelector(".stepper").children;
        minus.onclick = () => change(m.id, -1);
        plus.onclick = () => change(m.id, 1);
      }
      grid.appendChild(card);
    });
    // don't replay the entrance animation on re-render
    grid.querySelectorAll(".food").forEach((c) => (c.style.animation = "none"));
  }

  function change(id, d) {
    cart[id] = Math.max(0, (cart[id] || 0) + d);
    if (!cart[id]) delete cart[id];
    renderMenu();
    updateCartBar(true);
  }

  function updateCartBar(bump) {
    const n = count();
    const show = n > 0 && activeView() === "view-menu";
    $("cartbar").classList.toggle("show", show);
    $("cartTotal").textContent = rupee(total());
    $("cartCount").textContent = n + (n === 1 ? " item" : " items");
    if (bump && show) {
      $("cartTotal").classList.remove("bump");
      void $("cartTotal").offsetWidth;
      $("cartTotal").classList.add("bump");
    }
  }

  // ---------- popup ----------
  function openPopup(item) {
    $("popupTitle").textContent = item.name + " added";
    $("popupText").textContent = `${count()} item(s) in your order · Total ${rupee(total())}`;
    $("overlay").classList.add("show");
  }
  const closePopup = () => $("overlay").classList.remove("show");
  $("popupContinue").onclick = closePopup;
  $("popupProceed").onclick = () => { closePopup(); goCheckout(); };
  $("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closePopup(); });
  $("cartCheckout").onclick = goCheckout;

  // ---------- checkout ----------
  function populateSelects() {
    const cls = $("className"), div = $("division");
    ["LKG", "UKG"].concat(Array.from({ length: 12 }, (_, i) => String(i + 1))).forEach((c) => {
      cls.add(new Option(/\d/.test(c) ? "Class " + c : c, c));
    });
    ["A", "B", "C", "D", "E", "F"].forEach((d) => div.add(new Option(d, d)));
  }

  function goCheckout() {
    if (!count()) return toast("Add at least one item first");
    if (cutoffPassed()) return toast("Sorry, orders closed at " + fmtCutoff(window.ORDER_CUTOFF));
    const rows = MENU.filter((m) => cart[m.id]).map(
      (m) => `<div class="line"><span>${m.name} × ${cart[m.id]}</span><span>${rupee(m.price * cart[m.id])}</span></div>`
    ).join("");
    $("summary").innerHTML = rows + `<div class="line total"><span>Total to pay at school</span><span>${rupee(total())}</span></div>`;
    validate();
    showView("checkout");
  }
  $("backToMenu").onclick = () => showView("menu");

  const formValid = () =>
    $("studentName").value.trim().length >= 2 && $("className").value && $("division").value;
  function validate() {
    const ok = !!formValid();
    $("confirmWrap").classList.toggle("show", ok);
    $("formNote").classList.toggle("hidden", ok);
  }
  ["input", "change"].forEach((ev) => $("checkoutForm").addEventListener(ev, validate));

  $("checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!formValid()) return;
    if (cutoffPassed()) return toast("Sorry, orders are closed for today");
    const btn = $("confirmBtn");
    btn.disabled = true;
    btn.textContent = "Placing order…";
    const items = MENU.filter((m) => cart[m.id]).map((m) => ({ id: m.id, name: m.name, price: m.price, qty: cart[m.id] }));
    const order = {
      uid: user.uid,
      email: user.email,
      studentId: studentIdOf(user),            // CHANGED: Student ID saved with the order
      studentName: $("studentName").value.trim(),
      className: $("className").value,
      division: $("division").value,
      items,
      total: total()
    };
    try {
      const id = await Store.placeOrder(order);
      showSuccess(order, id);
      cart = {};
      $("checkoutForm").reset();
      renderMenu();
    } catch (err) {
      console.error(err);
      toast("Could not place the order. Please try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = "✔ Confirm order";
    }
  });

  // ---------- success ----------
  function showSuccess(o, id) {
    $("successSub").textContent = `${o.studentName} · ${/\d/.test(o.className) ? "Class " : ""}${o.className} ${o.division}`;
    $("receipt").innerHTML =
      o.items.map((i) => `<div class="line"><span>${i.name} × ${i.qty}</span><span>${rupee(i.price * i.qty)}</span></div>`).join("") +
      `<div class="line total"><span>Pay in cash at school</span><span>${rupee(o.total)}</span></div>` +
      `<div class="line" style="opacity:.6;font-size:12px"><span>Order ID</span><span>${String(id).slice(0, 8).toUpperCase()}</span></div>`;
    showView("success");
  }
  $("orderAgain").onclick = () => showView("menu");

  // ---------- auth (CHANGED: Student ID + password) ----------
  const loginError = $("loginError");

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const id = $("studentId").value.trim();
    const pw = $("password").value;
    if (!id || !pw) {
      loginError.textContent = "Enter your Student ID and password.";
      return;
    }
    const btn = $("login");
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await Store.signIn(id, pw);
      $("password").value = "";
    } catch (err) {
      console.error(err);
      loginError.textContent = "Incorrect Student ID or password.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });

  $("logout").onclick = () => { cart = {}; Store.signOut(); };
  if (!Store.live) $("demoNote").classList.remove("hidden");

  Store.onAuth((u) => {
    user = u;
    $("userbox").classList.toggle("hidden", !u);
    if (u) {
      $("who").textContent = studentIdOf(u);   // CHANGED: show Student ID
      const closed = cutoffPassed();
      const b = $("cutoffBanner");
      b.classList.toggle("closed", closed);
      b.classList.toggle("hidden", !window.ORDER_CUTOFF);
      if (window.ORDER_CUTOFF) {
        b.textContent = closed
          ? "Orders for today closed at " + fmtCutoff(window.ORDER_CUTOFF) + "."
          : "Order before " + fmtCutoff(window.ORDER_CUTOFF) + " today.";
      }
      renderMenu();
      showView("menu");
    } else {
      showView("login");
    }
  });

  populateSelects();
})();
