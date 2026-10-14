// @ts-check
/** Site configuration from build-time VITE_* variables. */

export const EMULATOR_PROJECT_ID = 'demo-quizcraft';

/**
 * @param {Record<string, string | boolean | undefined>} env usually import.meta.env
 */
export function readConfig(env) {
  const str = (/** @type {string} */ key) => {
    const v = env[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  const useEmulators = str('VITE_USE_EMULATORS') === 'true';
  const firebase = {
    apiKey: str('VITE_FIREBASE_API_KEY') || (useEmulators ? 'demo-key' : ''),
    authDomain: str('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: str('VITE_FIREBASE_PROJECT_ID') || (useEmulators ? EMULATOR_PROJECT_ID : ''),
    appId: str('VITE_FIREBASE_APP_ID') || (useEmulators ? 'demo-app' : ''),
  };
  const emailjs = {
    serviceId: str('VITE_EMAILJS_SERVICE_ID'),
    templateId: str('VITE_EMAILJS_TEMPLATE_ID'),
    publicKey: str('VITE_EMAILJS_PUBLIC_KEY'),
  };
  return {
    firebase,
    /** True when attempts can be saved (real project configured, or emulators). */
    configured: Boolean(firebase.apiKey && firebase.projectId && firebase.appId),
    useEmulators,
    emulatorHost: str('VITE_EMULATOR_HOST') || '127.0.0.1',
    dashboardEmail: str('VITE_DASHBOARD_EMAIL'),
    recaptchaSiteKey: str('VITE_RECAPTCHA_SITE_KEY'),
    siteUrl: str('VITE_SITE_URL').replace(/\/+$/, ''),
    emailjs,
    /** True when "Email me this result" / dashboard "Email result" can be offered. */
    emailConfigured: Boolean(emailjs.serviceId && emailjs.templateId && emailjs.publicKey),
  };
}

/** @typedef {ReturnType<typeof readConfig>} SiteConfig */
