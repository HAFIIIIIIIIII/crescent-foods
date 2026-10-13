// ============================================================
//  Crescent Foods - configuration
// ============================================================
// 1) Paste your Firebase web-app config below (see README.md).
//    While the values still start with "YOUR_", the site runs in
//    DEMO MODE (orders are saved only in this browser) so you can
//    test the whole flow without any setup.
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 2) Gmail addresses allowed to open admin.html
window.ADMIN_EMAILS = ["admin@crescentschool.com"];

// 3) Last time (24h, "HH:MM") orders are accepted each day.
//    Use null for no limit.  Example: "09:30"
window.ORDER_CUTOFF = null;

// 4) Menu - change names / prices here.
window.MENU = [
  { id: "half",  name: "Half Biriyani", price: 100, emoji: "🍛", desc: "Fragrant rice with tender chicken, a lighter portion." },
  { id: "full",  name: "Full Biriyani", price: 150, emoji: "🍲", desc: "The full serving for the extra hungry." },
  { id: "meals", name: "Meals",         price: 60,  emoji: "🍱", desc: "Rice, curries, thoran and pickle - a homely lunch." }
];
