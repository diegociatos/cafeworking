const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../sw.js'), 'utf8');
test('pagamento, tokens e API nunca são interceptados pelo cache offline', () => {
  const eventos = {};
  vm.runInNewContext(source, { URL, self: { location: { origin:'https://cafeworking.com.br' }, addEventListener: (nome, fn) => { eventos[nome] = fn; } } });
  for (const rota of ['/pagamento?t=privado', '/pagamento.html', '/contratar', '/reservar-sala', '/api/lead-webhook', '/?r=reserva', '/?t=token']) {
    let interceptado = false;
    eventos.fetch({ request: {method:'GET', url:'https://cafeworking.com.br' + rota}, respondWith: () => { interceptado = true; } });
    assert.equal(interceptado, false, rota);
  }
});
