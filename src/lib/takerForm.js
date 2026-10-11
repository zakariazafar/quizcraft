// @ts-check
/** Validation of the taker's name and email. */

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {{ name?: unknown, email?: unknown }} input
 * @returns {{ ok: boolean, values: { name: string, email: string },
 *   errors: { name?: string, email?: string } }}
 */
export function validateTaker(input) {
  const name = String(input.name ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
  const email = String(input.email ?? '')
    .normalize('NFC')
    .trim();
  /** @type {{ name?: string, email?: string }} */
  const errors = {};
  if (!name) errors.name = 'Enter your name.';
  else if (name.length > NAME_MAX) errors.name = `Use ${NAME_MAX} characters or fewer.`;
  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > EMAIL_MAX || !EMAIL.test(email)) {
    errors.email = 'Enter an email address like name@example.com.';
  }
  return { ok: Object.keys(errors).length === 0, values: { name, email }, errors };
}
