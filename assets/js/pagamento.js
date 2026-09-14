/**
 * Página de pagamento: mostra o PIX, o boleto ou o link do cartão e acompanha a
 * confirmação pela função status-pagamento (só devolve o status da compra).
 * Depende de loja-config.js e cards-plano.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var $ = function (id) { return document.getElementById(id); };
  var token = new URLSearchParams(location.search).get('t') || '';
  var CHAVE = 'cw_pagamento_' + token;
  var inicio = Date.now();
  var fatura = '';

  var compra = null;
  try { compra = JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch (_) { compra = null; }

  function botao(href, texto, classe) {
    return '<a class="btn ' + (classe || 'btn-primary') + '" href="' + Cards.escapar(href) + '" target="_blank" rel="noopener">' + texto + '</a>';
  }

  function copiar(texto, el) {
    var ok = function () { el.textContent = 'Código copiado'; setTimeout(function () { el.textContent = 'Copiar código PIX'; }, 2500); };
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(ok, function () {});
    else { var t = $('pg-pix-codigo'); t.select(); document.execCommand('copy'); ok(); }
  }

  function desenharAcao() {
    var acao = $('pg-acao');
    var link = (compra && compra.checkoutUrl) || fatura;
    if (!compra) {
      acao.innerHTML = link
        ? '<p>Abra a fatura para pagar:</p>' + botao(link, 'Abrir fatura')
        : '<p>Estamos conferindo sua compra.</p>';
      return;
    }

    $('pg-resumo').textContent = compra.plano + ' · ' + Cards.precoBRL(compra.valor) +
      (compra.periodicidade === 'mensal' ? ' por mês' : compra.periodicidade === 'anual' ? ' no plano anual' : '');

    if (compra.forma === 'PIX' && compra.pix_payload) {
      acao.innerHTML =
        (compra.pix_imagem ? '<img class="pg-qrcode" width="220" height="220" alt="QR Code do PIX" src="data:image/png;base64,' + Cards.escapar(compra.pix_imagem) + '">' : '') +
        '<p>Escaneie o QR Code no app do banco ou copie o código:</p>' +
        '<textarea class="pg-pix" id="pg-pix-codigo" readonly rows="3">' + Cards.escapar(compra.pix_payload) + '</textarea>' +
        '<button class="btn btn-primary" type="button" id="pg-copiar">Copiar código PIX</button>';
      $('pg-copiar').addEventListener('click', function (e) { copiar(compra.pix_payload, e.currentTarget); });
    } else if (compra.forma === 'BOLETO') {
      $('pg-titulo').textContent = 'Seu boleto está pronto';
      acao.innerHTML = '<p>O boleto compensa em até 3 dias úteis. Assim que compensar, enviamos o acesso por e-mail.</p>' +
        botao(compra.boleto_url || link, 'Abrir boleto');
    } else {
      acao.innerHTML = '<p>Finalize no ambiente seguro do Asaas. O pagamento abre em outra aba.</p>' +
        botao(link, 'Pagar com cartão de crédito');
    }
    if (link && compra.forma !== 'CREDIT_CARD') {
      acao.innerHTML += '<p class="loja-seguro"><a href="' + Cards.escapar(link) + '" target="_blank" rel="noopener">Abrir a fatura completa no Asaas</a></p>';
    }
  }

  function confirmado() {
    $('pg-titulo').textContent = 'Pagamento confirmado';
    $('pg-resumo').textContent = compra ? compra.plano + ' ativo.' : 'Seu plano está ativo.';
    $('pg-acao').innerHTML =
      '<p>Enviamos para <b>' + Cards.escapar(compra && compra.email ? compra.email : 'o seu e-mail') + '</b> o link para criar sua senha e entrar na área do cliente.</p>' +
      '<p>Não chegou em alguns minutos? Confira a caixa de spam.</p>' +
      botao(loja.appUrl, 'Ir para a área do cliente');
    $('pg-status').textContent = '';
    try { sessionStorage.removeItem(CHAVE); } catch (_) { /* ignore */ }
  }

  function cancelado() {
    $('pg-titulo').textContent = 'Pagamento não concluído';
    $('pg-acao').innerHTML = '<p>Esta cobrança foi cancelada ou expirou. Você pode contratar de novo quando quiser.</p>' +
      '<a class="btn btn-primary" href="/endereco-fiscal#planos">Ver planos</a>';
    $('pg-status').textContent = '';
  }

  function consultar() {
    fetch(loja.supabaseUrl + '/functions/v1/status-pagamento?t=' + encodeURIComponent(token), {
      headers: { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.status === 'confirmado') return confirmado();
        if (d && d.status === 'cancelado') return cancelado();
        if (d && d.fatura && !fatura) { fatura = d.fatura; desenharAcao(); }
        agendar();
      })
      .catch(agendar);
  }

  function agendar() {
    var passou = Date.now() - inicio;
    if (passou > 60 * 60 * 1000) {
      $('pg-status').textContent = 'Ainda não recebemos a confirmação. Se já pagou, ela chega por e-mail em instantes.';
      return;
    }
    setTimeout(consultar, passou < 5 * 60 * 1000 ? 5000 : 15000);
  }

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    $('pg-titulo').textContent = 'Compra não encontrada';
    $('pg-acao').innerHTML = '<a class="btn btn-primary" href="/endereco-fiscal#planos">Ver planos</a>';
    $('pg-status').textContent = '';
    return;
  }

  desenharAcao();
  consultar();
})();
