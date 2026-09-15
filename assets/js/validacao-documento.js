/**
 * Validação e máscara de CPF e CNPJ (inclusive o CNPJ alfanumérico da Receita,
 * que passa a ser emitido em 2026: 12 caracteres de A-Z/0-9 + 2 dígitos
 * verificadores). Funciona no navegador (window.CWDocumento) e no Node
 * (scripts/validacao-documento.test.js).
 */
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.CWDocumento = api;
})(typeof self !== 'undefined' ? self : this, function () {
  /** Mantém só 0-9 e A-Z (maiúsculo). */
  function normalizar(valor) {
    return String(valor == null ? '' : valor).toUpperCase().replace(/[^0-9A-Z]/g, '');
  }

  function todosIguais(s) {
    return /^(.)\1+$/.test(s);
  }

  function cpfValido(valor) {
    var d = normalizar(valor);
    if (!/^\d{11}$/.test(d) || todosIguais(d)) return false;
    for (var t = 9; t < 11; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
      var dv = (soma * 10) % 11 % 10;
      if (dv !== Number(d[t])) return false;
    }
    return true;
  }

  // valor de cada caractere no cálculo do CNPJ: código ASCII - 48 (0-9 = 0-9, A = 17 ... Z = 42)
  function valorCaractere(c) {
    return c.charCodeAt(0) - 48;
  }

  function cnpjValido(valor) {
    var d = normalizar(valor);
    if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || todosIguais(d)) return false;
    var pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (var t = 12; t < 14; t++) {
      var soma = 0;
      var inicio = t === 12 ? 1 : 0;
      for (var i = 0; i < t; i++) soma += valorCaractere(d[i]) * pesos[i + inicio];
      var resto = soma % 11;
      var dv = resto < 2 ? 0 : 11 - resto;
      if (dv !== Number(d[t])) return false;
    }
    return true;
  }

  /**
   * { ok, tipo: 'cpf' | 'cnpj' | '', valor: só caracteres válidos, erro: mensagem para o cliente }
   */
  function validarDocumento(valor) {
    var d = normalizar(valor);
    if (!d) return { ok: false, tipo: '', valor: d, erro: 'Informe o CPF ou o CNPJ.' };
    if (/^\d{11}$/.test(d)) {
      return cpfValido(d)
        ? { ok: true, tipo: 'cpf', valor: d, erro: '' }
        : { ok: false, tipo: 'cpf', valor: d, erro: 'CPF inválido. Confira os 11 números.' };
    }
    if (d.length === 14) {
      return cnpjValido(d)
        ? { ok: true, tipo: 'cnpj', valor: d, erro: '' }
        : { ok: false, tipo: 'cnpj', valor: d, erro: 'CNPJ inválido. Confira os 14 caracteres.' };
    }
    return { ok: false, tipo: '', valor: d, erro: 'Informe um CPF (11 números) ou um CNPJ (14 caracteres).' };
  }

  /** Máscara progressiva: até 11 números vira CPF; acima disso, CNPJ. */
  function mascararDocumento(valor) {
    var d = normalizar(valor).slice(0, 14);
    var cpf = /^\d*$/.test(d) && d.length <= 11;
    if (cpf) {
      return d.replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    }
    return d.replace(/^(\w{2})(\w)/, '$1.$2')
      .replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3')
      .replace(/^(\w{2})\.(\w{3})\.(\w{3})(\w)/, '$1.$2.$3/$4')
      .replace(/\/(\w{4})(\w{1,2})$/, '/$1-$2');
  }

  return {
    normalizar: normalizar, cpfValido: cpfValido, cnpjValido: cnpjValido,
    validarDocumento: validarDocumento, mascararDocumento: mascararDocumento,
  };
});
