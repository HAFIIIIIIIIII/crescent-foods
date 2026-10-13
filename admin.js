// Crescent Foods - admin order viewer
(() => {
  const $ = (id) => document.getElementById(id);
  const rupee = (n) => "₹" + n.toLocaleString("en-IN");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clsLabel = (c) => (/\d/.test(c) ? "Class " + c : c);
  const clsOrder = (c) => (c === "LKG" ? -2 : c === "UKG" ? -1 : Number(c));

  let orders = [];
  let unwatch = null;

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const el = $("view-" + name);
    void el.offsetWidth;
    el.classList.add("active");
  }

  // animated count-up for the stat numbers
  function countTo(el, to, fmt = (n) => n) {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    const start = performance.now(), dur = 600;
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function filtered() {
    const cls = $("classFilter").value;
    const q = $("search").value.trim().toLowerCase();
    return orders
      .filter((o) => (!cls || o.className === cls) && (!q || o.studentName.toLowerCase().includes(q)))
      .sort((a, b) =>
        clsOrder(a.className) - clsOrder(b.className) ||
        a.division.localeCompare(b.division) ||
        a.studentName.localeCompare(b.studentName)
      );
  }

  function render() {
    const list = filtered();

    // class filter options (keep current selection)
    const sel = $("classFilter"), cur = sel.value;
    const classes = [...new Set(orders.map((o) => o.className))].sort((a, b) => clsOrder(a) - clsOrder(b));
    sel.innerHTML = '<option value="">All classes</option>' + classes.map((c) => `<option value="${esc(c)}">${clsLabel(c)}</option>`).join("");
    sel.value = classes.includes(cur) ? cur : "";

    // stats
    const cash = list.reduce((s, o) => s + o.total, 0);
    const paid = list.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);
    const plates = list.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
    countTo($("stOrders"), list.length);
    countTo($("stPlates"), plates);
    countTo($("stCash"), cash, rupee);
    $("stPaid").textContent = `${rupee(paid)} / ${rupee(cash - paid)}`;

    // kitchen summary
    const by = {};
    list.forEach((o) => o.items.forEach((i) => {
      by[i.name] = by[i.name] || { qty: 0, amt: 0 };
      by[i.name].qty += i.qty;
      by[i.name].amt += i.qty * i.price;
    }));
    const names = Object.keys(by);
    $("itemRows").innerHTML = names.length
      ? names.map((n) => `<tr><td>${esc(n)}</td><td>${by[n].qty}</td><td>${rupee(by[n].amt)}</td></tr>`).join("")
      : '<tr><td colspan="3" class="empty">No orders yet</td></tr>';
    $("itemFoot").innerHTML = names.length ? `<tr><td>Total</td><td>${plates}</td><td>${rupee(cash)}</td></tr>` : "";

    // student orders
    $("orderRows").innerHTML = list.length
      ? list.map((o, idx) => `
        <tr style="animation-delay:${Math.min(idx, 20) * 25}ms">
          <td><b>${esc(o.studentName)}</b></td>
          <td><span class="chip">${esc(o.className)}-${esc(o.division)}</span></td>
          <td>${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>")}</td>
          <td><b>${rupee(o.total)}</b></td>
          <td>${o.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
          <td><button class="paid-btn ${o.paid ? "done" : ""}" data-id="${esc(o.id)}">${o.paid ? "✔ Collected" : "Pending"}</button></td>
        </tr>`).join("")
      : '<tr><td colspan="6" class="empty">No orders for this date</td></tr>';
  }

  $("orderRows").addEventListener("click", (e) => {
    const b = e.target.closest(".paid-btn");
    if (!b) return;
    const o = orders.find((x) => x.id === b.dataset.id);
    if (o) Store.setPaid(o.id, !o.paid);
  });

  function watch() {
    unwatch && unwatch();
    unwatch = Store.watchOrders($("date").value, (list) => { orders = list; render(); });
  }

  $("date").addEventListener("change", watch);
  $("classFilter").addEventListener("change", render);
  $("search").addEventListener("input", render);
  $("print").onclick = () => window.print();
  $("csv").onclick = () => {
    const list = filtered();
    const rows = [["Student", "Class", "Division", "Items", "Amount", "Collected", "Email"]].concat(
      list.map((o) => [o.studentName, o.className, o.division, o.items.map((i) => `${i.name} x${i.qty}`).join("; "), o.total, o.paid ? "Yes" : "No", o.email])
    );
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `crescent-foods-${$("date").value}.csv`;
    a.click();
  };

  // ---------- auth ----------
  $("login").onclick = () => Store.signIn().catch((e) => { console.error(e); alert("Sign-in failed. Please try again."); });
  $("logout").onclick = () => Store.signOut();
  $("deniedOut").onclick = () => Store.signOut();
  if (!Store.live) $("demoNote").classList.remove("hidden");

  Store.onAuth((u) => {
    $("userbox").classList.toggle("hidden", !u);
    if (!u) { unwatch && unwatch(); return showView("login"); }
    $("who").textContent = u.displayName || u.email;
    if (!Store.isAdmin(u)) return showView("denied");
    if (!$("date").value) $("date").value = Store.todayKey();
    watch();
    showView("dash");
  });
})();
