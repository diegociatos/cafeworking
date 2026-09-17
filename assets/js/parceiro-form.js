/**
 * Formulário "Seja parceiro CafeWorking" (seja-parceiro.html).
 *
 * Envia o pedido para a Edge Function parceiro-candidatura do app, que grava a
 * candidatura e avisa a equipe. Protegido pelo Turnstile, como o restante da
 * loja. Antes do aceite, carrega o texto vigente do contrato de parceria
 * (contrato-vigente?categoria=parceria) para o visitante ler na própria página;
 * enquanto o contrato não for publicado, fica só o resumo do modelo.
 *
 * Depende de loja-config.js e validacao-documento.js.
 */
(function () {
  var TEMPO_TURNSTILE = 12000;
  var loja = window.CW_LOJA || {};
  var Documento = window.CWDocumento;
  var $ = function (id) { return document.getElementById(id); };
  var FN = (loja.supabaseUrl || '') + '/functions/v1/';
  var HEADERS = { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey };

  var form, contrato = null, token = '', widget, enviando = false;

  function whatsapp(texto) {
    return 'https://wa.me/' + (loja.whatsapp || '5531997129789') + '?text=' + encodeURIComponent(texto);
  }

  function erro(msg, html) {
    var el = $('parceiro-erro');
    if (!el) return;
    if (html) el.innerHTML = msg; else el.textContent = msg || '';
    el.hidden = !msg;
    if (msg) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function avisoTurnstile() {
    erro('A verificação de segurança não carregou. Recarregue a página (um bloqueador de anúncios pode estar impedindo) ou ' +
      '<a href="' + whatsapp('Olá! Quero ser parceiro do CafeWorking e o formulário do site não enviou.') + '" target="_blank" rel="noopener">fale com a gente pelo WhatsApp</a>.', true);
  }

  window.cwParceiroTurnstile = function () {
    var caixa = $('parceiro-turnstile');
    if (!caixa || widget !== undefined || !window.turnstile) return;
    widget = window.turnstile.render(caixa, {
      sitekey: loja.turnstileSiteKey,
      language: 'pt-br',
      callback: function (t) { token = t; erro(''); },
      'expired-callback': function () { token = ''; },
      'error-callback': function () { token = ''; avisoTurnstile(); },
    });
  };

  /** Texto vigente do contrato de parceria (some quando ainda não foi publicado). */
  function carregarContrato() {
    var caixa = $('parceiro-contrato');
    if (!caixa || !loja.supabaseUrl) return;
    fetch(FN + 'contrato-vigente?categoria=parceria', { headers: HEADERS })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok || !r.d.contrato) return;
        contrato = r.d.contrato;
        $('parceiro-contrato-titulo').textContent = 'Ler o contrato de parceria — ' + contrato.titulo + ' (versão ' + contrato.versao + ')';
        $('parceiro-contrato-texto').textContent = contrato.corpo;
        caixa.hidden = false;
        var resumo = $('parceiro-contrato-resumo');
        if (resumo) resumo.hidden = true;
      })
      .catch(function () { /* sem contrato publicado: fica o resumo da página */ });
  }

  function valor(nome) {
    var campo = form.elements[nome];
    return campo ? String(campo.value || '').trim() : '';
  }

  function servicos() {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="servicos"]:checked'))
      .map(function (c) { return c.value; });
  }

  function focar(nome) {
    if (form.elements[nome]) form.elements[nome].focus();
  }

  function enviar(e) {
    e.preventDefault();
    if (enviando) return;

    var doc = Documento ? Documento.validarDocumento(valor('documento')) : { ok: true, valor: valor('documento') };
    var tel = Documento ? Documento.validarTelefone(valor('whatsapp'), true) : { ok: true, valor: valor('whatsapp') };

    if (valor('escritorio').length < 2) return erro('Informe o nome do escritório.'), focar('escritorio');
    if (!doc.ok) return erro(doc.erro), focar('documento');
    if (valor('responsavel').length < 3) return erro('Informe o nome do responsável.'), focar('responsavel');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor('email'))) return erro('Informe um e-mail válido.'), focar('email');
    if (!tel.ok) return erro(tel.erro || 'Informe um WhatsApp com DDD.'), focar('whatsapp');
    if (valor('cidade').length < 2) return erro('Informe a cidade.'), focar('cidade');
    if (!valor('uf')) return erro('Escolha a UF.'), focar('uf');
    if (valor('endereco').length < 10) return erro('Informe o endereço completo, com número e bairro.'), focar('endereco');
    if (!servicos().length) return erro('Marque ao menos um serviço que você quer oferecer.'), focar('servicos');
    if (!form.elements.aceite.checked) return erro('Para continuar, aceite o contrato de parceria.'), form.elements.aceite.focus();
    if (!token) {
      if (!window.turnstile || widget === undefined) return avisoTurnstile();
      return erro('Aguarde a verificação de segurança terminar e tente de novo.');
    }
    if (!loja.supabaseUrl) return erro('Não foi possível enviar agora. Fale com a gente pelo WhatsApp.');

    enviando = true;
    var botao = $('parceiro-enviar');
    var textoBotao = botao ? botao.textContent : '';
    if (botao) { botao.disabled = true; botao.textContent = 'Enviando…'; }
    erro('');

    fetch(FN + 'parceiro-candidatura', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey },
      body: JSON.stringify({
        escritorio: valor('escritorio'),
        documento: doc.valor,
        responsavel: valor('responsavel'),
        email: valor('email'),
        whatsapp: tel.valor || valor('whatsapp'),
        cidade: valor('cidade'),
        uf: valor('uf'),
        endereco: valor('endereco'),
        servicos: servicos(),
        salas: Number(valor('salas') || 0),
        observacoes: valor('observacoes'),
        aceite: true,
        aceite_modelo: contrato ? contrato.id : undefined,
        aceite_hash: contrato ? contrato.hash : undefined,
        pagina: location.pathname,
        turnstile: token,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.d.error || 'Não foi possível enviar. Tente de novo.');
        if (window.cwTrack) window.cwTrack('generate_lead', { lead_type: 'parceiro', page_path: location.pathname });
        location.href = '/obrigado-parceiro';
      })
      .catch(function (err) {
        erro(err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Confira a internet e tente de novo.');
        token = '';
        if (window.turnstile && widget !== undefined) window.turnstile.reset(widget);
        enviando = false;
        if (botao) { botao.disabled = false; botao.textContent = textoBotao; }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    form = $('parceiro-form');
    if (!form) return;
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', enviar);
    if (Documento) {
      Documento.ligarCampo(form.elements.documento, Documento.mascararDocumento, Documento.validarDocumento);
      Documento.ligarCampo(form.elements.whatsapp, Documento.mascararTelefone, function (v) { return Documento.validarTelefone(v, true); });
    }
    carregarContrato();
    setTimeout(function () { if (!window.turnstile || widget === undefined) avisoTurnstile(); }, TEMPO_TURNSTILE);
    if (window.turnstile) window.cwParceiroTurnstile();
  });
})();
