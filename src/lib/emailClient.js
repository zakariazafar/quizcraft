// @ts-check
import emailjs from '@emailjs/browser';

/** @typedef {import('./config.js').SiteConfig} SiteConfig */

/**
 * A sender that posts one result email through EmailJS (a client-callable email API; this
 * site has no backend of its own to send mail from). The public key is not a secret:
 * EmailJS restricts abuse by allowed domain and rate limits on their side.
 * @param {SiteConfig} config
 * @returns {(params: Record<string, unknown>) => Promise<void>}
 */
export function emailjsResultSender(config) {
  return async (params) => {
    await emailjs.send(config.emailjs.serviceId, config.emailjs.templateId, params, {
      publicKey: config.emailjs.publicKey,
    });
  };
}
