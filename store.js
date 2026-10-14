// Data layer: Firebase when configured, otherwise a localStorage demo mode.
const Store = (() => {
  const cfg = window.FIREBASE_CONFIG || {};
  const live = !!cfg.apiKey && !cfg.apiKey.startsWith("YOUR_") && typeof firebase !== "undefined";
  let auth, db;
  if (live) {
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
  }

  const STUDENT_DOMAIN = "crescent.school";
  const idToEmail = (id) => id.trim().toLowerCase() + "@" + STUDENT_DOMAIN;

  // ---------- DEMO STUDENT LIST (static data) ----------
  // Used only when Firebase is not configured. Add or edit students here.
  const STUDENTS = [
    { id: "CPS001", password: "pass001", name: "Aisha Fathima" },
    { id: "CPS002", password: "pass002", name: "Rahul Nair" },
    { id: "CPS003", password: "pass003", name: "Fatima Zahra" },
    { id: "CPS004", password: "pass004", name: "Arjun Menon" },
    { id: "CPS005", password: "pass005", name: "Meera Krishnan" }
  ];

  const todayKey = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const isAdmin = (u) =>
    !!u && (window.ADMIN_EMAILS || []).map((e) => e.toLowerCase()).includes((u.email || "").toLowerCase());

  // ---------- demo helpers ----------
  const load = () => JSON.parse(localStorage.getItem("cf_orders") || "[]");
  const save = (o) => { localStorage.setItem("cf_orders", JSON.stringify(o)); window.dispatchEvent(new Event("cf-orders")); };
  let demoAuthCb = null;
  const demoUser = () => JSON.parse(localStorage.getItem("cf_user") || "null");

  return {
    live,
    todayKey,
    isAdmin,

    onAuth(cb) {
      if (live) return auth.onAuthStateChanged(cb);
      demoAuthCb = cb;
      cb(demoUser());
    },

    // signIn(studentId, password)  -> student login
    // signIn()                     -> admin login (Google in live mode, prompt in demo mode)
    async signIn(studentId, password) {
      // ----- Student ID + password -----
      if (studentId !== undefined) {
        if (!studentId.trim() || !password) throw new Error("Missing Student ID or password");

        if (live) {
          await auth.signInWithEmailAndPassword(idToEmail(studentId), password);
          return;
        }

        // Demo mode: check against the static STUDENTS list
        const found = STUDENTS.find(
          (s) => s.id.toLowerCase() === studentId.trim().toLowerCase() && s.password === password
        );
        if (!found) throw new Error("Invalid Student ID or password");

        const email = idToEmail(found.id);
        const user = { uid: "demo-" + email, email, displayName: found.name };
        localStorage.setItem("cf_user", JSON.stringify(user));
        demoAuthCb && demoAuthCb(user);
        return;
      }

      // ----- Admin login (no arguments) -----
      if (live) {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        return;
      }
      const email = prompt("DEMO MODE - enter the admin email to sign in.\n(Admin demo: " + (window.ADMIN_EMAILS || [])[0] + ")");
      if (!email) return;
      const user = { uid: "demo-" + email.toLowerCase(), email: email.trim(), displayName: email.split("@")[0] };
      localStorage.setItem("cf_user", JSON.stringify(user));
      demoAuthCb && demoAuthCb(user);
    },

    async signOut() {
      if (live) return auth.signOut();
      localStorage.removeItem("cf_user");
      demoAuthCb && demoAuthCb(null);
    },

    async placeOrder(o) {
      const order = { ...o, date: todayKey(), paid: false };
      if (live) {
        const ref = await db.collection("orders").add({
          ...order,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
      }
      const id = "D" + Date.now().toString(36).toUpperCase();
      const all = load();
      all.push({ ...order, id, createdAt: new Date().toISOString() });
      save(all);
      return id;
    },

    watchOrders(date, cb) {
      if (live) {
        return db.collection("orders").where("date", "==", date).onSnapshot((snap) =>
          cb(snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, ...data, createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date() };
          }))
        );
      }
      const emit = () => cb(load().filter((o) => o.date === date).map((o) => ({ ...o, createdAt: new Date(o.createdAt) })));
      emit();
      window.addEventListener("cf-orders", emit);
      window.addEventListener("storage", emit);
      return () => { window.removeEventListener("cf-orders", emit); window.removeEventListener("storage", emit); };
    },

    async setPaid(id, paid) {
      if (live) return db.collection("orders").doc(id).update({ paid });
      save(load().map((o) => (o.id === id ? { ...o, paid } : o)));
    }
  };
})();
