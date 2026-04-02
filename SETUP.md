# meetly — Firebase Setup Guide

## Files in this package

| File | Purpose |
|------|---------|
| `firebaseConfig.js` | Firebase SDK init — **add your credentials here** |
| `firebaseService.js` | All Auth / Firestore / Storage operations |
| `meetup-app-firebase.jsx` | React app wired to Firebase |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Storage security rules |
| `firestore.indexes.json` | Composite indexes for queries |
| `firebase.json` | Firebase CLI project config |

---

## Step 1 — Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `meetly`) → Continue
3. Disable Google Analytics if you don't need it → **Create project**

---

## Step 2 — Enable services

### Authentication
1. Console → **Build → Authentication → Get started**
2. **Sign-in method** tab → Enable **Email/Password** → Save

### Firestore Database
1. Console → **Build → Firestore Database → Create database**
2. Choose **Start in production mode** (rules are in `firestore.rules`)
3. Pick a region close to your users (e.g. `europe-west3` for Frankfurt) → Enable

### Storage
1. Console → **Build → Storage → Get started**
2. Start in production mode → choose the same region → Done

---

## Step 3 — Get your web app credentials

1. Console → **Project Settings** (gear icon) → **Your apps** tab
2. Click **Add app** → choose Web (`</>`) → register app (nickname: `meetly-web`)
3. Copy the `firebaseConfig` object shown — it looks like:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "meetly-abc12.firebaseapp.com",
  projectId:         "meetly-abc12",
  storageBucket:     "meetly-abc12.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

4. Paste those values into **`firebaseConfig.js`** replacing the `YOUR_*` placeholders.

---

## Step 4 — Install dependencies

```bash
npm install firebase
```

If you're starting fresh with Vite + React:
```bash
npm create vite@latest meetly -- --template react
cd meetly
npm install
npm install firebase
```

---

## Step 5 — Add the files to your project

Copy all files from this package into your `src/` folder:

```
src/
  firebaseConfig.js
  firebaseService.js
  App.jsx              ← rename meetup-app-firebase.jsx to App.jsx
```

In `src/main.jsx` make sure you have:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

---

## Step 6 — Deploy security rules & indexes

Install the Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase init    # select Firestore + Storage, link to your project
```

Then deploy:
```bash
# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage
```

Or deploy everything at once:
```bash
firebase deploy
```

---

## Step 7 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You should see the app connected to Firebase.

---

## Firestore data structure

```
/users/{uid}
  name, email, bio, photoURL, createdAt

/events/{eventId}
  title, category, date (Timestamp), time,
  location, city, lat, lng,
  description, tags[], maxAttendees, attendees,
  hostUid, hostName, hostAvatar, photoURL,
  createdAt

/events/{eventId}/rsvps/{userId}
  userId, eventId, createdAt

/rsvps/{userId}/events/{eventId}
  userId, eventId, createdAt       ← mirror for "my RSVPs" queries
```

---

## Deploying to production (Firebase Hosting)

```bash
npm run build          # creates dist/
firebase deploy --only hosting
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`

---

## Common issues

| Problem | Fix |
|---------|-----|
| `FirebaseError: Missing or insufficient permissions` | Deploy `firestore.rules` via CLI |
| Images not uploading | Deploy `storage.rules` and check CORS |
| Events not loading | Create the composite index (Firebase console will show a link in the error) |
| Auth not working | Make sure Email/Password is enabled in Console → Authentication |
