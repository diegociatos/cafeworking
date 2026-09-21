const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { paginaDaUnidade } = require('./unidades-aprovadas.js');
const unidade = { publicacao_aprovada: true, id: 'un_teste', nome: 'CafeWorking Teste', bairro: 'Centro', cidade: 'Cidade/MG', endereco: 'Rua 1', descricao: 'Escritório com recepção para correspondências e ambiente de atendimento em localização central, próximo ao transporte público.', servicos: ['endereco_fiscal'], fotos: ['https://example.com/foto.jpg'] };
test('Página local única: somente dados aprovados com descrição suficiente', () => {
  assert.equal(paginaDaUnidade({ ...unidade, publicacao_aprovada: false }), null);
  assert.equal(paginaDaUnidade({ ...unidade, descricao: 'texto genérico' }), null);
  assert.equal(paginaDaUnidade({ ...unidade, bairro: '' }), null);
  const pagina = paginaDaUnidade(unidade);
  assert.equal(pagina.caminho, '/unidades/cidade-mg/centro-un-teste');
  assert.ok(pagina.html.includes(pagina.canonical));
  assert.ok(!pagina.html.includes('Sala privativa'));
});
test('Conteúdo público não executa HTML do parceiro', () => {
  const pagina = paginaDaUnidade({ ...unidade, nome: '<script>alert(1)</script>', fotos: ['javascript:alert(1)'] });
  assert.ok(!pagina.html.includes('<script>alert(1)</script>'));
  assert.ok(!pagina.html.includes('javascript:alert(1)'));
});
test('Proposta e FAQ sem enquadramento jurídico, percentual fixo ou promessa', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../seja-parceiro.html'), 'utf8');
  assert.ok(!/franquia|franqueado|\b75%|\b25%|\b10%/i.test(html));
  assert.doesNotMatch(html, /renda garantida|clientes garantidos/i);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.equal(schema['@type'], 'WebPage');
  assert.equal(schema.url, 'https://cafeworking.com.br/seja-parceiro');
  assert.ok(html.includes('id="parceiro-form"'));
});
