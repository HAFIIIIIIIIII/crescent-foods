# Crescent Foods 🌙

Lunch ordering website for Crescent Public School.
Parents/students sign in with Google, add food, enter student name, class and division, and confirm. Admins see every order, the kitchen summary and the total cash to collect.

Plain HTML, CSS and JavaScript. No build step. Hosted free on GitHub Pages, with Firebase for Google login and order storage.

## Files

| File | Purpose |
|---|---|
| `index.html`, `app.js` | Parent / student ordering flow |
| `admin.html`, `admin.js` | Admin order viewer |
| `styles.css` | All styling and animations (colours are in `:root`) |
| `store.js` | Login and order storage (Firebase, or demo mode) |
| `firebase-config.js` | Your Firebase keys, admin emails, menu, order cutoff time |

## 1. Try it locally (demo mode)

1. Open the folder in VS Code.
2. Install the **Live Server** extension, right-click `index.html`, choose **Open with Live Server**.
3. Until Firebase is configured, sign-in is simulated and orders are saved only in your browser. For the admin page use the email in `ADMIN_EMAILS` (`admin@crescentschool.com`).

## 2. Set up Firebase (real Google login + shared orders)

1. Go to https://console.firebase.google.com and create a project.
2. **Build > Authentication > Get started > Sign-in method > Google > Enable.**
3. **Build > Firestore Database > Create database** (production mode).
4. **Project settings > Your apps > Web (`</>`)**: register an app and copy the config into `firebase-config.js`.
5. Put the school admin Gmail addresses in `ADMIN_EMAILS` in `firebase-config.js`.
6. **Firestore > Rules**, paste this (replace the email list with the same admins) and publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in ['admin@crescentschool.com'];
    }
    match /orders/{id} {
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow read:   if request.auth != null && (resource.data.uid == request.auth.uid || isAdmin());
      allow update: if isAdmin();
    }
  }
}
```

The Firebase web config is not a secret. These rules are what protect the data, so do not skip step 6.

## 3. Host on GitHub Pages

1. Create a new repository on GitHub, e.g. `crescent-foods`.
2. In the VS Code terminal, inside this folder:

```
git init
git add .
git commit -m "Crescent Foods website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/crescent-foods.git
git push -u origin main
```

3. On GitHub: **Settings > Pages > Build and deployment > Source: Deploy from a branch > Branch: `main` / `(root)` > Save.**
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/crescent-foods/` (admin page: `/admin.html`).
5. **Important:** in Firebase, go to **Authentication > Settings > Authorized domains > Add domain** and add `YOUR-USERNAME.github.io`. Without this, Google login will fail on the live site.

To update the site later: `git add . && git commit -m "update" && git push`.

## 4. Match the school's design

Send the school home page (HTML/CSS or screenshot). Header, colours, fonts and logo will be copied into `styles.css` and the `.topbar` section of the pages.

## Settings you may want to change

- Prices and food items: `MENU` in `firebase-config.js`
- Last ordering time, e.g. `"09:30"`: `ORDER_CUTOFF` in `firebase-config.js`
- Payment is cash at school. The admin marks each order **Collected** on the order list.
