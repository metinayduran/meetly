// ============================================================
//  firebaseService.js
//  All Firestore + Auth + Storage operations in one place.
//  Import these functions into your React components.
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { auth, db, storage } from "./firebaseConfig";

// ── Auth ───────────────────────────────────────────────────

/** Register a new user, upload avatar, save profile to Firestore */
export async function registerUser({ name, email, password, bio = "", photoFile = null }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  let photoURL = null;
  if (photoFile) {
    const storageRef = ref(storage, `avatars/${uid}/${photoFile.name}`);
    await uploadBytes(storageRef, photoFile);
    photoURL = await getDownloadURL(storageRef);
  }

  await updateProfile(cred.user, { displayName: name, photoURL });

  await setDoc(doc(db, "users", uid), {
    uid,
    name,
    email,
    bio,
    photoURL,
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

/** Sign in with email + password */
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sign out */
export async function logoutUser() {
  await signOut(auth);
}

/** Subscribe to auth state changes. Returns unsubscribe function. */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Fetch a user's Firestore profile */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Update a user's profile fields (name, bio, photoFile) */
export async function updateUserProfile(uid, { name, bio, photoFile }) {
  const updates = {};
  if (name) updates.name = name;
  if (bio !== undefined) updates.bio = bio;

  if (photoFile) {
    const storageRef = ref(storage, `avatars/${uid}/${photoFile.name}`);
    await uploadBytes(storageRef, photoFile);
    updates.photoURL = await getDownloadURL(storageRef);
    await updateProfile(auth.currentUser, { displayName: name, photoURL: updates.photoURL });
  }

  await updateDoc(doc(db, "users", uid), updates);
}

// ── Events ─────────────────────────────────────────────────

/**
 * Create an event.
 * eventData shape:
 *   title, category, date (JS Date), time (string "HH:MM"),
 *   location, description, maxAttendees, tags (string[]),
 *   city, lat, lng, photoFile (File|null)
 */
export async function createEvent(eventData, user) {
  const { photoFile, date, time, ...rest } = eventData;

  // Combine date + time into a Firestore Timestamp
  const [h, m] = time.split(":").map(Number);
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);

  let photoURL = null;
  const eventRef = doc(collection(db, "events")); // pre-generate ID for storage path

  if (photoFile) {
    const storageRef = ref(storage, `events/${eventRef.id}/${photoFile.name}`);
    await uploadBytes(storageRef, photoFile);
    photoURL = await getDownloadURL(storageRef);
  }

  const payload = {
    ...rest,
    date: Timestamp.fromDate(dt),
    photoURL,
    hostUid:     user.uid,
    hostName:    user.displayName || user.name,
    hostAvatar:  user.photoURL || null,
    attendees:   0,
    createdAt:   serverTimestamp(),
  };

  await setDoc(eventRef, payload);
  return { id: eventRef.id, ...payload, date: dt };
}

/** Fetch all upcoming events, optionally filtered by category */
export async function getEvents({ category = null, limitCount = 50 } = {}) {
  const now = Timestamp.now();
  const constraints = [
    where("date", ">=", now),
    orderBy("date", "asc"),
    limit(limitCount),
  ];
  if (category && category !== "All") {
    constraints.unshift(where("category", "==", category));
  }
  const q = query(collection(db, "events"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    date: d.data().date.toDate(),   // convert Timestamp → JS Date
  }));
}

/** Real-time listener for events. Returns unsubscribe fn. */
export function subscribeToEvents(callback, { category = null } = {}) {
  const now = Timestamp.now();
  const constraints = [where("date", ">=", now), orderBy("date", "asc"), limit(50)];
  if (category && category !== "All") {
    constraints.unshift(where("category", "==", category));
  }
  const q = query(collection(db, "events"), ...constraints);
  return onSnapshot(q, snap => {
    const events = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date.toDate(),
    }));
    callback(events);
  });
}

/** Fetch a single event by ID */
export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data(), date: snap.data().date.toDate() };
}

/** Delete an event (only the host should call this) */
export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, "events", eventId));
}

// ── RSVPs ──────────────────────────────────────────────────

/**
 * Toggle RSVP for current user on an event.
 * Returns true if user is now attending, false if they cancelled.
 */
export async function toggleRsvp(eventId, userId) {
  const rsvpRef  = doc(db, "events", eventId, "rsvps", userId);
  const mirrorRef = doc(db, "rsvps", userId, "events", eventId);
  const eventRef  = doc(db, "events", eventId);

  const existing = await getDoc(rsvpRef);

  if (existing.exists()) {
    // Cancel RSVP
    await deleteDoc(rsvpRef);
    await deleteDoc(mirrorRef);
    await updateDoc(eventRef, { attendees: increment(-1) });
    return false;
  } else {
    // Add RSVP
    const payload = { userId, eventId, createdAt: serverTimestamp() };
    await setDoc(rsvpRef,   payload);
    await setDoc(mirrorRef, payload);
    await updateDoc(eventRef, { attendees: increment(1) });
    return true;
  }
}

/** Fetch all event IDs the current user has RSVP'd to */
export async function getUserRsvps(userId) {
  const snap = await getDocs(collection(db, "rsvps", userId, "events"));
  return snap.docs.map(d => d.id);
}

/** Check whether a specific user has RSVP'd to an event */
export async function hasRsvpd(eventId, userId) {
  const snap = await getDoc(doc(db, "events", eventId, "rsvps", userId));
  return snap.exists();
}
