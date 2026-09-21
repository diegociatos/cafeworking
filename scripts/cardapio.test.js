const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');

test('página usa o cardápio público do app e mantém alternativa de contato', () => {
  const pagina = fs.readFileSync(path.join(raiz, 'cardapio.html'), 'utf8');
  const script = fs.readFileSync(path.join(raiz, 'assets/js/cardapio.js'), 'utf8');
  assert.match(pagina, /data-cardapio-produtos/);
  assert.match(pagina, /Pedir cardápio no WhatsApp/);
  assert.match(script, /functions\/v1\/cardapio-publico/);
  assert.match(script, /textContent = texto/);
  assert.doesNotMatch(script, /innerHTML/);
});

test('layout inclui o cardápio no menu da cafeteria', () => {
  const layout = fs.readFileSync(path.join(raiz, 'scripts/layout.js'), 'utf8');
  assert.match(layout, /href="\/cardapio"><b>Cardápio<\/b>/);
  assert.match(layout, /arq === 'cardapio\.html'/);
});
