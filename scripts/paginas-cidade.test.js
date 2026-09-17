// node --test scripts/paginas-cidade.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { partesDaCidade, slugDaCidade, cidadesDoCatalogo, paginaDaCidade } = require('./paginas-cidade.js');

const plano = (id, unidade, extra = {}) => ({
  id, unidade_id: unidade, nome: 'Endereço Fiscal', preco: 149, precoAnual: 1609.2, descontoAnualPct: 10,
  recorrencia: 'mensal', categoria: 'endereco_fiscal', prazoMinimoMeses: 6, sobConsulta: false,
  destaque: null, beneficios: ['Endereço para CNPJ'], ordem: 1, direitos: {}, ...extra,
});

const catalogo = {
  unidades: [
    { id: 'un_lux', nome: 'CafeWorkingLuxemburgo', cidade: 'Belo Horizonte/MG' },
    { id: 'un_est', nome: 'CafeWorking Estoril', cidade: 'Belo Horizonte/MG' },
    { id: 'un_udi', nome: 'CafeWorking Uberlândia', cidade: 'Uberlândia/MG' },
    { id: 'un_sem', nome: 'CafeWorking Sem Cidade', cidade: '' },
    { id: 'un_cow', nome: 'CafeWorking Só Coworking', cidade: 'Contagem/MG' },
  ],
  planos: [
    plano('pl_nac_fiscal', 'un_lux'),
    plano('pl_nac_fiscal', 'un_est', { preco: 189 }),
    plano('pl_nac_fiscal', 'un_udi', { preco: 129 }),
    plano('pl_nac_fiscal', 'un_sem'),
    plano('pl_cow', 'un_cow', { categoria: 'coworking' }),
  ],
};
const enderecos = { un_lux: 'Rua Guaicuí, 715, Luxemburgo', un_est: 'Av. Raja Gabaglia, 2000', un_udi: 'Av. Rondon Pacheco, 100' };

test('cidade com UF, sem UF e com traço', () => {
  assert.deepEqual(partesDaCidade('Belo Horizonte/MG'), { nome: 'Belo Horizonte', uf: 'MG' });
  assert.deepEqual(partesDaCidade(' Uberlândia - mg '), { nome: 'Uberlândia', uf: 'MG' });
  assert.deepEqual(partesDaCidade('Contagem'), { nome: 'Contagem', uf: '' });
  assert.deepEqual(partesDaCidade(''), { nome: '', uf: '' });
});

test('slug vira endereço da página', () => {
  assert.equal(slugDaCidade('Belo Horizonte', 'MG'), 'belo-horizonte-mg');
  assert.equal(slugDaCidade('São João del Rei', 'mg'), 'sao-joao-del-rei-mg');
  assert.equal(slugDaCidade('Contagem', ''), 'contagem');
});

test('agrupa unidades por cidade e ignora quem não vende endereço fiscal', () => {
  const cidades = cidadesDoCatalogo(catalogo, enderecos);
  assert.deepEqual(cidades.map((c) => c.slug), ['belo-horizonte-mg', 'uberlandia-mg']);
  const bh = cidades[0];
  assert.equal(bh.unidades.length, 2);
  assert.equal(bh.precoMinimo, 149); // o menor preço da cidade vai para o texto
  assert.equal(bh.unidades[0].endereco, 'Rua Guaicuí, 715, Luxemburgo');
});

test('sem catálogo ou sem plano da categoria, não gera cidade nenhuma', () => {
  assert.deepEqual(cidadesDoCatalogo(null), []);
  assert.deepEqual(cidadesDoCatalogo({ unidades: [], planos: [] }), []);
  assert.deepEqual(cidadesDoCatalogo({ unidades: catalogo.unidades, planos: [plano('pl_cow', 'un_cow', { categoria: 'coworking' })] }), []);
});

test('plano sob consulta não vira página de cidade', () => {
  const so = { unidades: [catalogo.unidades[2]], planos: [plano('pl_nac_fiscal', 'un_udi', { sobConsulta: true })] };
  assert.deepEqual(cidadesDoCatalogo(so), []);
});

const moldura = { cabecalho: '<header class="nav"><a href="/"><img src="/assets/img/logo.webp" alt=""></a></header>', rodape: '<footer class="footer"></footer></body></html>' };

test('a página tem canonical, preço, endereço e link de contratar com a unidade', () => {
  const [bh] = cidadesDoCatalogo(catalogo, enderecos);
  const html = paginaDaCidade(bh, moldura);
  assert.match(html, /<link rel="canonical" href="https:\/\/cafeworking\.com\.br\/endereco-fiscal\/belo-horizonte-mg">/);
  assert.match(html, /Endereço fiscal em Belo Horizonte\/MG/);
  assert.match(html, /R\$ 149/);
  assert.match(html, /Rua Guaicuí, 715, Luxemburgo/);
  assert.match(html, /href="\/contratar\?plano=pl_nac_fiscal&amp;unidade=un_lux"/);
  assert.match(html, /href="\/contratar\?plano=pl_nac_fiscal&amp;unidade=un_est"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /name="robots" content="index,follow/);
});

test('os caminhos da página em subpasta são absolutos', () => {
  const [, udi] = cidadesDoCatalogo(catalogo, enderecos);
  const html = paginaDaCidade(udi, moldura);
  assert.match(html, /href="\/assets\/css\/style\.css"/);
  assert.doesNotMatch(html, /(src|href)="assets\//);
});

test('gerar duas vezes dá o mesmo HTML', () => {
  const [bh] = cidadesDoCatalogo(catalogo, enderecos);
  assert.equal(paginaDaCidade(bh, moldura), paginaDaCidade(bh, moldura));
});
