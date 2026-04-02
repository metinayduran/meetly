# Deploying meetly to Netlify

## 1 — Add files to your project root

```
your-project/
  netlify.toml        ← copy from this package
  .env.example        ← copy from this package (rename + fill in for local dev)
  .env.local          ← your real secrets (never commit this)
  .gitignore
  src/
    firebaseConfig.js ← replace with the updated version from this package
    firebaseService.js
    App.jsx
```

Make sure `.gitignore` includes:
```
.env.local
.env
node_modules/
dist/
```

---

## 2 — Add env vars to Netlify

In the Netlify dashboard:
**Site → Site configuration → Environment variables → Add a variable**

Add each of these (values from Firebase Console → Project Settings):

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | your API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `yourproject.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `yourproject` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `yourproject.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | numeric sender ID |
| `VITE_FIREBASE_APP_ID` | `1:xxx:web:xxx` |

> **Important:** all keys must start with `VITE_` — Vite only exposes
> variables with that prefix to the browser bundle.

---

## 3 — Add your Netlify domain to Firebase Auth

Firebase blocks sign-ins from unknown domains by default.

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Click **Add domain**
3. Add your Netlify URL: `your-site-name.netlify.app`
4. If you have a custom domain, add that too

---

## 4 — Deploy options

### Option A — Connect GitHub (recommended)
1. Push your project to GitHub
2. Netlify → **Add new site → Import an existing project → GitHub**
3. Select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Click **Deploy site** — every push to `main` auto-deploys

### Option B — Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init        # links the project
netlify deploy --prod
```

### Option C — Drag and drop
```bash
npm run build       # produces dist/
```
Drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop)

---

## 5 — Verify the deploy

After deploy, open the Netlify URL and check:
- [ ] App loads without a white screen
- [ ] You can register and log in
- [ ] Events load from Firestore
- [ ] Uploading a photo works
- [ ] RSVP persists after page refresh

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank page / 404 on refresh | `netlify.toml` redirect rule is missing or not deployed |
| `auth/unauthorized-domain` error | Add your Netlify domain to Firebase Auth authorized domains |
| Env vars undefined | Keys must be prefixed `VITE_`; redeploy after adding vars |
| Images not loading | Check Firebase Storage rules are deployed |
| Build fails | Run `npm run build` locally first to catch errors |
