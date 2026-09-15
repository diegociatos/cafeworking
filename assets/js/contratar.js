/**
 * Contratação em tela única: resumo do plano + dados + aceite do contrato.
 * O servidor (iniciar-assinatura) recalcula valor e forma; aqui é só informativo.
 * Depende de loja-config.js e cards-plano.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var $ = function (id) { return document.getElementById(id); };
  var FN = loja.supabaseUrl + '/functions/v1/';
  var HEADERS = { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey };
  var FORMAS = { PIX: 'PIX', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito' };

  var params = new URLSearchParams(location.search);
  var estado = {
    plano: null, unidade: null, contrato: null,
    periodicidade: params.get('periodo') === 'anual' ? 'anual' : 'mensal',
    forma: 'PIX', turnstile: '', widget: null, enviando: false,
  };

  var form = $('loja-form');

  function whatsapp(texto) {
    return 'https://wa.me/' + loja.whatsapp + '?text=' + encodeURIComponent(texto);
  }

  function aviso(html) {
    var el = $('loja-aviso');
    el.innerHTML = html;
    el.hidden = false;
    form.hidden = true;
  }

  function erro(msg) {
    var el = $('loja-erro');
    el.textContent = msg || '';
    el.hidden = !msg;
    if (msg) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function getJSON(url) {
    return fetch(url, { headers: HEADERS }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, dados: d }; });
    });
  }

  function opcao(nome, valor, marcado, titulo, detalhe) {
    return '<label class="loja-opcao"><input type="radio" name="' + nome + '" value="' + valor + '"' + (marcado ? ' checked' : '') + '>' +
      '<span><b>' + Cards.escapar(titulo) + '</b>' + (detalhe ? '<small>' + Cards.escapar(detalhe) + '</small>' : '') + '</span></label>';
  }

  function recorrente() { return estado.plano.recorrencia === 'mensal'; }

  function desenharPagamento() {
    var p = estado.plano;
    var temAnual = recorrente() && p.precoAnual;
    if (!temAnual) estado.periodicidade = recorrente() ? 'mensal' : 'avulso';

    $('loja-periodo').hidden = !temAnual;
    if (temAnual) {
      var economia = Math.round((p.preco * 12 - p.precoAnual) * 100) / 100;
      $('loja-periodo-opcoes').innerHTML =
        opcao('periodicidade', 'mensal', estado.periodicidade === 'mensal', 'Mensal · ' + Cards.precoBRL(p.preco) + '/mês',
          'No cartão de crédito, cobrado todo mês' + (p.prazoMinimoMeses > 0 ? '. Fidelidade de ' + p.prazoMinimoMeses + ' meses' : '')) +
        opcao('periodicidade', 'anual', estado.periodicidade === 'anual', 'Anual · ' + Cards.precoBRL(p.precoAnual),
          p.descontoAnualPct + '% de desconto (economia de ' + Cards.precoBRL(economia) + '). PIX, boleto ou cartão');
    }

    // mensal: só cartão; anual e avulso: PIX, boleto ou cartão
    var formas = estado.periodicidade === 'mensal' ? [] : ['PIX', 'BOLETO', 'CREDIT_CARD'];
    if (formas.length && formas.indexOf(estado.forma) < 0) estado.forma = formas[0];
    $('loja-formas').hidden = !formas.length;
    $('loja-formas-opcoes').innerHTML = formas.map(function (f) {
      return opcao('forma', f, estado.forma === f, FORMAS[f],
        f === 'BOLETO' ? 'Confirmação em até 3 dias úteis' : f === 'PIX' ? 'Confirmação na hora' : 'À vista');
    }).join('');

    var valor = estado.periodicidade === 'anual' ? p.precoAnual : p.preco;
    $('loja-total').hidden = false;
    $('loja-total-rotulo').textContent = 'Total hoje';
    $('loja-total-valor').textContent = Cards.precoBRL(valor);
    $('loja-total-detalhe').textContent = estado.periodicidade === 'mensal'
      ? 'Depois, ' + Cards.precoBRL(p.preco) + ' por mês no mesmo cartão.'
      : estado.periodicidade === 'anual' ? 'Renova sozinho a cada 12 meses. Avisamos antes.' : 'Pagamento único.';
    $('loja-pagar').textContent = estado.periodicidade === 'mensal' || estado.forma === 'CREDIT_CARD'
      ? 'Ir para o pagamento no cartão' : 'Gerar ' + FORMAS[estado.forma];
  }

  function desenharContrato(c) {
    estado.contrato = c;
    $('loja-contrato-titulo').textContent = 'Ler o contrato: ' + c.titulo + ' (versão ' + c.versao + ')';
    $('loja-contrato-texto').textContent = c.corpo;
    $('loja-aceite-texto').textContent = 'Li e aceito o contrato "' + c.titulo + '", versão ' + c.versao + '.';
  }

  function desenharPlano() {
    var p = estado.plano;
    document.title = (p.sobConsulta ? 'Proposta: ' : 'Contratar ') + p.nome + ' · CafeWorking';
    $('loja-titulo').textContent = p.nome;
    $('loja-unidade').textContent = estado.unidade ? 'Unidade ' + Cards.nomeUnidade(estado.unidade.nome) : '';
    $('loja-beneficios').innerHTML = Cards.beneficiosDoPlano(p).map(function (b) {
      return '<li>' + Cards.escapar(b) + '</li>';
    }).join('');
    if (!p.sobConsulta) desenharPagamento();
  }

  var formProposta = $('loja-proposta');

  // O widget vai no formulário visível: compra ou pedido de proposta.
  function renderTurnstile() {
    var alvo = !form.hidden ? '#cw-turnstile' : !formProposta.hidden ? '#cw-turnstile-proposta' : null;
    if (!window.turnstile || estado.widget !== null || !alvo) return;
    estado.widget = window.turnstile.render(alvo, {
      sitekey: loja.turnstileSiteKey,
      language: 'pt-br',
      callback: function (t) { estado.turnstile = t; },
      'expired-callback': function () { estado.turnstile = ''; },
      'error-callback': function () { estado.turnstile = ''; },
    });
  }
  window.cwTurnstilePronto = renderTurnstile;

  function resetTurnstile() {
    estado.turnstile = '';
    if (window.turnstile && estado.widget !== null) window.turnstile.reset(estado.widget);
  }

  function carregar() {
    var planoId = params.get('plano');
    var unidadeId = params.get('unidade');
    if (!planoId || !unidadeId) {
      aviso('<h2 class="h2">Escolha um plano</h2><p>Veja os planos e clique em <b>Quero este plano</b>.</p><a class="btn btn-primary" href="/planos">Ver planos</a>');
      return;
    }

    getJSON(FN + 'planos-publicos?site=1')
      .then(function (r) {
        var planos = (r.dados && r.dados.planos) || [];
        estado.plano = planos.filter(function (p) { return p.id === planoId && p.unidade_id === unidadeId; })[0] || null;
        estado.unidade = ((r.dados && r.dados.unidades) || []).filter(function (u) { return u.id === unidadeId; })[0] || null;
        if (r.status !== 200) throw new Error('catalogo');
        if (estado.plano && estado.plano.sobConsulta) {
          desenharPlano();
          formProposta.hidden = false;
          renderTurnstile();
          return null;
        }
        if (!estado.plano) {
          $('loja-titulo').textContent = 'Plano indisponível';
          aviso('<p>Este plano não está disponível para contratação online agora.</p>' +
            '<a class="btn btn-primary" href="/planos">Ver planos</a> ' +
            '<a class="btn btn-outline" href="' + whatsapp('Olá! Quero contratar um plano do CafeWorking.') + '" target="_blank" rel="noopener">Falar no WhatsApp</a>');
          return null;
        }
        desenharPlano();
        return getJSON(FN + 'contrato-vigente?unidade_id=' + encodeURIComponent(unidadeId) + '&categoria=' + encodeURIComponent(estado.plano.categoria));
      })
      .then(function (r) {
        if (!r) return;
        if (r.status !== 200 || !r.dados.contrato) {
          aviso('<p>A contratação online deste plano abre em breve. Enquanto isso, a gente fecha com você pelo WhatsApp.</p>' +
            '<a class="btn btn-primary" href="' + whatsapp('Olá! Quero contratar o plano ' + estado.plano.nome + ' do CafeWorking.') + '" target="_blank" rel="noopener">Contratar pelo WhatsApp</a>');
          return;
        }
        desenharContrato(r.dados.contrato);
        form.hidden = false;
        renderTurnstile();
      })
      .catch(function () {
        $('loja-titulo').textContent = 'Não foi possível carregar';
        aviso('<p>Não conseguimos carregar o plano agora. Tente de novo em instantes.</p>' +
          '<button class="btn btn-primary" type="button" onclick="location.reload()">Tentar de novo</button> ' +
          '<a class="btn btn-outline" href="' + whatsapp('Olá! Quero contratar um plano do CafeWorking.') + '" target="_blank" rel="noopener">Falar no WhatsApp</a>');
      });
  }

  formProposta.addEventListener('submit', function (e) {
    e.preventDefault();
    if (estado.enviando || !estado.plano) return;
    var campoErro = $('loja-proposta-erro');
    var falha = function (msg, campo) {
      campoErro.textContent = msg;
      campoErro.hidden = !msg;
      if (campo) campo.focus();
    };
    var d = {
      nome: formProposta.nome.value.trim(), empresa: formProposta.empresa.value.trim(),
      telefone: formProposta.telefone.value.trim(), email: formProposta.email.value.trim(),
      mensagem: formProposta.mensagem.value.trim(),
    };
    if (d.nome.length < 3) return falha('Informe seu nome.', formProposta.nome);
    if (d.telefone.replace(/\D/g, '').length < 10) return falha('Informe um celular com DDD.', formProposta.telefone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return falha('Informe um e-mail válido.', formProposta.email);
    if (!estado.turnstile) return falha('Aguarde a verificação de segurança terminar e tente de novo.');
    falha('');

    estado.enviando = true;
    var botao = $('loja-proposta-enviar');
    botao.disabled = true;
    botao.textContent = 'Enviando…';
    fetch(FN + 'lead-site', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, HEADERS),
      body: JSON.stringify(Object.assign(d, {
        unidade_id: estado.plano.unidade_id, plano_id: estado.plano.id, pagina: location.pathname, turnstile: estado.turnstile,
      })),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { return { ok: r.ok, x: x }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.x.error || 'Não foi possível enviar o pedido.');
        formProposta.hidden = true;
        aviso('<h2 class="h2">Pedido recebido</h2><p>A equipe do CafeWorking vai entrar em contato em até 1 dia útil, pelo WhatsApp ou pelo e-mail informado.</p>' +
          '<a class="btn btn-outline" href="/">Voltar ao site</a>');
      })
      .catch(function (err) {
        falha(err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Confira a internet e tente de novo.');
        resetTurnstile();
        estado.enviando = false;
        botao.disabled = false;
        botao.textContent = 'Pedir proposta';
      });
  });

  form.addEventListener('change', function (e) {
    if (!estado.plano) return;
    if (e.target.name === 'periodicidade') { estado.periodicidade = e.target.value; desenharPagamento(); }
    if (e.target.name === 'forma') { estado.forma = e.target.value; desenharPagamento(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (estado.enviando || !estado.plano || !estado.contrato) return;
    erro('');

    var d = {
      nome: form.nome.value.trim(),
      documento: form.documento.value.replace(/[^0-9A-Za-z]/g, ''),
      email: form.email.value.trim(),
      telefone: form.telefone.value.trim(),
    };
    if (d.nome.length < 3) return erro('Informe o nome completo ou a razão social.'), form.nome.focus();
    if ([11, 14].indexOf(d.documento.length) < 0) return erro('Informe um CPF (11 dígitos) ou CNPJ (14 caracteres).'), form.documento.focus();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return erro('Informe um e-mail válido. É por ele que você recebe o acesso.'), form.email.focus();
    if (!form.aceite.checked) return erro('Para continuar, aceite o contrato.'), form.aceite.focus();
    if (!estado.turnstile) return erro('Aguarde a verificação de segurança terminar e tente de novo.');

    estado.enviando = true;
    var botao = $('loja-pagar');
    var textoBotao = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Gerando pagamento…';

    fetch(FN + 'iniciar-assinatura', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, HEADERS),
      body: JSON.stringify({
        nome: d.nome, documento: d.documento, email: d.email, telefone: d.telefone,
        unidade_id: estado.plano.unidade_id, plano_id: estado.plano.id,
        periodicidade: estado.periodicidade === 'avulso' ? undefined : estado.periodicidade,
        forma: estado.periodicidade === 'mensal' ? 'CREDIT_CARD' : estado.forma,
        aceite: { modelo_id: estado.contrato.id, hash: estado.contrato.hash },
        origem: 'site', turnstile: estado.turnstile,
      }),
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (dados) { return { status: r.status, dados: dados }; });
      })
      .then(function (r) {
        var x = r.dados || {};
        if (x.ok && x.status_token) {
          try {
            sessionStorage.setItem('cw_pagamento_' + x.status_token, JSON.stringify({
              plano: x.plano, valor: x.valor, periodicidade: x.periodicidade, forma: x.forma, email: d.email,
              checkoutUrl: x.checkoutUrl, pix_payload: x.pix_payload, pix_imagem: x.pix_imagem, boleto_url: x.boleto_url,
            }));
          } catch (_) { /* sem sessionStorage: a página de pagamento mostra o link da fatura */ }
          location.href = '/pagamento?t=' + encodeURIComponent(x.status_token);
          return;
        }
        if (x.codigo === 'ACEITE_NECESSARIO' && x.contrato) {
          desenharContrato(x.contrato);
          form.aceite.checked = false;
          $('loja-contrato').open = true;
          throw new Error('O contrato foi atualizado agora há pouco. Leia a versão nova e aceite para continuar.');
        }
        if (x.codigo === 'EMAIL_EXISTENTE') {
          throw new Error('Este e-mail já tem conta no CafeWorking. Entre em ' + loja.appUrl.replace('https://', '') + ' para contratar pela área do cliente, ou use outro e-mail.');
        }
        if (x.codigo === 'SEM_CONTRATO') {
          throw new Error('A contratação online deste plano está pausada. Fale com a gente pelo WhatsApp.');
        }
        throw new Error(x.error || 'Não foi possível gerar o pagamento. Tente de novo.');
      })
      .catch(function (err) {
        erro(err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Confira a internet e tente de novo.');
        resetTurnstile();
        estado.enviando = false;
        botao.disabled = false;
        botao.textContent = textoBotao;
      });
  });

  carregar();
})();
