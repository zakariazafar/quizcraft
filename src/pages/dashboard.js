import '../styles/fonts.js';
import { registerServiceWorker } from '../lib/registerServiceWorker.js';
import { readConfig } from '../lib/config.js';
import { createDashboardAuth } from '../lib/dashboardAuth.js';
import { resultEmailParams } from '../lib/email.js';
import { emailjsResultSender } from '../lib/emailClient.js';
import {
  createHiddenStore,
  prepareAttempts,
  questionStats,
  quizRows,
  summarise,
} from '../lib/dashboardData.js';
import {
  answersToCsv,
  attemptsToCsv,
  attemptsToJson,
  downloadFile,
  exportFileName,
} from '../lib/exportData.js';
import { fetchAllAttempts } from '../lib/firebase.js';
import { authApi, getAuthClient } from '../lib/firebaseAuth.js';
import { loadQuiz } from '../lib/quizLoader.js';
import { scoreQuiz } from '../lib/scoring.js';
import {
  renderDashboardMessage,
  renderQuizDetail,
  renderQuizList,
  renderShell,
  renderSignIn,
  renderSkeleton,
} from '../lib/render/dashboardViews.js';
import { copyText, quizUrl } from '../lib/share.js';

if (import.meta.env.PROD) registerServiceWorker(navigator);

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
const config = readConfig(import.meta.env);

/** @returns {Storage | null} */
function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const hiddenStore = createHiddenStore(safeStorage());
const emailSender = config.emailConfigured ? emailjsResultSender(config) : null;

/** @type {{ index: any[], quizzes: Map<string, any>, attempts: any[], loadedAt: Date | null }} */
const data = { index: [], quizzes: new Map(), attempts: [], loadedAt: null };
let dashboardAuth = null;

/** @param {HTMLElement} view */
function show(view) {
  app.replaceChildren(view);
  const heading = view.querySelector('h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

/** @param {string} quizId */
async function share(quizId) {
  const url = quizUrl(config.siteUrl, window.location.origin, quizId);
  return { url, result: await copyText(url, navigator.clipboard) };
}

/** @param {import('../lib/dashboardData.js').CheckedAttempt} attempt */
async function emailResult(attempt) {
  if (!emailSender) return false;
  const quiz = data.quizzes.get(attempt.quizId);
  if (!quiz) return false;
  const answers = Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selected]));
  const scored = scoreQuiz(quiz, answers);
  try {
    await emailSender(
      resultEmailParams(quiz, { name: attempt.takerName, email: attempt.takerEmail }, scored),
    );
    return true;
  } catch {
    return false;
  }
}

async function loadData() {
  const indexRes = await fetch('/quizzes/index.json');
  data.index = indexRes.ok ? await indexRes.json() : [];
  const loaded = await Promise.all(data.index.map((e) => loadQuiz(e.id, (u) => fetch(u))));
  data.quizzes = new Map(
    loaded
      .filter((r) => r.status === 'ok' || r.status === 'closed')
      .map((r) => [r.quiz.id, r.quiz]),
  );
  data.attempts = prepareAttempts(await fetchAllAttempts(config), data.quizzes);
  data.loadedAt = new Date();
}

function shell(content) {
  const time = data.loadedAt
    ? `Updated ${data.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';
  return renderShell(content, {
    status: time,
    onRefresh: () => refresh(),
    onSignOut: () => dashboardAuth.signOut(),
  });
}

function route() {
  const m = window.location.hash.match(/^#\/quiz\/([a-z0-9-]+)$/);
  if (!m) {
    document.title = 'Results | QuizCraft';
    show(
      shell(
        renderQuizList(quizRows(data.index, data.attempts), {
          onOpen: (id) => {
            window.location.hash = `#/quiz/${id}`;
          },
          share,
        }),
      ),
    );
    return;
  }
  const id = m[1];
  const quiz = data.quizzes.get(id);
  const row = quizRows(data.index, data.attempts).find((r) => r.id === id);
  if (!quiz || !row) {
    show(
      shell(
        renderDashboardMessage(
          'Quiz not found',
          'This quiz is no longer published, so its questions can’t be shown. Go back to all quizzes.',
        ),
      ),
    );
    return;
  }
  document.title = `${quiz.title} | Results | QuizCraft`;
  const attempts = data.attempts.filter((a) => a.quizId === id);
  show(
    shell(
      renderQuizDetail(
        {
          quiz,
          row,
          attempts,
          summary: summarise(attempts),
          stats: questionStats(quiz, attempts),
          hidden: hiddenStore.all(),
        },
        {
          share,
          onToggleHidden: (aid) => (hiddenStore.toggle(aid), hiddenStore.all()),
          onEmailResult: emailSender ? emailResult : undefined,
          onExport: (format, shown) => {
            if (format === 'json') {
              downloadFile(
                exportFileName(id, 'attempts', 'json'),
                attemptsToJson(shown),
                'application/json',
              );
            } else if (format === 'answers') {
              downloadFile(
                exportFileName(id, 'answers', 'csv'),
                answersToCsv(shown, quiz),
                'text/csv;charset=utf-8',
              );
            } else {
              downloadFile(
                exportFileName(id, 'attempts', 'csv'),
                attemptsToCsv(shown),
                'text/csv;charset=utf-8',
              );
            }
          },
        },
      ),
    ),
  );
}

async function refresh() {
  show(shell(renderDashboardMessage('Loading results…', 'Fetching quizzes and attempts.')));
  try {
    await loadData();
    route();
  } catch (err) {
    const denied = err && err.code === 'permission-denied';
    show(
      shell(
        renderDashboardMessage(
          'Results could not be loaded',
          denied
            ? 'This account is not allowed to read results. Check that the dashboard UID in firestore.rules matches the dashboard account.'
            : 'Check your connection, then press Refresh.',
        ),
      ),
    );
  }
}

function showSignIn() {
  document.title = 'Sign in | QuizCraft';
  const form = renderSignIn({
    onSubmit: async (password) => {
      form.setError('');
      form.setBusy(true);
      const result = await dashboardAuth.signIn(password);
      form.setBusy(false);
      if (!result.ok) form.setError(result.message);
    },
  });
  show(form.view);
}

function main() {
  if (!config.configured) {
    show(
      renderDashboardMessage(
        'Dashboard not set up',
        'Firebase settings are missing. Add the VITE_FIREBASE_* values (see README → Deployment) and rebuild the site.',
      ),
    );
    return;
  }
  show(renderSkeleton());
  dashboardAuth = createDashboardAuth({
    auth: getAuthClient(config),
    email: config.dashboardEmail,
    api: authApi,
  });
  window.addEventListener('hashchange', () => {
    if (data.loadedAt) route();
  });
  dashboardAuth.onChange((signedIn) => {
    if (signedIn) refresh();
    else showSignIn();
  });
}

main();
