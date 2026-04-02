// ============================================================
//  firebaseConfig.js
//  Replace ALL placeholder values with your Firebase project's
//  credentials. Get them from:
//  Firebase Console → Project Settings → Your Apps → Web App
// ============================================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC0Enz4yuvTJn1cHvxBK7UQ4sutgp8SPXI",
  authDomain: "meetly-1b747.firebaseapp.com",
  projectId: "meetly-1b747",
  storageBucket: "meetly-1b747.firebasestorage.app",
  messagingSenderId: "139584384298",
  appId: "1:139584384298:web:53bc4c4527ae5102e40253"
};

const app      = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
