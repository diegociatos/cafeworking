/**
 * Vitrine ao vivo: confere no app do CafeWorking os planos da categoria e
 * troca os cards gravados na publicação se algo mudou (preço, plano novo).
 * Se o app não responder, fica o que já está na página.
 *
 * Uso: <div class="vitrine" data-vitrine="endereco_fiscal">...</div>
 * Depende de loja-config.js e cards-plano.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var blocos = document.querySelectorAll('[data-vitrine]');
  if (!loja || !Cards || !blocos.length) return;

  function ligarAbas(bloco) {
    bloco.addEventListener('click', function (e) {
      var aba = e.target.closest('[data-vitrine-aba]');
      if (!aba) return;
      var id = aba.getAttribute('data-vitrine-aba');
      bloco.querySelectorAll('[data-vitrine-aba]').forEach(function (b) {
        b.setAttribute('aria-selected', String(b === aba));
      });
      bloco.querySelectorAll('[data-vitrine-unidade]').forEach(function (g) {
        g.hidden = g.getAttribute('data-vitrine-unidade') !== id;
      });
    });
  }

  blocos.forEach(ligarAbas);

  fetch(loja.supabaseUrl + '/functions/v1/planos-publicos?site=1', {
    headers: { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (dados) {
      if (!dados) return;
      blocos.forEach(function (bloco) {
        var html = Cards.renderVitrine(dados, bloco.getAttribute('data-vitrine'), { whatsapp: loja.whatsapp });
        if (!html) return;
        var atual = bloco.querySelector('.fiscal-pricing:not([hidden])');
        var abaAtual = atual && atual.getAttribute('data-vitrine-unidade');
        bloco.innerHTML = html;
        if (abaAtual) {
          var aba = bloco.querySelector('[data-vitrine-aba="' + abaAtual + '"]');
          if (aba) aba.click();
        }
      });
    })
    .catch(function () { /* sem conexão com o app: fica o conteúdo publicado */ });
})();
