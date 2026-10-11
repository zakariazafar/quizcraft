const app = document.getElementById('app');
const h1 = document.createElement('h1');
h1.textContent = 'Page not found';
const a = document.createElement('a');
a.href = '/';
a.textContent = 'Go to the home page';
app.append(h1, a);
