// @ts-check
/**
 * Dashboard sign-in: one shared Firebase account with a fixed email; the page only asks for
 * the password, which Firebase checks (it is never in the site code).
 */

/** @param {unknown} err */
export function authErrorMessage(err) {
  const code = /** @type {{ code?: unknown }} */ (err)?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
      return 'That password is not right. Check it and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
      return 'Can’t reach the sign-in server. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'The dashboard account is disabled. Re-enable it in the Firebase console.';
    default:
      return 'Sign-in failed. Try again in a moment.';
  }
}

/**
 * @template A
 * @param {{
 *   auth: A,
 *   email: string,
 *   api: {
 *     signIn: (auth: A, email: string, password: string) => Promise<void>,
 *     signOut: (auth: A) => Promise<void>,
 *     onChange: (auth: A, cb: (user: { uid: string, email: string | null } | null) => void) => () => void,
 *   },
 * }} deps
 */
export function createDashboardAuth({ auth, email, api }) {
  return {
    /**
     * @param {string} password
     * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
     */
    async signIn(password) {
      if (!email) {
        return {
          ok: false,
          message: 'The dashboard account is not configured (VITE_DASHBOARD_EMAIL).',
        };
      }
      if (!password) return { ok: false, message: 'Enter the dashboard password.' };
      try {
        await api.signIn(auth, email, password);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: authErrorMessage(err) };
      }
    },
    signOut: () => api.signOut(auth),
    /** @param {(signedIn: boolean) => void} cb */
    onChange: (cb) => api.onChange(auth, (user) => cb(Boolean(user))),
  };
}
