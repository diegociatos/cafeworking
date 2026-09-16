/**
 * Validação e máscara de CPF, CNPJ (inclusive o CNPJ alfanumérico da Receita,
 * que passa a ser emitido em 2026: 12 caracteres de A-Z/0-9 + 2 dígitos
 * verificadores) e telefone com DDD. Funciona no navegador (window.CWDocumento) e no Node
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

  /** Só os dígitos do telefone, sem o 55 do Brasil quando vier junto. */
  function digitosTelefone(valor) {
    var d = String(valor == null ? '' : valor).replace(/\D/g, '');
    if (/^55\d{10,11}$/.test(d)) d = d.slice(2);
    return d;
  }

  /**
   * Telefone brasileiro com DDD: celular (11 dígitos, começa com 9 depois do
   * DDD) ou fixo (10 dígitos). Vazio vale quando o campo é opcional.
   * { ok, valor: só dígitos, erro }
   */
  function validarTelefone(valor, obrigatorio) {
    var d = digitosTelefone(valor);
    if (!d) {
      return obrigatorio
        ? { ok: false, valor: d, erro: 'Informe o celular com DDD, ex.: (31) 99999-9999.' }
        : { ok: true, valor: d, erro: '' };
    }
    var ddd = /^[1-9][1-9]/.test(d);
    var celular = d.length === 11 && d[2] === '9';
    var fixo = d.length === 10 && /[2-5]/.test(d[2]);
    if (!ddd || !(celular || fixo) || todosIguais(d.slice(2))) {
      return { ok: false, valor: d, erro: 'Telefone inválido. Informe o DDD e o número, ex.: (31) 99999-9999.' };
    }
    return { ok: true, valor: d, erro: '' };
  }

  /** Máscara progressiva: (31) 3181-0140 ou (31) 99999-9999. */
  function mascararTelefone(valor) {
    var d = String(valor == null ? '' : valor).replace(/\D/g, '');
    if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2);
    d = d.slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    var meio = d.length === 11 ? 7 : 6;
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, meio) + (d.length > meio ? '-' + d.slice(meio) : '');
  }

  /* ---- ajuda de formulário (só no navegador) ---- */

  /** Mostra (ou limpa, com msg vazia) a mensagem de erro logo abaixo do campo. */
  function erroNoCampo(campo, msg) {
    if (!campo || typeof document === 'undefined') return;
    var id = (campo.form && campo.form.id ? campo.form.id + '-' : '') + campo.name + '-erro';
    var el = document.getElementById(id);
    if (!el && msg) {
      el = document.createElement('small');
      el.id = id;
      el.className = 'campo-erro';
      el.setAttribute('role', 'alert');
      campo.insertAdjacentElement('afterend', el);
      var desc = (campo.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (desc.indexOf(id) < 0) campo.setAttribute('aria-describedby', desc.concat(id).join(' '));
    }
    if (el) { el.textContent = msg || ''; el.hidden = !msg; }
    if (msg) campo.setAttribute('aria-invalid', 'true');
    else campo.removeAttribute('aria-invalid');
  }

  /**
   * Máscara enquanto digita e conferência ao sair do campo.
   * mascara(valor) → texto; validar(valor) → { ok, erro }.
   */
  function ligarCampo(campo, mascara, validar) {
    if (!campo) return;
    campo.addEventListener('input', function () {
      var noFim = campo.selectionStart === campo.value.length;
      var novo = mascara(campo.value);
      if (novo !== campo.value) {
        campo.value = novo;
        if (noFim && campo.setSelectionRange) campo.setSelectionRange(novo.length, novo.length);
      }
      // corrigiu: some o aviso na hora; o erro novo só aparece ao sair do campo
      if (campo.getAttribute('aria-invalid') === 'true' && validar(campo.value).ok) erroNoCampo(campo, '');
    });
    campo.addEventListener('blur', function () {
      if (!campo.value) { erroNoCampo(campo, ''); return; }
      var r = validar(campo.value);
      erroNoCampo(campo, r.ok ? '' : r.erro);
    });
  }

  return {
    normalizar: normalizar, cpfValido: cpfValido, cnpjValido: cnpjValido,
    validarDocumento: validarDocumento, mascararDocumento: mascararDocumento,
    digitosTelefone: digitosTelefone, validarTelefone: validarTelefone, mascararTelefone: mascararTelefone,
    erroNoCampo: erroNoCampo, ligarCampo: ligarCampo,
  };
});
