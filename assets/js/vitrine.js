/**
 * Vitrine ao vivo: confere no app do CafeWorking os planos da categoria e
 * troca os cards gravados na publicação se algo mudou (preço, plano novo).
 * Se o app não responder, fica o que já está na página.
 *
 * Com mais de uma unidade, os cards vêm em abas. A unidade escolhida fica
 * guardada no navegador e abre primeiro nas outras páginas.
 *
 * Uso: <div class="vitrine" data-vitrine="endereco_fiscal">...</div>
 * Depende de loja-config.js e cards-plano.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var blocos = document.querySelectorAll('[data-vitrine]');
  if (!loja || !Cards || !blocos.length) return;

  var CHAVE = 'cw_unidade';
  var lerEscolha = function () {
    var daUrl = new URLSearchParams(location.search).get('unidade');
    if (daUrl) return daUrl;
    try { return localStorage.getItem(CHAVE) || ''; } catch (_) { return ''; }
  };
  var guardarEscolha = function (id) {
    try { localStorage.setItem(CHAVE, id); } catch (_) { /* navegador sem storage */ }
  };

  function mostrarUnidade(bloco, id) {
    var aba = bloco.querySelector('[data-vitrine-aba="' + id + '"]');
    if (!aba) return false;
    bloco.querySelectorAll('[data-vitrine-aba]').forEach(function (b) { b.setAttribute('aria-selected', String(b === aba)); });
    bloco.querySelectorAll('[data-vitrine-unidade]').forEach(function (g) { g.hidden = g.getAttribute('data-vitrine-unidade') !== id; });
    return true;
  }

  blocos.forEach(function (bloco) {
    bloco.addEventListener('click', function (e) {
      var aba = e.target.closest('[data-vitrine-aba]');
      if (!aba) return;
      var id = aba.getAttribute('data-vitrine-aba');
      mostrarUnidade(bloco, id);
      guardarEscolha(id);
    });
    // HTML gravado na publicação abre na principal; aplica a escolha do visitante já
    var escolha = lerEscolha();
    if (escolha) mostrarUnidade(bloco, escolha);
  });

  fetch(loja.supabaseUrl + '/functions/v1/planos-publicos?site=1', {
    headers: { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (dados) {
      if (!dados) return;
      var opts = { principal: loja.unidadePrincipal, escolhida: lerEscolha() };
      blocos.forEach(function (bloco) {
        var html = Cards.renderVitrine(dados, bloco.getAttribute('data-vitrine'), opts);
        if (html) bloco.innerHTML = html;
      });
    })
    .catch(function () { /* sem conexão com o app: fica o conteúdo publicado */ });
})();
