/**
 * Reserva de sala de reunião por hora: data → sala → horário → dados e pagamento.
 * O servidor (reservar-sala-online) confere horário, preço e contrato de novo.
 * Depende de loja-config.js, cards-plano.js e agenda-sala.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var Agenda = window.CWAgenda;
  var $ = function (id) { return document.getElementById(id); };
  var FN = loja.supabaseUrl + '/functions/v1/';
  var HEADERS = { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey };
  var params = new URLSearchParams(location.search);
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  var estado = {
    unidadeId: '', data: '', disp: null, salaId: '', inicio: null, horas: 1,
    contrato: null, turnstile: '', widget: null, enviando: false,
  };
  var form = $('rs-form');

  function whatsapp(texto) {
    return 'https://wa.me/' + loja.whatsapp + '?text=' + encodeURIComponent(texto);
  }

  function aviso(html) {
    $('rs-aviso').innerHTML = html;
    $('rs-aviso').hidden = false;
  }

  function erro(msg) {
    $('rs-erro').textContent = msg || '';
    $('rs-erro').hidden = !msg;
  }

  function getJSON(url) {
    return fetch(url, { headers: HEADERS }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, dados: d }; });
    });
  }

  function dataLonga(data) {
    return DIAS[Agenda.diaDaSemana(data)] + ', ' + data.split('-').reverse().join('/');
  }

  function renderTurnstile() {
    if (!window.turnstile || estado.widget !== null || $('rs-final').hidden) return;
    estado.widget = window.turnstile.render('#cw-turnstile', {
      sitekey: loja.turnstileSiteKey, language: 'pt-br',
      callback: function (t) { estado.turnstile = t; },
      'expired-callback': function () { estado.turnstile = ''; },
      'error-callback': function () { estado.turnstile = ''; },
    });
  }
  window.cwTurnstilePronto = renderTurnstile;

  function sala() {
    return estado.disp && estado.disp.salas.filter(function (s) { return s.id === estado.salaId; })[0];
  }

  function desenharSalas() {
    var d = estado.disp;
    var alvo = $('rs-salas');
    if (!d) { alvo.innerHTML = ''; return; }
    if (!d.salas.length) {
      alvo.innerHTML = '<div class="loja-aviso"><p>A reserva online de salas abre em breve nesta unidade.</p>' +
        '<a class="btn btn-primary" href="' + whatsapp('Olá! Quero reservar uma sala de reunião no CafeWorking.') + '" target="_blank" rel="noopener">Reservar pelo WhatsApp</a></div>';
      $('rs-final').hidden = true;
      return;
    }
    var agora = new Date();
    alvo.innerHTML = d.salas.map(function (s) {
      var horarios = Agenda.horariosDoDia(estado.data, d.janela, d.ocupados, s.id, agora);
      var livres = horarios.filter(function (h) { return h.livre; }).length;
      var foto = Array.isArray(s.fotos) && s.fotos[0] && /^https:\/\//.test(s.fotos[0]) ? s.fotos[0] : '';
      var escolhida = s.id === estado.salaId;
      return '<article class="rs-sala' + (escolhida ? ' escolhida' : '') + '">' +
        (foto ? '<img src="' + Cards.escapar(foto) + '" alt="' + Cards.escapar(s.nome) + '" loading="lazy" width="480" height="300">' : '') +
        '<div class="rs-sala-corpo">' +
          '<h3>' + Cards.escapar(s.nome) + '</h3>' +
          '<p class="loja-unidade">' + (s.capacidade ? 'Até ' + Cards.escapar(s.capacidade) + ' pessoas · ' : '') + Cards.escapar(Cards.precoBRL(s.valor_hora)) + ' por hora</p>' +
          (s.descricao ? '<p class="rs-sala-desc">' + Cards.escapar(s.descricao) + '</p>' : '') +
          '<div class="rs-horarios" role="group" aria-label="Horários da ' + Cards.escapar(s.nome) + '">' +
          horarios.map(function (h) {
            var sel = escolhida && estado.inicio !== null && h.hora >= estado.inicio && h.hora < estado.inicio + estado.horas;
            var titulo = h.livre ? 'Livre' : h.motivo === 'ocupado' ? 'Ocupado' : h.motivo === 'fechado' ? 'Fechado' : 'Indisponível';
            return '<button type="button" class="rs-hora' + (sel ? ' sel' : '') + '" data-sala="' + Cards.escapar(s.id) + '" data-hora="' + h.hora + '"' +
              (h.livre ? '' : ' disabled') + ' title="' + titulo + '" aria-pressed="' + sel + '">' + h.hora + 'h</button>';
          }).join('') +
          '</div>' +
          (livres ? '' : '<p class="loja-seguro">Sem horários livres nesta data.</p>') +
        '</div></article>';
    }).join('');
  }

  function desenharResumo() {
    var s = sala();
    if (!s || estado.inicio === null) { $('rs-final').hidden = true; return; }
    var horarios = Agenda.horariosDoDia(estado.data, estado.disp.janela, estado.disp.ocupados, s.id, new Date());
    var max = Agenda.maxHorasAPartir(horarios, estado.inicio, estado.disp.janela.maxHoras);
    if (estado.horas > max) estado.horas = Math.max(1, max);

    var opcoes = '';
    for (var n = 1; n <= max; n++) opcoes += '<option value="' + n + '"' + (n === estado.horas ? ' selected' : '') + '>' + n + (n === 1 ? ' hora' : ' horas') + '</option>';
    $('rs-resumo-sala').textContent = s.nome;
    $('rs-resumo-quando').innerHTML = Cards.escapar(dataLonga(estado.data)) + ', das ' + estado.inicio + 'h às ' + (estado.inicio + estado.horas) + 'h' +
      '<label class="rs-duracao">Duração <select id="rs-horas">' + opcoes + '</select></label>';
    $('rs-resumo-total').textContent = Cards.precoBRL(Math.round(estado.horas * s.valor_hora * 100) / 100);
    $('rs-resumo-detalhe').textContent = estado.horas + (estado.horas === 1 ? ' hora' : ' horas') + ' × ' + Cards.precoBRL(s.valor_hora);
    $('rs-horas').addEventListener('change', function (e) { estado.horas = Number(e.target.value); desenharSalas(); desenharResumo(); });

    var novo = $('rs-final').hidden;
    $('rs-final').hidden = false;
    renderTurnstile();
    if (novo) $('rs-final').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function carregarDisponibilidade() {
    estado.inicio = null;
    $('rs-final').hidden = true;
    $('rs-salas').innerHTML = '<p class="loja-seguro">Carregando horários…</p>';
    return getJSON(FN + 'disponibilidade-salas?unidade_id=' + encodeURIComponent(estado.unidadeId) + '&data=' + estado.data)
      .then(function (r) {
        if (r.status !== 200) {
          estado.disp = null;
          $('rs-salas').innerHTML = '<p class="loja-erro">' + Cards.escapar(r.dados.error || 'Não foi possível carregar os horários.') + '</p>';
          return;
        }
        estado.disp = r.dados;
        var j = r.dados.janela;
        $('rs-janela').textContent = 'Reserva online de segunda a sexta, das ' + parseInt(j.abre, 10) + 'h às ' + parseInt(j.fecha, 10) + 'h, por hora cheia, com pelo menos ' + Math.round(j.antecedenciaMinMinutos / 60) + ' hora de antecedência.';
        if (!estado.salaId && params.get('sala')) {
          var dica = params.get('sala').toLowerCase();
          var achada = r.dados.salas.filter(function (s) { return s.nome.toLowerCase().indexOf(dica) >= 0; })[0];
          if (achada) estado.salaId = achada.id;
        }
        desenharSalas();
      })
      .catch(function () {
        $('rs-salas').innerHTML = '<p class="loja-erro">Sem conexão. Confira a internet e tente de novo.</p>';
      });
  }

  function carregarContrato() {
    return getJSON(FN + 'contrato-vigente?unidade_id=' + encodeURIComponent(estado.unidadeId) + '&categoria=sala_hora').then(function (r) {
      estado.contrato = r.status === 200 ? r.dados.contrato : null;
      if (!estado.contrato) return false;
      $('rs-contrato-titulo').textContent = 'Ler o termo: ' + estado.contrato.titulo + ' (versão ' + estado.contrato.versao + ')';
      $('rs-contrato-texto').textContent = estado.contrato.corpo;
      $('rs-aceite-texto').textContent = 'Li e aceito o "' + estado.contrato.titulo + '", versão ' + estado.contrato.versao + '.';
      return true;
    });
  }

  function trocarUnidade(id) {
    estado.unidadeId = id;
    estado.salaId = '';
    return carregarContrato().then(function (ok) {
      if (!ok) {
        $('rs-app').hidden = true;
        aviso('<p>A reserva online de salas abre em breve. Enquanto isso, reserve com a gente pelo WhatsApp.</p>' +
          '<a class="btn btn-primary" href="' + whatsapp('Olá! Quero reservar uma sala de reunião no CafeWorking.') + '" target="_blank" rel="noopener">Reservar pelo WhatsApp</a>');
        return;
      }
      $('rs-aviso').hidden = true;
      $('rs-app').hidden = false;
      return carregarDisponibilidade();
    });
  }

  function iniciar() {
    getJSON(FN + 'unidades-publicas').then(function (r) {
      var unidades = (r.dados && r.dados.unidades) || [];
      if (!unidades.length) throw new Error('sem unidades');
      var sel = $('rs-unidade');
      sel.innerHTML = unidades.map(function (u) { return '<option value="' + Cards.escapar(u.id) + '">' + Cards.escapar(u.nome) + '</option>'; }).join('');
      var pedida = params.get('unidade');
      if (pedida && unidades.some(function (u) { return u.id === pedida; })) sel.value = pedida;
      $('rs-unidade-rotulo').hidden = unidades.length === 1;
      sel.addEventListener('change', function () { trocarUnidade(sel.value); });

      var janelaPadrao = { diasSemana: [1, 2, 3, 4, 5], abre: '08:00', fecha: '18:00', antecedenciaMinMinutos: 60, maxHoras: 10 };
      var campoData = $('rs-data');
      var hoje = Agenda.dataBRT(new Date());
      var limite = new Date(); limite.setMonth(limite.getMonth() + 2);
      campoData.min = hoje;
      campoData.max = Agenda.dataBRT(limite);
      estado.data = params.get('data') && params.get('data') >= hoje ? params.get('data') : Agenda.proximoDiaReservavel(new Date(), janelaPadrao);
      campoData.value = estado.data;
      campoData.addEventListener('change', function () {
        if (!campoData.value) return;
        estado.data = campoData.value;
        carregarDisponibilidade();
      });
      return trocarUnidade(sel.value);
    }).catch(function () {
      aviso('<p>Não conseguimos carregar a agenda agora.</p><button class="btn btn-primary" type="button" onclick="location.reload()">Tentar de novo</button> ' +
        '<a class="btn btn-outline" href="' + whatsapp('Olá! Quero reservar uma sala de reunião no CafeWorking.') + '" target="_blank" rel="noopener">Reservar pelo WhatsApp</a>');
    });
  }

  $('rs-salas').addEventListener('click', function (e) {
    var b = e.target.closest('.rs-hora');
    if (!b || b.disabled) return;
    var mesmaSala = estado.salaId === b.getAttribute('data-sala');
    estado.salaId = b.getAttribute('data-sala');
    estado.inicio = Number(b.getAttribute('data-hora'));
    if (!mesmaSala) estado.horas = 1;
    erro('');
    desenharSalas();
    desenharResumo();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = sala();
    if (estado.enviando || !s || estado.inicio === null || !estado.contrato) return;
    erro('');
    var d = {
      nome: form.nome.value.trim(), documento: form.documento.value.replace(/[^0-9A-Za-z]/g, ''),
      email: form.email.value.trim(), telefone: form.telefone.value.trim(),
    };
    if (d.nome.length < 3) return erro('Informe o nome completo ou a razão social.'), form.nome.focus();
    if ([11, 14].indexOf(d.documento.length) < 0) return erro('Informe um CPF (11 dígitos) ou CNPJ (14 caracteres).'), form.documento.focus();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return erro('Informe um e-mail válido.'), form.email.focus();
    if (!form.aceite.checked) return erro('Para continuar, aceite o termo de reserva.'), form.aceite.focus();
    if (!estado.turnstile) return erro('Aguarde a verificação de segurança terminar e tente de novo.');

    estado.enviando = true;
    var botao = $('rs-pagar');
    botao.disabled = true;
    botao.textContent = 'Separando o horário…';
    var forma = form.forma.value === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX';

    fetch(FN + 'reservar-sala-online', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, HEADERS),
      body: JSON.stringify({
        unidade_id: estado.unidadeId, sala_id: s.id, base: null,
        start_at: Agenda.isoBRT(estado.data, estado.inicio), end_at: Agenda.isoBRT(estado.data, estado.inicio + estado.horas),
        nome: d.nome, documento: d.documento, email: d.email, telefone: d.telefone, forma: forma,
        aceite: { modelo_id: estado.contrato.id, hash: estado.contrato.hash }, turnstile: estado.turnstile,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { return { status: r.status, x: x }; }); })
      .then(function (r) {
        var x = r.x;
        if (x.ok && x.reserva_id) {
          try {
            sessionStorage.setItem('cw_pagamento_' + x.reserva_id, JSON.stringify({
              reserva: true, plano: x.descricao, valor: x.valor, periodicidade: 'avulso', forma: forma, email: d.email,
              checkoutUrl: x.checkoutUrl, pix_payload: x.pix_payload, pix_imagem: x.pix_imagem, expira_em: x.expira_em,
            }));
          } catch (_) { /* a página de pagamento busca o link da fatura */ }
          location.href = '/pagamento?r=' + encodeURIComponent(x.reserva_id);
          return;
        }
        if (x.codigo === 'ACEITE_NECESSARIO' && x.contrato) {
          estado.contrato = x.contrato;
          $('rs-contrato-texto').textContent = x.contrato.corpo;
          $('rs-aceite-texto').textContent = 'Li e aceito o "' + x.contrato.titulo + '", versão ' + x.contrato.versao + '.';
          form.aceite.checked = false;
          throw new Error('O termo foi atualizado agora há pouco. Leia a versão nova e aceite para continuar.');
        }
        if (r.status === 409) {
          estado.enviando = false;
          botao.disabled = false;
          botao.textContent = 'Reservar e pagar';
          var msg = x.error || 'Esse horário acabou de ser reservado. Escolha outro.';
          return carregarDisponibilidade().then(function () {
            $('rs-salas').insertAdjacentHTML('afterbegin', '<p class="loja-erro" role="alert">' + Cards.escapar(msg) + '</p>');
            $('rs-salas').scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
        throw new Error(x.error || 'Não foi possível reservar. Tente de novo.');
      })
      .catch(function (err) {
        erro(err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Confira a internet e tente de novo.');
        estado.turnstile = '';
        if (window.turnstile && estado.widget !== null) window.turnstile.reset(estado.widget);
        estado.enviando = false;
        botao.disabled = false;
        botao.textContent = 'Reservar e pagar';
      });
  });

  iniciar();
})();
