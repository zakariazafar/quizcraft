// @ts-check
import { initializeApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore/lite';

/** @typedef {import('./config.js').SiteConfig} SiteConfig */

/** @type {Map<string, { app: import('firebase/app').FirebaseApp, db: import('firebase/firestore/lite').Firestore }>} */
const cache = new Map();

/**
 * Initialise Firebase once per project (and connect to the emulators when configured).
 * @param {SiteConfig} config
 */
export function getFirebase(config) {
  const key = config.firebase.projectId;
  const existing = cache.get(key);
  if (existing) return existing;
  const app = initializeApp(config.firebase, key);
  const db = getFirestore(app);
  if (config.useEmulators) connectFirestoreEmulator(db, config.emulatorHost, 8080);
  const entry = { app, db };
  cache.set(key, entry);
  return entry;
}

/**
 * A writer that stores one attempt at attempts/<id>, stamping submittedAt on the server.
 * @param {SiteConfig} config
 * @returns {(id: string, record: Record<string, unknown>) => Promise<void>}
 */
export function firestoreAttemptWriter(config) {
  return async (id, record) => {
    const { db } = getFirebase(config);
    await setDoc(doc(db, 'attempts', id), { ...record, submittedAt: serverTimestamp() });
  };
}

/** For tests. */
export function resetFirebaseCache() {
  cache.clear();
}

/**
 * All attempts, newest first (the dashboard groups and filters them in the browser).
 * Needs the dashboard account to be signed in on the same Firebase app.
 * @param {SiteConfig} config
 * @param {number} [max]
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchAllAttempts(config, max = 5000) {
  const { db } = getFirebase(config);
  const snap = await getDocs(
    query(collection(db, 'attempts'), orderBy('submittedAt', 'desc'), limit(max)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
