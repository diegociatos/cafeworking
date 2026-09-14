// node --test scripts/
const test = require('node:test');
const assert = require('node:assert/strict');
const { escapar, precoBRL, beneficiosDoPlano, cardPlano, renderVitrine } = require('../assets/js/cards-plano.js');

const pro = {
  id: 'pl_pro', unidade_id: 'un_lux', nome: 'Fiscal Pro', preco: 149, precoAnual: 1609.2, descontoAnualPct: 10,
  recorrencia: 'mensal', categoria: 'endereco_fiscal', prazoMinimoMeses: 6, sobConsulta: false,
  destaque: 'Mais procurado', beneficios: ['Endereço para CNPJ', 'Digitalização inclusa'], ordem: 1, direitos: {},
};

test('escapar não deixa texto do app virar HTML', () => {
  assert.equal(escapar('<b>"A" & B</b>'), '&lt;b&gt;&quot;A&quot; &amp; B&lt;/b&gt;');
  assert.equal(escapar(null), '');
});

test('preço em reais sem centavos quando inteiro', () => {
  assert.equal(precoBRL(149), 'R$ 149');
  assert.equal(precoBRL(1609.2), 'R$ 1.609,20');
  assert.equal(precoBRL(119.9), 'R$ 119,90');
});

test('benefícios: usa a lista do app; sem lista, monta pelos direitos e pela fidelidade', () => {
  assert.deepEqual(beneficiosDoPlano(pro), ['Endereço para CNPJ', 'Digitalização inclusa', 'Fidelidade de 6 meses no mensal']);
  const semLista = { ...pro, beneficios: [], direitos: { horasReuniao: 2, correspondencias: 10 }, prazoMinimoMeses: 0 };
  assert.deepEqual(beneficiosDoPlano(semLista), ['2h/mês de sala de reunião', '10 correspondências/mês']);
});

test('card do plano mensal leva para a contratação com plano e unidade', () => {
  const html = cardPlano(pro);
  assert.match(html, /class="fiscal-card featured"/);
  assert.match(html, /<span>Mais procurado<\/span>/);
  assert.match(html, /R\$ 149<span>\/mês<\/span>/);
  assert.match(html, /href="\/contratar\?plano=pl_pro&amp;unidade=un_lux"/);
  assert.match(html, />Quero este plano</);
  assert.match(html, /R\$ 1\.609,20/);
  assert.doesNotMatch(html, /wa\.me/);
});

test('card sob consulta pede proposta e não mostra preço', () => {
  const html = cardPlano({ ...pro, sobConsulta: true, preco: null, precoAnual: null, destaque: null }, { whatsapp: '5531997129789' });
  assert.match(html, /Sob consulta/);
  assert.match(html, /Pedir proposta/);
  assert.match(html, /https:\/\/wa\.me\/5531997129789\?text=/);
  assert.doesNotMatch(html, /contratar\?/);
  assert.doesNotMatch(html, /class="fiscal-card featured"/);
});

test('vitrine: só a categoria pedida; vazio quando não há plano (a página mantém o conteúdo atual)', () => {
  const dados = { unidades: [{ id: 'un_lux', nome: 'Luxemburgo' }], planos: [pro, { ...pro, id: 'cw', categoria: 'coworking' }] };
  const html = renderVitrine(dados, 'endereco_fiscal');
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.equal(renderVitrine(dados, 'sala_privativa'), '');
  assert.equal(renderVitrine(null, 'endereco_fiscal'), '');
});

test('vitrine com mais de uma unidade mostra abas e só a primeira aberta', () => {
  const dados = {
    unidades: [{ id: 'un_est', nome: 'Estoril' }, { id: 'un_lux', nome: 'Luxemburgo' }],
    planos: [pro, { ...pro, id: 'pl_est', unidade_id: 'un_est' }],
  };
  const html = renderVitrine(dados, 'endereco_fiscal');
  assert.match(html, /data-vitrine-aba="un_est"[^>]*aria-selected="true"/);
  assert.match(html, /data-vitrine-unidade="un_lux" hidden/);
  assert.doesNotMatch(html, /data-vitrine-unidade="un_est" hidden/);
});
