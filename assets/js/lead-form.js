/**
 * Formulários de contato, visita, diagnóstico e landing pages: enviam o pedido
 * para o CRM do app (Edge Function lead-site), no mesmo padrão do pedido de
 * proposta de contratar.js.
 *
 * Marcação: <form class="form cw-lead-form" data-lead-site data-lead-tipo="contato">
 *   campos name="nome|empresa|telefone|email|mensagem" (+ qualquer select/input
 *   extra, que entra no texto da mensagem com o rótulo do campo),
 *   <div data-turnstile class="loja-turnstile"></div>,
 *   <p class="cw-form-status erro" role="alert" hidden></p> e o botão submit.
 *
 * Página: loja-config.js + este arquivo + Turnstile com
 *   api.js?render=explicit&onload=cwLeadTurnstile
 */
(function () {
  var TEMPO_TURNSTILE = 12000;
  var forms = [];

  function loja() { return window.CW_LOJA || {}; }

  function whatsapp(texto) {
    return 'https://wa.me/' + (loja().whatsapp || '5531997129789') + '?text=' + encodeURIComponent(texto);
  }

  function status(form, msg, html) {
    var el = form.querySelector('.cw-form-status');
    if (!el) return;
    if (html) el.innerHTML = msg; else el.textContent = msg || '';
    el.hidden = !msg;
  }

  function avisoTurnstile(form) {
    status(form, 'A verificação de segurança não carregou. Recarregue a página (um bloqueador de anúncios pode estar impedindo) ou ' +
      '<a href="' + whatsapp('Olá! Tentei enviar o formulário do site do CafeWorking e não consegui.') + '" target="_blank" rel="noopener">fale com a gente pelo WhatsApp</a>.', true);
  }

  function renderizar(form) {
    var caixa = form.querySelector('[data-turnstile]');
    if (!caixa || form._widget !== undefined || !window.turnstile) return;
    form._widget = window.turnstile.render(caixa, {
      sitekey: loja().turnstileSiteKey,
      language: 'pt-br',
      callback: function (t) { form._token = t; if (/verificação de segurança/.test(form.querySelector('.cw-form-status').textContent)) status(form, ''); },
      'expired-callback': function () { form._token = ''; },
      'error-callback': function () { form._token = ''; avisoTurnstile(form); },
    });
  }

  window.cwLeadTurnstile = function () { forms.forEach(renderizar); };

  function rotulo(campo) {
    var label = campo.closest('label');
    if (!label) return campo.name;
    return (label.childNodes[0] && label.childNodes[0].textContent || campo.name).trim();
  }

  function enviar(form, e) {
    e.preventDefault();
    if (form._enviando) return;
    var cfg = loja();
    var val = function (n) { return form.elements[n] ? String(form.elements[n].value || '').trim() : ''; };
    var d = { nome: val('nome'), empresa: val('empresa'), telefone: val('telefone'), email: val('email') };
    var foco = function (n) { if (form.elements[n]) form.elements[n].focus(); };

    if (d.nome.length < 3) return status(form, 'Informe seu nome.'), foco('nome');
    if (d.telefone.replace(/\D/g, '').length < 10) return status(form, 'Informe um celular com DDD.'), foco('telefone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return status(form, 'Informe um e-mail válido.'), foco('email');
    var obrigatorio = Array.prototype.filter.call(form.querySelectorAll('select[required]'), function (s) { return !s.value; })[0];
    if (obrigatorio) return status(form, 'Escolha uma opção em "' + rotulo(obrigatorio) + '".'), obrigatorio.focus();
    if (!form._token) {
      if (!window.turnstile || form._widget === undefined) return avisoTurnstile(form);
      return status(form, 'Aguarde a verificação de segurança terminar e tente de novo.');
    }
    if (!cfg.supabaseUrl) return status(form, 'Não foi possível enviar agora. Fale com a gente pelo WhatsApp.');

    // campos extras (interesse, melhor horário...) vão no texto da mensagem, com o rótulo
    var linhas = [];
    Array.prototype.forEach.call(form.querySelectorAll('select, input:not([type="hidden"])'), function (c) {
      if (['nome', 'empresa', 'telefone', 'email'].indexOf(c.name) >= 0 || !c.name || !String(c.value).trim()) return;
      linhas.push(rotulo(c) + ': ' + String(c.value).trim());
    });
    if (val('mensagem')) linhas.push(val('mensagem'));

    form._enviando = true;
    var botao = form.querySelector('[type="submit"]');
    var textoBotao = botao ? botao.textContent : '';
    if (botao) { botao.disabled = true; botao.textContent = 'Enviando…'; }
    status(form, '');

    var tipo = form.getAttribute('data-lead-tipo') || 'contato';
    fetch(cfg.supabaseUrl + '/functions/v1/lead-site', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: cfg.anonKey, authorization: 'Bearer ' + cfg.anonKey },
      body: JSON.stringify({
        nome: d.nome, empresa: d.empresa, telefone: d.telefone, email: d.email,
        mensagem: linhas.join('\n').slice(0, 1500),
        unidade_id: cfg.unidadePrincipal,
        pagina: location.pathname + ' (' + tipo + ')',
        turnstile: form._token,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { return { ok: r.ok, x: x }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.x.error || 'Não foi possível enviar. Tente de novo.');
        if (window.cwTrack) window.cwTrack('generate_lead', { lead_type: tipo, page_path: location.pathname });
        var ok = document.createElement('div');
        ok.className = 'cw-lead-sucesso';
        ok.setAttribute('role', 'status');
        ok.innerHTML = '<h2>Pedido recebido</h2><p>A equipe do CafeWorking vai responder em até 1 dia útil, pelo WhatsApp ou pelo e-mail informado.</p>' +
          '<p>Se preferir adiantar, veja os <a class="link" href="/planos">planos e preços</a>.</p>';
        form.replaceWith(ok);
        ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (err) {
        status(form, err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Confira a internet e tente de novo.');
        form._token = '';
        if (window.turnstile && form._widget !== undefined) window.turnstile.reset(form._widget);
        form._enviando = false;
        if (botao) { botao.disabled = false; botao.textContent = textoBotao; }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    forms = Array.prototype.slice.call(document.querySelectorAll('form[data-lead-site]'));
    forms.forEach(function (form) {
      form.setAttribute('novalidate', '');
      form.addEventListener('submit', function (e) { enviar(form, e); });
      setTimeout(function () { if (!window.turnstile || form._widget === undefined) avisoTurnstile(form); }, TEMPO_TURNSTILE);
    });
    // o Turnstile pode ter carregado antes deste arquivo
    if (window.turnstile) window.cwLeadTurnstile();
  });
})();
