/**
 * Página de pagamento: mostra o PIX, o boleto ou o link do cartão e acompanha a
 * confirmação pela função status-pagamento (hoje só devolve o status da compra;
 * a categoria usada nos próximos passos vem da compra guardada pelo checkout).
 * Depende de loja-config.js e cards-plano.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  // t = compra de plano (token de status); r = reserva de sala por hora (id da reserva)
  var reservaId = params.get('r') || '';
  var ehReserva = /^r_[0-9a-f]{32}$/.test(reservaId);
  var token = ehReserva ? reservaId : params.get('t') || '';
  var CHAVE = 'cw_pagamento_' + token;
  var voltar = ehReserva ? '<a class="btn btn-primary" href="/reservar-sala">Reservar outro horário</a>' : '<a class="btn btn-primary" href="/planos">Ver planos</a>';
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
    if (compra && compra.confirmado) {
      acao.innerHTML = '<p>Conferindo o pagamento…</p>';
      return;
    }
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

  /**
   * Mede a compra uma vez por pagamento (token ou id da reserva), mesmo que a
   * página seja recarregada. Sem os dados da compra nesta aba (link aberto em
   * outro aparelho) não há valor: não mede, para não contar receita vazia nem
   * repetir a compra que a aba original já mediu.
   */
  function medirConfirmacao() {
    if (!window.cwTrack || !compra || !(Number(compra.valor) > 0)) return;
    var chave = 'cw_medido_' + token;
    try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, '1'); } catch (_) { /* sem storage: mede nesta visita */ }
    var valor = Number(compra.valor);
    var categoria = ehReserva ? 'sala_hora' : compra.categoria;
    var item = { item_id: ehReserva ? 'sala_hora' : compra.plano_id, item_name: compra.plano, item_category: categoria, price: valor, quantity: 1 };
    window.cwTrack('purchase', {
      transaction_id: token, value: valor, currency: 'BRL',
      item_name: compra.plano, item_category: categoria, items: [item],
    });
    if (ehReserva) window.cwTrack('reserve_room', { transaction_id: token, value: valor, currency: 'BRL', item_name: compra.plano, item_category: 'sala_hora' });
  }

  var LUXEMBURGO = 'Rua Guaicuí, 715, Luxemburgo, Belo Horizonte/MG';
  var HORARIO = 'de segunda a sexta, das 8h às 18h, exceto feriados';
  var TURNOS = { manha: 'das 8h ao meio-dia', tarde: 'do meio-dia às 18h' };

  function linkSenha(email) {
    return 'Crie sua senha pelo link que enviamos para <b>' + Cards.escapar(email) + '</b> (confira também o spam).';
  }

  function lista(passos) {
    return '<p><b>Próximos passos</b></p><ol class="pg-passos">' + passos.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol>';
  }

  /**
   * Próximos passos conforme o produto pago. A categoria vem do retorno de
   * status-pagamento quando ele trouxer (categoria/tipo) e, hoje, da compra
   * guardada nesta aba pelo checkout. Sem categoria conhecida, devolve vazio
   * e a página mostra o texto genérico.
   */
  function proximosPassos(info, email) {
    var c = info.categoria;
    var senha = linkSenha(email);
    if (c === 'endereco_fiscal') {
      return lista([
        senha,
        'Em até 30 dias, envie pela área do cliente os documentos da empresa ou, se ela ainda vai ser aberta, os documentos dos futuros sócios.',
        'A equipe confere os documentos em até 5 dias úteis e libera o que você precisa para registrar o endereço.',
      ].concat(info.abertura ? ['Seu plano inclui a abertura da empresa: na área do cliente, abra <b>Abertura da empresa</b> e preencha os dados.'] : []));
    }
    if (c === 'abertura_empresa') {
      return lista([
        senha,
        'Na área do cliente, abra <b>Abertura da empresa</b>, preencha os dados e anexe os documentos. A Ciatos Contabilidade acompanha o registro por lá.',
        'As taxas oficiais dos órgãos públicos são pagas à parte e informadas antes de cada etapa.',
      ]);
    }
    if (c === 'coworking' && info.recorrencia === 'avulso') {
      return lista([
        senha,
        'O seu ' + (/hora/i.test(info.plano || '') ? 'crédito de hora avulsa' : /day/i.test(info.plano || '') ? 'day pass' : 'crédito') + ' fica na área do cliente.',
        'Venha ' + HORARIO + ', na ' + LUXEMBURGO + ', e apresente-se na recepção com o e-mail usado na compra.',
      ]);
    }
    if (c === 'coworking') {
      return lista([
        senha,
        'Pela área do cliente você acompanha o plano e faz suas reservas.',
        'Use o espaço ' + (TURNOS[info.turno] ? 'no seu turno, ' + TURNOS[info.turno] + ', de segunda a sexta, exceto feriados' : HORARIO) +
          ', na ' + LUXEMBURGO + '. Na chegada, apresente-se na recepção com o e-mail usado na compra.',
      ]);
    }
    if (c === 'sala_privativa') {
      return lista([
        'A equipe confirma a entrega da sua sala em até 5 dias úteis, com o termo de entrega.',
        senha + ' Pela área do cliente você cadastra quem vai usar a sala.',
        'O uso é ' + HORARIO + ', na ' + LUXEMBURGO + '.',
      ]);
    }
    return '';
  }

  /** O que sobra da compra depois da confirmação: sem e-mail, PIX nem link de pagamento. */
  function guardarResumo() {
    try {
      if (!compra) return;
      sessionStorage.setItem(CHAVE, JSON.stringify({
        confirmado: true, reserva: compra.reserva, plano: compra.plano, valor: compra.valor, plano_id: compra.plano_id,
        categoria: compra.categoria, recorrencia: compra.recorrencia, abertura: compra.abertura, turno: compra.turno,
        sala: compra.sala, quando: compra.quando, unidade_id: compra.unidade_id,
      }));
    } catch (_) { /* ignore */ }
  }

  function confirmado(d) {
    medirConfirmacao();
    d = d || {};
    if (ehReserva) {
      $('pg-titulo').textContent = 'Reserva confirmada';
      $('pg-resumo').textContent = compra ? compra.plano : '';
      var naSede = !compra || !compra.unidade_id || compra.unidade_id === loja.unidadePrincipal;
      $('pg-acao').innerHTML = lista([
        '<b>Horário confirmado' + (compra && compra.sala ? ': ' + Cards.escapar(compra.sala) : '') + '</b>' +
          (compra && compra.quando ? ', ' + Cards.escapar(compra.quando) : '') + '. A confirmação foi para ' +
          (compra && compra.email ? '<b>' + Cards.escapar(compra.email) + '</b>' : 'o seu e-mail') + '.',
        (naSede ? 'Endereço: ' + LUXEMBURGO + ', CEP 30380-342. ' : '') + 'Chegue alguns minutos antes e procure a recepção.',
        'O que levar: seu notebook e o material da reunião. A sala tem Wi-Fi, ar-condicionado, TV ou projetor e quadro branco.',
        'Para remarcar ou cancelar, fale com a gente com pelo menos 24 horas de antecedência.',
      ]) +
        (naSede ? botao('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Rua Guaicuí, 715, Luxemburgo, Belo Horizonte - MG'), 'Traçar rota', 'btn-primary') + ' ' : '') +
        '<a class="btn btn-outline" href="/">Voltar ao site</a>';
      $('pg-status').textContent = '';
      guardarResumo();
      return;
    }
    // status-pagamento pode passar a devolver a categoria; enquanto não devolve, vale a da compra desta aba
    var info = {
      categoria: d.categoria || d.tipo || (compra && compra.categoria) || '',
      recorrencia: d.recorrencia || (compra && compra.recorrencia) || '',
      abertura: !!(compra && compra.abertura), turno: compra && compra.turno, plano: (compra && compra.plano) || '',
    };
    $('pg-titulo').textContent = 'Pagamento confirmado';
    $('pg-resumo').textContent = compra ? compra.plano + (info.recorrencia === 'avulso' ? ' confirmado.' : ' ativo.') : 'Seu plano está ativo.';
    var email = compra && compra.email ? compra.email : 'o seu e-mail';
    var passos = proximosPassos(info, email);
    $('pg-acao').innerHTML = passos
      ? passos + botao(loja.appUrl, 'Ir para a área do cliente')
      : '<p>Enviamos para <b>' + Cards.escapar(email) + '</b> o link para criar sua senha e entrar na área do cliente.</p>' +
        '<p>Não chegou em alguns minutos? Confira a caixa de spam.</p>' +
        botao(loja.appUrl, 'Ir para a área do cliente');
    $('pg-status').textContent = '';
    guardarResumo();
  }

  function cancelado() {
    $('pg-titulo').textContent = 'Pagamento não concluído';
    $('pg-acao').innerHTML = (ehReserva
      ? '<p>O prazo de 30 minutos para o pagamento terminou e o horário foi liberado. Se você pagou, fale com a gente pelo WhatsApp que resolvemos na hora.</p>'
      : '<p>Esta cobrança foi cancelada ou expirou. Você pode contratar de novo quando quiser.</p>') + voltar;
    $('pg-status').textContent = '';
  }

  function consultar() {
    fetch(loja.supabaseUrl + '/functions/v1/status-pagamento?' + (ehReserva ? 'r=' : 't=') + encodeURIComponent(token), {
      headers: { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.status === 'confirmado') return confirmado(d);
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

  if (!ehReserva && !/^[0-9a-f-]{36}$/i.test(token)) {
    $('pg-titulo').textContent = 'Compra não encontrada';
    $('pg-acao').innerHTML = voltar;
    $('pg-status').textContent = '';
    return;
  }

  if (ehReserva && compra && compra.expira_em) {
    var ate = new Date(compra.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    $('pg-status').textContent = 'Horário separado até ' + ate + '. Aguardando a confirmação do pagamento…';
  }
  desenharAcao();
  consultar();
})();
