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

test('nome da unidade sem a marca repetida', () => {
  const { nomeUnidade } = require('../assets/js/cards-plano.js');
  assert.equal(nomeUnidade('CafeWorkingLuxemburgo'), 'Luxemburgo');
  assert.equal(nomeUnidade('CafeWorking Estoril'), 'Estoril');
  assert.equal(nomeUnidade('Estoril'), 'Estoril');
  assert.equal(nomeUnidade('CafeWorking'), 'CafeWorking');
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

test('sala privativa oferece contratar e agendar visita', () => {
  const html = cardPlano({ ...pro, id: 'pl_sp4', categoria: 'sala_privativa', destaque: null });
  assert.match(html, />Quero este plano</);
  assert.match(html, /href="\/contratar\?plano=pl_sp4&amp;unidade=un_lux&amp;visita=1"[^>]*>Agendar visita</);
  assert.doesNotMatch(cardPlano(pro), /Agendar visita/);
});

test('card sob consulta pede proposta pelo formulário e não mostra preço', () => {
  const html = cardPlano({ ...pro, sobConsulta: true, preco: null, precoAnual: null, destaque: null });
  assert.match(html, /Sob consulta/);
  assert.match(html, />Pedir proposta</);
  assert.match(html, /href="\/contratar\?plano=pl_pro&amp;unidade=un_lux"/);
  assert.doesNotMatch(html, /wa\.me/);
  assert.doesNotMatch(html, /Quero este plano/);
  assert.doesNotMatch(html, /class="fiscal-card featured"/);
});

test('vitrine: só a categoria pedida; vazio quando não há plano (a página mantém o conteúdo atual)', () => {
  const dados = { unidades: [{ id: 'un_lux', nome: 'Luxemburgo' }], planos: [pro, { ...pro, id: 'cw', categoria: 'coworking' }] };
  const html = renderVitrine(dados, 'endereco_fiscal');
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.equal(renderVitrine(dados, 'sala_privativa'), '');
  assert.equal(renderVitrine(null, 'endereco_fiscal'), '');
});

test('vitrine abre na unidade escolhida; sem escolha, na principal', () => {
  const dados = {
    unidades: [{ id: 'un_est', nome: 'CafeWorkingEstoril' }, { id: 'un_lux', nome: 'CafeWorkingLuxemburgo' }],
    planos: [pro, { ...pro, id: 'pl_est', unidade_id: 'un_est' }],
  };
  const principal = renderVitrine(dados, 'endereco_fiscal', { principal: 'un_lux' });
  assert.match(principal, /^<div class="vitrine-abas"[^>]*><button[^>]*data-vitrine-aba="un_lux"[^>]*aria-selected="true">Luxemburgo</);
  assert.match(principal, /data-vitrine-unidade="un_est" hidden/);
  const escolhida = renderVitrine(dados, 'endereco_fiscal', { principal: 'un_lux', escolhida: 'un_est' });
  assert.match(escolhida, /data-vitrine-aba="un_est"[^>]*aria-selected="true"/);
  assert.match(escolhida, /data-vitrine-unidade="un_lux" hidden/);
  const invalida = renderVitrine(dados, 'endereco_fiscal', { principal: 'un_lux', escolhida: 'un_xyz' });
  assert.match(invalida, /data-vitrine-aba="un_lux"[^>]*aria-selected="true"/);
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

test('sala privativa ocupada não vende: só fila de visita', () => {
  const sala = { ...pro, id: 'pl_sala4', nome: 'Sala privativa 4 pessoas', categoria: 'sala_privativa', capacidade: 4, precoAnual: null };
  const ocupada = cardPlano({ ...sala, disponiveis: 0 });
  assert.match(ocupada, /Ocupada/);
  assert.doesNotMatch(ocupada, /Quero este plano/);
  assert.match(ocupada, /visita=1/);

  const livres = cardPlano({ ...sala, disponiveis: 3 });
  assert.match(livres, /3 salas disponíveis/);
  assert.match(livres, /Quero este plano/);
  assert.match(cardPlano({ ...sala, disponiveis: 1 }), /Última sala disponível/);
  assert.doesNotMatch(cardPlano({ ...sala, disponiveis: null }), /disponíve|Ocupada/);
});