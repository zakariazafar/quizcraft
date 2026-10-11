// Helpers for talking to the Firebase emulators directly (admin access with "Bearer owner").
export const PROJECT = 'demo-quizcraft';
export const FIRESTORE = 'http://127.0.0.1:8080';
export const AUTH = 'http://127.0.0.1:9099';
// The emulator loads firestore.rules as committed, so the dashboard test user gets the
// placeholder UID that the rules compare against.
export const DASHBOARD_UID = 'DASHBOARD_UID_PLACEHOLDER';
export const DASHBOARD_EMAIL = 'dashboard@quizcraft.test';
export const DASHBOARD_PASSWORD = 'e2e-test-password-123';

const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

export async function resetEmulators() {
  const a = await fetch(
    `${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const b = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  if (!a.ok || !b.ok) throw new Error(`Could not reset emulators (${a.status}, ${b.status})`);
}

export async function createDashboardUser() {
  const res = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`,
    {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({
        localId: DASHBOARD_UID,
        email: DASHBOARD_EMAIL,
        password: DASHBOARD_PASSWORD,
      }),
    },
  );
  if (!res.ok)
    throw new Error(`Could not create dashboard user: ${res.status} ${await res.text()}`);
}

/** Firestore REST value → plain JS. */
function plain(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(plain);
  if ('mapValue' in v) {
    return Object.fromEntries(
      Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]),
    );
  }
  return v;
}

/** All attempt documents, read with admin rights. */
export async function listAttempts() {
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/attempts`,
    { headers: owner },
  );
  if (!res.ok) throw new Error(`Could not list attempts: ${res.status}`);
  const body = await res.json();
  return (body.documents ?? []).map((d) => ({
    id: d.name.split('/').pop(),
    ...Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, plain(v)])),
  }));
}

/** Take a quiz in the browser. answers: { questionId: optionId } (others left blank). */
export async function takeQuiz(page, quizId, { name, email, answers }) {
  await page.goto(`/q/${quizId}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Start quiz' }).click();
  for (const [q, o] of Object.entries(answers)) {
    await page.locator(`input[name="${q}"][value="${o}"]`).check();
  }
  await page.getByRole('button', { name: 'Submit answers' }).click();
  const anyway = page.getByRole('button', { name: 'Submit anyway' });
  if (await anyway.isVisible().catch(() => false)) await anyway.click();
  await page.getByRole('heading', { name: 'Your result' }).waitFor();
}
