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

  /* ---- medição (analytics.js): lista vista e card clicado, sem dado pessoal ---- */
  function itensDoBloco(bloco) {
    var vistos = {};
    return Array.prototype.map.call(bloco.querySelectorAll('[data-vitrine-unidade]:not([hidden]) a[href*="/contratar?plano="]:not(.fiscal-card-visita)'), function (a, i) {
      var q = new URLSearchParams(a.getAttribute('href').split('?')[1] || '');
      var card = a.closest('article');
      var preco = card && card.querySelector('.fiscal-price');
      var valor = preco ? Number((preco.firstChild && preco.firstChild.textContent || '').replace(/[^0-9,]/g, '').replace(',', '.')) : undefined;
      var chave = q.get('plano') + (q.get('sala') || '');
      if (vistos[chave]) return null;
      vistos[chave] = 1;
      return { item_id: q.get('plano'), item_name: card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : '', price: valor || undefined, index: i };
    }).filter(Boolean);
  }
  function medirLista(bloco) {
    if (!window.cwTrack) return;
    var categoria = bloco.getAttribute('data-vitrine');
    window.cwTrack('view_item_list', { item_list_id: categoria, item_list_name: categoria, items: itensDoBloco(bloco) });
    observarCards(bloco);
  }

  /* view_item: card visto (metade dele na tela) ou clicado, uma vez por plano/sala
   * por página. Os cards que aparecem juntos saem num único evento. */
  var cardsMedidos = {};
  var filaVistos = [];
  var timerVistos = null;

  function itemDoCard(art, categoria) {
    var a = art && art.querySelector('a[href*="/contratar?plano="]');
    if (!a) return null;
    var q = new URLSearchParams(a.getAttribute('href').split('?')[1] || '');
    var preco = art.querySelector('.fiscal-price');
    var valor = preco ? Number((preco.firstChild && preco.firstChild.textContent || '').replace(/[^0-9,]/g, '').replace(',', '.')) : undefined;
    return {
      chave: q.get('plano') + '|' + (q.get('sala') || ''),
      item: { item_id: q.get('plano'), item_name: art.querySelector('h3') ? art.querySelector('h3').textContent.trim() : '', item_category: categoria, price: valor || undefined, quantity: 1 },
    };
  }

  function enviarVistos() {
    timerVistos = null;
    if (!filaVistos.length || !window.cwTrack) return;
    var itens = filaVistos;
    filaVistos = [];
    var soma = itens.reduce(function (t, it) { return t + (it.price || 0); }, 0);
    window.cwTrack('view_item', {
      currency: 'BRL', value: itens.length === 1 ? itens[0].price : soma || undefined,
      item_category: itens[0].item_category, items: itens,
    });
  }

  function marcarVisto(art, categoria, agora) {
    var x = itemDoCard(art, categoria);
    if (!x || cardsMedidos[x.chave]) return;
    cardsMedidos[x.chave] = 1;
    filaVistos.push(x.item);
    if (agora) { clearTimeout(timerVistos); enviarVistos(); }
    else if (!timerVistos) timerVistos = setTimeout(enviarVistos, 1000);
  }

  var observador = 'IntersectionObserver' in window ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      observador.unobserve(e.target);
      var bloco = e.target.closest('[data-vitrine]');
      // aba de outra unidade escondida não conta como vista
      if (bloco && !e.target.closest('[hidden]')) marcarVisto(e.target, bloco.getAttribute('data-vitrine'));
    });
  }, { threshold: 0.5 }) : null;

  function observarCards(bloco) {
    if (!observador) return;
    bloco.querySelectorAll('article').forEach(function (art) { observador.observe(art); });
  }

  function mostrarUnidade(bloco, id) {
    var aba = bloco.querySelector('[data-vitrine-aba="' + id + '"]');
    if (!aba) return false;
    bloco.querySelectorAll('[data-vitrine-aba]').forEach(function (b) { b.setAttribute('aria-selected', String(b === aba)); });
    bloco.querySelectorAll('[data-vitrine-unidade]').forEach(function (g) { g.hidden = g.getAttribute('data-vitrine-unidade') !== id; });
    return true;
  }

  blocos.forEach(function (bloco) {
    bloco.addEventListener('click', function (e) {
      var card = e.target.closest('a[href*="/contratar?plano="]');
      if (card && window.cwTrack) {
        var q = new URLSearchParams(card.getAttribute('href').split('?')[1] || '');
        var art = card.closest('article');
        marcarVisto(art, bloco.getAttribute('data-vitrine'), true);
        window.cwTrack('select_item', {
          item_list_id: bloco.getAttribute('data-vitrine'),
          items: [{ item_id: q.get('plano'), item_name: art && art.querySelector('h3') ? art.querySelector('h3').textContent.trim() : '' }],
          visita: q.get('visita') === '1',
        });
      }
      var aba = e.target.closest('[data-vitrine-aba]');
      if (!aba) return;
      var id = aba.getAttribute('data-vitrine-aba');
      mostrarUnidade(bloco, id);
      guardarEscolha(id);
      // cards da aba que acabou de abrir entram na medição de vistos
      observarCards(bloco);
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
      if (!dados) { blocos.forEach(medirLista); return; }
      var opts = { principal: loja.unidadePrincipal, escolhida: lerEscolha() };
      blocos.forEach(function (bloco) {
        var html = Cards.renderVitrine(dados, bloco.getAttribute('data-vitrine'), opts);
        if (html) bloco.innerHTML = html;
        medirLista(bloco);
      });
    })
    .catch(function () {
      /* sem conexão com o app: fica o conteúdo publicado */
      blocos.forEach(medirLista);
    });
})();
