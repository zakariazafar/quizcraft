const app = document.getElementById('app');
const h1 = document.createElement('h1');
h1.textContent = 'QuizCraft';
const p = document.createElement('p');
p.textContent = 'Quizzes are shared by link. Quiz owners can open the dashboard.';
const a = document.createElement('a');
a.href = '/dashboard';
a.textContent = 'Open dashboard';
app.append(h1, p, a);
