/**
 * Medição do site: consentimento de cookies, carregamento de GTM/GA4/Meta Pixel
 * e a API window.cwTrack(evento, dados).
 *
 * - Os IDs ficam em loja-config.js (gtmId, ga4Id, metaPixelId). Vazios = nada
 *   de terceiros é carregado e o banner de cookies não aparece.
 * - Com ID configurado, GTM/GA4/Pixel só carregam depois do "Aceitar". A
 *   escolha fica no localStorage ("cw_consentimento") e pode ser revista pelo
 *   link "Cookies" do rodapé (qualquer elemento com data-cw-cookies).
 * - cwTrack sempre empurra o evento para window.dataLayer; chama gtag e fbq
 *   quando eles estiverem carregados. Dados pessoais (nome, e-mail, CPF/CNPJ,
 *   telefone) são descartados antes do envio.
 * - Use GTM OU GA4 direto: com os dois configurados, o GA4 dentro do GTM
 *   receberia os eventos em dobro.
 */
(function () {
  var cfg = window.CW_LOJA || {};
  var CHAVE = 'cw_consentimento';
  var PESSOAIS = /(^|_)(nome|name|e-?mail|cpf|cnpj|documento|telefone|celular|whatsapp|phone)($|_)/i;
  var carregado = false;
  window.dataLayer = window.dataLayer || [];

  function lerEscolha() { try { return localStorage.getItem(CHAVE) || ''; } catch (_) { return ''; } }
  function gravarEscolha(v) { try { localStorage.setItem(CHAVE, v); } catch (_) { /* sem storage */ } }
  function temId() { return !!(cfg.gtmId || cfg.ga4Id || cfg.metaPixelId); }

  // nomes de produto e de lista (item_name, item_list_name) não são dado pessoal
  var PRODUTO = /^(item|item_list|content|link|page)_/;
  // ids aleatórios (token da compra, id da reserva) têm sequências de números que parecem CPF
  var IDS = /^(transaction_id|item_id|item_list_id)$/;

  function semDadosPessoais(dados) {
    var limpo = {};
    Object.keys(dados || {}).forEach(function (k) {
      if ((PESSOAIS.test(k) && !PRODUTO.test(k)) || dados[k] === undefined) return;
      var v = dados[k];
      // e-mail, CPF/CNPJ ou telefone escondido dentro de um valor de texto também não sai
      if (typeof v === 'string' && !IDS.test(k) &&
        (/@/.test(v) || /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(v) || /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}/.test(v) || /\(?\d{2}\)?\s?9?\d{4}-?\d{4}/.test(v))) return;
      // listas de itens: cada item passa pelo mesmo filtro
      if (Array.isArray(v)) v = v.map(function (it) { return it && typeof it === 'object' ? semDadosPessoais(it) : it; });
      limpo[k] = v;
    });
    return limpo;
  }

  function semIndefinidos(o) {
    Object.keys(o).forEach(function (k) { if (o[k] === undefined) delete o[k]; });
    return o;
  }

  function script(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function carregarTerceiros() {
    if (carregado || !temId() || lerEscolha() !== 'aceito') return;
    carregado = true;
    if (cfg.gtmId) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      script('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(cfg.gtmId));
    }
    if (cfg.ga4Id) {
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', cfg.ga4Id, { anonymize_ip: true });
      script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4Id));
    }
    if (cfg.metaPixelId) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; }(window, document);
      /* eslint-enable */
      window.fbq('init', cfg.metaPixelId);
      window.fbq('track', 'PageView');
      script('https://connect.facebook.net/en_US/fbevents.js');
    }
  }

  /*
   * Funil (mesmo nome no GA4) e o evento padrão equivalente no Meta Pixel:
   *   view_item         card de plano visto ou clicado          ViewContent
   *   begin_checkout    abriu contratar / a agenda de reserva   InitiateCheckout
   *   add_payment_info  dados enviados e cobrança gerada       AddPaymentInfo
   *   purchase          pagamento confirmado, 1x por pagamento  Purchase
   *   contact           clique no WhatsApp                      Contact
   *   generate_lead     pedido de proposta ou visita            Lead
   * Os demais (view_item_list, select_item, reserve_room) vão ao Pixel como evento personalizado.
   */
  var PIXEL = {
    view_item: 'ViewContent', begin_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo',
    purchase: 'Purchase', generate_lead: 'Lead', contact: 'Contact',
  };

  window.cwTrack = function (evento, dados) {
    if (!evento) return;
    var d = semDadosPessoais(dados);
    window.dataLayer.push(Object.assign({ event: evento }, d));
    if (!carregado) return;
    try {
      if (cfg.ga4Id && typeof window.gtag === 'function') window.gtag('event', evento, d);
      if (cfg.metaPixelId && typeof window.fbq === 'function') {
        var itens = Array.isArray(d.items) ? d.items : [];
        var extra = semIndefinidos({
          value: d.value, currency: d.currency, content_name: d.item_name || d.item_list_name, content_category: d.item_category,
          content_ids: itens.length ? itens.map(function (it) { return it.item_id; }).filter(Boolean) : undefined,
          content_type: itens.length ? 'product' : undefined, num_items: itens.length || undefined,
        });
        // transaction_id vira eventID: o Pixel descarta a mesma compra enviada duas vezes
        var opcoes = d.transaction_id ? { eventID: String(d.transaction_id) } : undefined;
        if (PIXEL[evento]) window.fbq('track', PIXEL[evento], extra, opcoes);
        else window.fbq('trackCustom', evento, d);
      }
    } catch (_) { /* medição nunca quebra a página */ }
  };

  function fecharBanner() {
    var b = document.querySelector('.cw-consent');
    if (b) b.remove();
  }

  function mostrarBanner() {
    fecharBanner();
    var b = document.createElement('div');
    b.className = 'cw-consent';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-live', 'polite');
    b.setAttribute('aria-label', 'Preferências de cookies');
    b.innerHTML = '<p>Usamos cookies de medição para entender o uso do site e melhorar os anúncios, só com a sua autorização. ' +
      '<a href="/privacidade#cookies">Saiba mais</a>.</p>' +
      '<div class="cw-consent-acoes"><button type="button" class="cw-aceitar">Aceitar</button><button type="button" class="cw-recusar">Recusar</button></div>';
    b.querySelector('.cw-aceitar').addEventListener('click', function () {
      gravarEscolha('aceito');
      fecharBanner();
      carregarTerceiros();
      window.dataLayer.push({ event: 'cw_consentimento', consentimento: 'aceito' });
    });
    b.querySelector('.cw-recusar').addEventListener('click', function () {
      var mudou = lerEscolha() === 'aceito';
      gravarEscolha('recusado');
      fecharBanner();
      // scripts de terceiros já carregados só saem da página recarregando
      if (mudou && carregado) location.reload();
    });
    document.body.appendChild(b);
  }

  function iniciar() {
    if (temId()) {
      if (!lerEscolha()) mostrarBanner();
      else carregarTerceiros();
    }

    document.addEventListener('click', function (e) {
      var alvo = e.target.closest && e.target.closest('[data-cw-cookies]');
      if (alvo) {
        e.preventDefault();
        mostrarBanner();
        return;
      }
      var link = e.target.closest && e.target.closest('a[href*="wa.me/"]');
      if (link) {
        var secao = link.closest('.cw-barra') ? 'barra_celular' : link.classList.contains('wa-float') ? 'botao_flutuante'
          : link.closest('.nav-actions') ? 'topo' : link.closest('footer') ? 'rodape' : 'conteudo';
        window.cwTrack('contact', { method: 'whatsapp', page_path: location.pathname, link_location: secao, link_text: (link.textContent || '').trim().slice(0, 60) });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
