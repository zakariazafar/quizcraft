// @ts-check
// Firebase Authentication for the dashboard only (kept out of the quiz page bundle).
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirebase } from './firebase.js';

/** @typedef {import('./config.js').SiteConfig} SiteConfig */

/** @type {Map<string, import('firebase/auth').Auth>} */
const cache = new Map();

/**
 * Auth client for the site's Firebase app. Sessions last until the browser is closed.
 * @param {SiteConfig} config
 */
export function getAuthClient(config) {
  const key = config.firebase.projectId;
  const existing = cache.get(key);
  if (existing) return existing;
  const auth = getAuth(getFirebase(config).app);
  if (config.useEmulators) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}:9099`, { disableWarnings: true });
  }
  cache.set(key, auth);
  return auth;
}

/** The Firebase functions the dashboard needs, injectable for tests. */
export const authApi = {
  /** @param {import('firebase/auth').Auth} auth @param {string} email @param {string} password */
  signIn: async (auth, email, password) => {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  },
  /** @param {import('firebase/auth').Auth} auth */
  signOut: (auth) => signOut(auth),
  /**
   * @param {import('firebase/auth').Auth} auth
   * @param {(user: { uid: string, email: string | null } | null) => void} cb
   */
  onChange: (auth, cb) => onAuthStateChanged(auth, cb),
};

/** For tests. */
export function resetAuthCache() {
  cache.clear();
}
