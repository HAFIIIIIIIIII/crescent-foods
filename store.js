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

  const STUDENT_DOMAIN = "crescent.school"; // Student ID becomes <id>@crescent.school in Firebase
  const idToEmail = (id) => id.trim().toLowerCase() + "@" + STUDENT_DOMAIN;

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
        // Demo mode: accept any Student ID and password
        const email = idToEmail(studentId);
        const user = { uid: "demo-" + email, email, displayName: studentId.trim().toUpperCase() };
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
