// node --test scripts/
const test = require('node:test');
const assert = require('node:assert/strict');
const { aplicarVitrine } = require('./vitrine.js');

const pagina = `<main><h2>Planos</h2>
<div class="vitrine" data-vitrine="endereco_fiscal"><!-- vitrine:endereco_fiscal -->
<div class="fiscal-pricing"><article class="fiscal-card">Fiscal Básico (WhatsApp)</article></div>
<!-- /vitrine --></div>
</main>`;

const catalogo = {
  unidades: [{ id: 'un_lux', nome: 'Luxemburgo' }],
  planos: [{
    id: 'pl_pro', unidade_id: 'un_lux', nome: 'Fiscal Pro', preco: 149, precoAnual: 1609.2, descontoAnualPct: 10,
    recorrencia: 'mensal', categoria: 'endereco_fiscal', prazoMinimoMeses: 0, sobConsulta: false,
    destaque: null, beneficios: ['Endereço para CNPJ'], ordem: 1, direitos: {},
  }],
};

test('troca o conteúdo entre os marcadores pelos cards do app', () => {
  const { html, trocados } = aplicarVitrine(pagina, catalogo);
  assert.equal(trocados, 1);
  assert.match(html, /Fiscal Pro/);
  assert.doesNotMatch(html, /Fiscal Básico \(WhatsApp\)/);
  assert.match(html, /<!-- vitrine:endereco_fiscal -->/);
  assert.match(html, /<!-- \/vitrine -->/);
});

test('rodar duas vezes dá o mesmo resultado', () => {
  const uma = aplicarVitrine(pagina, catalogo).html;
  assert.equal(aplicarVitrine(uma, catalogo).html, uma);
});

test('sem plano da categoria ou sem catálogo, mantém o conteúdo atual', () => {
  const vazio = { unidades: [], planos: [] };
  assert.equal(aplicarVitrine(pagina, vazio).html, pagina);
  assert.equal(aplicarVitrine(pagina, vazio).trocados, 0);
  assert.equal(aplicarVitrine(pagina, null).html, pagina);
});

test('página sem marcador não muda', () => {
  const outra = '<main><p>Sem vitrine</p></main>';
  assert.equal(aplicarVitrine(outra, catalogo).html, outra);
});
