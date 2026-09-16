// node --test scripts/validacao-documento.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../assets/js/validacao-documento.js');

test('CPF válido, com ou sem pontuação', () => {
  assert.equal(D.cpfValido('529.982.247-25'), true);
  assert.equal(D.cpfValido('52998224725'), true);
  assert.equal(D.cpfValido('111.444.777-35'), true);
});

test('CPF com dígito verificador errado, repetido ou tamanho errado', () => {
  assert.equal(D.cpfValido('529.982.247-26'), false);
  assert.equal(D.cpfValido('111.111.111-11'), false);
  assert.equal(D.cpfValido('5299822472'), false);
  assert.equal(D.cpfValido(''), false);
});

test('CNPJ numérico válido e inválido', () => {
  assert.equal(D.cnpjValido('20.351.761/0001-03'), true); // CAFEWORKING LTDA
  assert.equal(D.cnpjValido('11.222.333/0001-81'), true);
  assert.equal(D.cnpjValido('11.222.333/0001-80'), false);
  assert.equal(D.cnpjValido('00.000.000/0000-00'), false);
  assert.equal(D.cnpjValido('1122233300018'), false);
});

test('CNPJ alfanumérico (formato da Receita a partir de 2026)', () => {
  // exemplo publicado pela Receita Federal: 12.ABC.345/01DE-35
  assert.equal(D.cnpjValido('12.ABC.345/01DE-35'), true);
  assert.equal(D.cnpjValido('12abc34501de35'), true);
  assert.equal(D.cnpjValido('12.ABC.345/01DE-36'), false);
  // os dois últimos precisam ser números
  assert.equal(D.cnpjValido('12ABC34501DE3A'), false);
});

test('validarDocumento devolve tipo, valor limpo e mensagem clara', () => {
  assert.deepEqual(D.validarDocumento('529.982.247-25'), { ok: true, tipo: 'cpf', valor: '52998224725', erro: '' });
  assert.equal(D.validarDocumento('20351761000103').tipo, 'cnpj');
  assert.equal(D.validarDocumento('20351761000103').ok, true);
  assert.match(D.validarDocumento('529.982.247-00').erro, /CPF inválido/);
  assert.match(D.validarDocumento('20.351.761/0001-00').erro, /CNPJ inválido/);
  assert.match(D.validarDocumento('123').erro, /11 números.*14 caracteres/);
  assert.match(D.validarDocumento('').erro, /Informe/);
});

test('máscara progressiva de CPF e CNPJ', () => {
  assert.equal(D.mascararDocumento('529'), '529');
  assert.equal(D.mascararDocumento('5299'), '529.9');
  assert.equal(D.mascararDocumento('5299822'), '529.982.2');
  assert.equal(D.mascararDocumento('52998224725'), '529.982.247-25');
  assert.equal(D.mascararDocumento('203517610001'), '20.351.761/0001');
  assert.equal(D.mascararDocumento('20351761000103'), '20.351.761/0001-03');
  assert.equal(D.mascararDocumento('12abc34501de35'), '12.ABC.345/01DE-35');
  assert.equal(D.mascararDocumento('20.351.761/0001-039999'), '20.351.761/0001-03');
});

test('telefone: celular e fixo com DDD, com ou sem +55', () => {
  assert.equal(D.validarTelefone('(31) 99712-9789').ok, true);
  assert.equal(D.validarTelefone('3131810140').ok, true);
  assert.equal(D.validarTelefone('+55 31 99712-9789').valor, '31997129789');
});

test('telefone: sem DDD, DDD com zero, celular sem 9 ou repetido é inválido', () => {
  assert.equal(D.validarTelefone('99712-9789').ok, false);
  assert.equal(D.validarTelefone('(01) 99712-9789').ok, false);
  assert.equal(D.validarTelefone('(31) 89712-9789').ok, false);
  assert.equal(D.validarTelefone('(31) 99999-9999').ok, false);
});

test('telefone: vazio só vale quando o campo é opcional', () => {
  assert.equal(D.validarTelefone('').ok, true);
  assert.equal(D.validarTelefone('', true).ok, false);
});

test('máscara de telefone enquanto digita', () => {
  assert.equal(D.mascararTelefone('3'), '(3');
  assert.equal(D.mascararTelefone('3199'), '(31) 99');
  assert.equal(D.mascararTelefone('3131810140'), '(31) 3181-0140');
  assert.equal(D.mascararTelefone('31997129789'), '(31) 99712-9789');
  assert.equal(D.mascararTelefone('5531997129789'), '(31) 99712-9789');
});
