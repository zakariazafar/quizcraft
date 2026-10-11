// Firestore security rules tests. Run with: npm run test:rules (starts the emulator).
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const DASHBOARD_UID = 'dashboard-test-uid';
let env;

beforeAll(async () => {
  const rules = readFileSync('firestore.rules', 'utf8').replaceAll(
    'DASHBOARD_UID_PLACEHOLDER',
    DASHBOARD_UID,
  );
  env = await initializeTestEnvironment({
    projectId: 'demo-quizcraft',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

function validAttempt(overrides = {}) {
  return {
    quizId: 'ism-four-properties',
    quizVersion: 1,
    quizTitle: 'The 4 Properties of an اِسْم (Ism)',
    takerName: 'زكريا',
    takerEmail: 'Zakaria@Example.com',
    takerEmailLower: 'zakaria@example.com',
    answers: [
      { questionId: 'q1', selected: 'a', correct: true },
      { questionId: 'q2', selected: null, correct: false },
    ],
    score: 1,
    total: 2,
    percent: 50,
    startedAt: '2026-10-12T09:00:00.000Z',
    submittedAt: serverTimestamp(),
    clientId: 'client-1',
    userAgent: 'Mozilla/5.0',
    ...overrides,
  };
}

const anon = () => env.unauthenticatedContext().firestore();
const dashboard = () => env.authenticatedContext(DASHBOARD_UID).firestore();
const otherUser = () => env.authenticatedContext('someone-else').firestore();

async function seed(id = 'seed-1') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'attempts', id), validAttempt({ submittedAt: new Date() }));
  });
}

describe('attempts: create', () => {
  it('anyone can create a valid attempt (Arabic name and title)', async () => {
    await assertSucceeds(setDoc(doc(anon(), 'attempts', 'a1'), validAttempt()));
  });

  const bad = [
    ['an extra field', { extra: 1 }],
    ['quizId with bad characters', { quizId: 'Bad_Id' }],
    ['quizVersion as string', { quizVersion: '1' }],
    ['empty name', { takerName: '' }],
    ['name over 100 characters', { takerName: 'x'.repeat(101) }],
    ['malformed email', { takerEmail: 'not-an-email' }],
    ['score above total', { score: 3 }],
    ['negative score', { score: -1 }],
    ['answers count not equal to total', { answers: [] }],
    ['total over 100', { total: 101 }],
    ['percent over 100', { percent: 101 }],
    ['client-chosen submittedAt', { submittedAt: new Date('2020-01-01') }],
    ['userAgent over 200 characters', { userAgent: 'x'.repeat(201) }],
  ];
  it.each(bad)('rejects %s', async (_name, overrides) => {
    await assertFails(setDoc(doc(anon(), 'attempts', 'a1'), validAttempt(overrides)));
  });

  it('rejects a missing field', async () => {
    const data = validAttempt();
    delete data.clientId;
    await assertFails(setDoc(doc(anon(), 'attempts', 'a1'), data));
  });

  it('rejects a document id longer than 64 characters', async () => {
    await assertFails(setDoc(doc(anon(), 'attempts', 'x'.repeat(65)), validAttempt()));
  });
});

describe('attempts: no changes after saving', () => {
  it('nobody can update or overwrite an attempt', async () => {
    await seed('a1');
    await assertFails(updateDoc(doc(anon(), 'attempts', 'a1'), { score: 2 }));
    await assertFails(setDoc(doc(anon(), 'attempts', 'a1'), validAttempt()));
    await assertFails(updateDoc(doc(dashboard(), 'attempts', 'a1'), { score: 2 }));
  });

  it('nobody can delete an attempt', async () => {
    await seed('a1');
    await assertFails(deleteDoc(doc(anon(), 'attempts', 'a1')));
    await assertFails(deleteDoc(doc(dashboard(), 'attempts', 'a1')));
  });
});

describe('attempts: read', () => {
  it('anonymous visitors cannot read attempts', async () => {
    await seed('a1');
    await assertFails(getDoc(doc(anon(), 'attempts', 'a1')));
    await assertFails(getDocs(collection(anon(), 'attempts')));
  });

  it('other signed-in users cannot read attempts', async () => {
    await seed('a1');
    await assertFails(getDoc(doc(otherUser(), 'attempts', 'a1')));
  });

  it('the dashboard account can read attempts', async () => {
    await seed('a1');
    await assertSucceeds(getDoc(doc(dashboard(), 'attempts', 'a1')));
    await assertSucceeds(getDocs(collection(dashboard(), 'attempts')));
  });
});

describe('other collections', () => {
  it('everything else is closed', async () => {
    await assertFails(setDoc(doc(anon(), 'other', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(dashboard(), 'other', 'x')));
  });
});
