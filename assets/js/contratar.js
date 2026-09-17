/**
 * Contratação em tela única: resumo do plano + dados + aceite do contrato.
 * O servidor (iniciar-assinatura) recalcula valor e forma; aqui é só informativo.
 * Depende de loja-config.js e cards-plano.js.
 */
(function () {
  var loja = window.CW_LOJA;
  var Cards = window.CWCards;
  var Documento = window.CWDocumento;
  var $ = function (id) { return document.getElementById(id); };
  var track = function (evento, dados) { if (window.cwTrack) window.cwTrack(evento, dados); };
  var TEMPO_TURNSTILE = 12000;
  var FN = loja.supabaseUrl + '/functions/v1/';
  var HEADERS = { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey };
  var FORMAS = { PIX: 'PIX', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito' };

  var params = new URLSearchParams(location.search);
  var estado = {
    plano: null, unidade: null, sala: null, contrato: null,
    periodicidade: params.get('periodo') === 'anual' ? 'anual' : 'mensal',
    forma: 'PIX', turno: '', turnstile: '', widget: null, enviando: false,
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

  var TURNOS = { manha: ['Manhã', 'Das 8h ao meio-dia'], tarde: ['Tarde', 'Do meio-dia às 18h'] };

  // Turno e Flex: o cliente escolhe o período fixo na contratação
  function desenharTurno() {
    var p = estado.plano;
    $('loja-turno').hidden = !p.escolhaTurno;
    if (!p.escolhaTurno) { estado.turno = ''; return; }
    $('loja-turno-opcoes').innerHTML = Object.keys(TURNOS).map(function (t) {
      return opcao('turno', t, estado.turno === t, TURNOS[t][0], TURNOS[t][1]);
    }).join('');
  }

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

    // fidelidade e multa perto do total (cláusula 7.4 dos contratos: 20% das mensalidades que faltarem)
    var fidelidade = $('loja-fidelidade');
    if (fidelidade) {
      var meses = Number(p.prazoMinimoMeses) || 0;
      var mostrar = estado.periodicidade === 'mensal' && meses > 0;
      fidelidade.hidden = !mostrar;
      fidelidade.textContent = mostrar
        ? 'Fidelidade de ' + meses + (meses === 1 ? ' mês' : ' meses') + ' no plano mensal. Se cancelar antes, há multa de 20% sobre as mensalidades que faltarem, nas condições do contrato.'
        : '';
    }
  }

  function itemDoPlano() {
    var p = estado.plano;
    return {
      item_id: p.id, item_name: p.nome, item_category: p.categoria,
      price: estado.periodicidade === 'anual' ? p.precoAnual : p.preco, quantity: 1,
    };
  }

  function desenharContrato(c) {
    estado.contrato = c;
    $('loja-contrato-titulo').textContent = 'Ler o contrato: ' + c.titulo + ' (versão ' + c.versao + ')';
    $('loja-contrato-texto').textContent = c.corpo;
    $('loja-aceite-texto').textContent = 'Li e aceito o contrato "' + c.titulo + '", versão ' + c.versao + '.';
  }

  function desenharPlano() {
    var p = estado.plano;
    var nome = estado.sala ? estado.sala.nome : p.nome;
    document.title = (p.sobConsulta ? 'Proposta: ' : 'Contratar ') + nome + ' · CafeWorking';
    $('loja-titulo').textContent = nome;
    var unidade = estado.unidade ? 'Unidade ' + Cards.nomeUnidade(estado.unidade.nome) : '';
    $('loja-unidade').textContent = estado.sala ? p.nome + (unidade ? ' · ' + unidade : '') : unidade;
    // sala escolhida: a capa abre a galeria de fotos
    var capa = $('loja-sala-capa');
    capa.hidden = !estado.sala;
    if (estado.sala) capa.innerHTML = Cards.capaSala(estado.sala).replace('class="sala-capa"', 'class="sala-capa loja-sala-capa"');
    $('loja-beneficios').innerHTML = Cards.beneficiosDoPlano(p).map(function (b) {
      return '<li>' + Cards.escapar(b) + '</li>';
    }).join('');
    if (!p.sobConsulta) { desenharTurno(); desenharPagamento(); }
  }

  var formProposta = $('loja-proposta');
  var timerTurnstile = null;

  function alvoTurnstile() {
    return !form.hidden ? 'cw-turnstile' : !formProposta.hidden ? 'cw-turnstile-proposta' : null;
  }

  // Sem o widget, o envio nunca é liberado: em vez de "aguarde" para sempre, explica o que fazer.
  function avisoTurnstile() {
    var id = alvoTurnstile();
    var caixa = id && $(id);
    if (!caixa || caixa.querySelector('.cw-turnstile-falha')) return;
    caixa.insertAdjacentHTML('beforeend',
      '<p class="loja-erro cw-turnstile-falha" role="alert">A verificação de segurança não carregou. Recarregue a página ' +
      '(um bloqueador de anúncios pode estar impedindo) ou <a href="' + whatsapp('Olá! Não consegui concluir a contratação pelo site do CafeWorking.') +
      '" target="_blank" rel="noopener">fale com a gente pelo WhatsApp</a>.</p>');
  }

  function turnstileFalhou() {
    return !window.turnstile || estado.widget === null || !!document.querySelector('.cw-turnstile-falha');
  }

  // O widget vai no formulário visível: compra ou pedido de proposta.
  function renderTurnstile() {
    var alvo = alvoTurnstile();
    if (alvo && !timerTurnstile) {
      timerTurnstile = setTimeout(function () {
        if (!window.turnstile || estado.widget === null) avisoTurnstile();
      }, TEMPO_TURNSTILE);
    }
    if (!window.turnstile || estado.widget !== null || !alvo) return;
    estado.widget = window.turnstile.render('#' + alvo, {
      sitekey: loja.turnstileSiteKey,
      language: 'pt-br',
      callback: function (t) {
        estado.turnstile = t;
        var falha = document.querySelector('.cw-turnstile-falha');
        if (falha) falha.remove();
      },
      'expired-callback': function () { estado.turnstile = ''; },
      'error-callback': function () { estado.turnstile = ''; avisoTurnstile(); },
    });
  }
  window.cwTurnstilePronto = renderTurnstile;

  function mensagemTurnstile() {
    return turnstileFalhou()
      ? 'A verificação de segurança não carregou. Recarregue a página ou fale com a gente pelo WhatsApp.'
      : 'Aguarde a verificação de segurança terminar e tente de novo.';
  }

  function resetTurnstile() {
    estado.turnstile = '';
    if (window.turnstile && estado.widget !== null) window.turnstile.reset(estado.widget);
  }

  /** "Belo Horizonte/MG" → "belo-horizonte-mg" (o mesmo slug das páginas por cidade). */
  function slugDaCidade(valor) {
    return String(valor || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function carregar() {
    var planoId = params.get('plano');
    var unidadeId = params.get('unidade');
    // As páginas por cidade do site podem mandar só a cidade: a unidade é
    // descoberta aqui, entre as que vendem o plano escolhido.
    var cidade = slugDaCidade(params.get('cidade'));
    if (!planoId || (!unidadeId && !cidade)) {
      aviso('<h2 class="h2">Escolha um plano</h2><p>Veja os planos e clique em <b>Quero este plano</b>.</p><a class="btn btn-primary" href="/planos">Ver planos</a>');
      return;
    }

    getJSON(FN + 'planos-publicos?site=1')
      .then(function (r) {
        var planos = (r.dados && r.dados.planos) || [];
        var unidades = (r.dados && r.dados.unidades) || [];
        if (!unidadeId && cidade) {
          var daCidade = unidades.filter(function (u) {
            return slugDaCidade(u.cidade) === cidade
              && planos.some(function (p) { return p.id === planoId && p.unidade_id === u.id; });
          })[0];
          if (daCidade) unidadeId = daCidade.id;
        }
        estado.plano = planos.filter(function (p) { return p.id === planoId && p.unidade_id === unidadeId; })[0] || null;
        estado.unidade = unidades.filter(function (u) { return u.id === unidadeId; })[0] || null;
        if (r.status !== 200) throw new Error('catalogo');
        var visita = params.get('visita') === '1';
        var salaId = params.get('sala');
        if (estado.plano && salaId) {
          estado.sala = (estado.plano.salas || []).filter(function (s) { return s.id === salaId; })[0] || null;
        }
        if (estado.plano && (estado.plano.sobConsulta || visita)) {
          desenharPlano();
          if (visita) {
            document.title = 'Agendar visita: ' + (estado.sala ? estado.sala.nome : estado.plano.nome) + ' · CafeWorking';
            formProposta.querySelector('.loja-seguro').textContent = 'Conte quando prefere visitar e quantas pessoas vão usar a sala. A equipe confirma o horário com você.';
            formProposta.mensagem.placeholder = 'Ex.: visita na quinta à tarde, equipe de 3 pessoas';
            $('loja-proposta-enviar').textContent = 'Agendar visita';
          }
          formProposta.hidden = false;
          renderTurnstile();
          return null;
        }
        if (estado.sala && estado.sala.ocupada) {
          desenharPlano();
          $('loja-total').hidden = true;
          aviso('<p>A ' + Cards.escapar(estado.sala.nome) + ' está alugada no momento. Veja as outras salas ou agende uma visita e avisamos quando vagar.</p>' +
            '<a class="btn btn-primary" href="/salas-privativas#planos">Ver outras salas</a> ' +
            '<a class="btn btn-outline" href="' + Cards.escapar(Cards.urlContratar(estado.plano, estado.sala) + '&visita=1') + '">Agendar visita</a>');
          return null;
        }
        if (estado.plano && estado.plano.disponiveis === 0) {
          $('loja-titulo').textContent = estado.plano.nome + ': ocupada';
          aviso('<p>Todas as salas deste tamanho estão alugadas no momento. Agende uma visita e avisamos assim que uma vagar.</p>' +
            '<a class="btn btn-primary" href="' + Cards.escapar(Cards.urlContratar(estado.plano) + '&visita=1') + '">Agendar visita</a> ' +
            '<a class="btn btn-outline" href="/planos">Ver outros planos</a>');
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
        track('begin_checkout', { currency: 'BRL', value: itemDoPlano().price, item_category: estado.plano.categoria, items: [itemDoPlano()] });
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
      if (campo && Documento) Documento.erroNoCampo(campo, msg);
      if (campo) campo.focus();
    };
    var d = {
      nome: formProposta.nome.value.trim(), empresa: formProposta.empresa.value.trim(),
      telefone: formProposta.telefone.value.trim(), email: formProposta.email.value.trim(),
      mensagem: formProposta.mensagem.value.trim(),
    };
    limparErrosCampos(formProposta);
    var telProposta = Documento ? Documento.validarTelefone(d.telefone, true)
      : { ok: d.telefone.replace(/\D/g, '').length >= 10, erro: 'Informe um celular com DDD.' };
    if (d.nome.length < 3) return falha('Informe seu nome.', formProposta.nome);
    if (!telProposta.ok) return falha(telProposta.erro, formProposta.telefone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return falha('Informe um e-mail válido.', formProposta.email);
    if (!estado.turnstile) return falha(mensagemTurnstile());
    falha('');

    estado.enviando = true;
    var botao = $('loja-proposta-enviar');
    botao.disabled = true;
    botao.textContent = 'Enviando…';
    fetch(FN + 'lead-site', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, HEADERS),
      body: JSON.stringify(Object.assign(d, {
        unidade_id: estado.plano.unidade_id, plano_id: estado.plano.id, turnstile: estado.turnstile,
        pagina: location.pathname + (params.get('visita') === '1' ? ' (pedido de visita)' : '') + (estado.sala ? ' · ' + estado.sala.nome : ''),
      })),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { return { ok: r.ok, x: x }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.x.error || 'Não foi possível enviar o pedido.');
        formProposta.hidden = true;
        track('generate_lead', {
          lead_type: params.get('visita') === '1' ? 'visita' : 'proposta',
          item_id: estado.plano.id, item_name: estado.plano.nome, item_category: estado.plano.categoria, page_path: location.pathname,
        });
        aviso('<h2 class="h2">Pedido recebido</h2><p>A equipe do CafeWorking vai entrar em contato em até 1 dia útil, pelo WhatsApp ou pelo e-mail informado.</p>' +
          '<a class="btn btn-outline" href="/">Voltar ao site</a>');
      })
      .catch(function (err) {
        falha(err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Confira a internet e tente de novo.');
        resetTurnstile();
        estado.enviando = false;
        botao.disabled = false;
        botao.textContent = params.get('visita') === '1' ? 'Agendar visita' : 'Pedir proposta';
      });
  });

  // máscara enquanto digita e aviso junto do campo ao sair dele; a validação completa acontece no envio
  if (Documento) {
    Documento.ligarCampo(form.documento, Documento.mascararDocumento, Documento.validarDocumento);
    Documento.ligarCampo(form.telefone, Documento.mascararTelefone, function (v) { return Documento.validarTelefone(v); });
    Documento.ligarCampo(formProposta.telefone, Documento.mascararTelefone, function (v) { return Documento.validarTelefone(v, true); });
  }

  /** Erro junto do campo (com foco nele) e resumo no aviso geral do formulário. */
  function erroCampo(campo, msg) {
    if (Documento) Documento.erroNoCampo(campo, msg);
    // aviso perto do botão sem rolar a página: quem rola é o foco, até o campo
    $('loja-erro').textContent = msg;
    $('loja-erro').hidden = false;
    campo.focus();
  }

  function limparErrosCampos(f) {
    if (!Documento) return;
    ['nome', 'documento', 'telefone', 'email'].forEach(function (n) { if (f[n]) Documento.erroNoCampo(f[n], ''); });
  }

  form.addEventListener('change', function (e) {
    if (!estado.plano) return;
    if (e.target.name === 'turno') { estado.turno = e.target.value; }
    if (e.target.name === 'periodicidade') { estado.periodicidade = e.target.value; desenharPagamento(); }
    if (e.target.name === 'forma') { estado.forma = e.target.value; desenharPagamento(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (estado.enviando || !estado.plano || !estado.contrato) return;
    erro('');
    limparErrosCampos(form);

    var doc = Documento ? Documento.validarDocumento(form.documento.value) : { ok: true, valor: form.documento.value.replace(/[^0-9A-Za-z]/g, '') };
    var tel = Documento ? Documento.validarTelefone(form.telefone.value) : { ok: true };
    var d = {
      nome: form.nome.value.trim(),
      documento: doc.valor,
      email: form.email.value.trim(),
      telefone: form.telefone.value.trim(),
    };
    if (d.nome.length < 3) return erroCampo(form.nome, 'Informe o nome completo ou a razão social.');
    if (!doc.ok) return erroCampo(form.documento, doc.erro);
    if (!tel.ok) return erroCampo(form.telefone, tel.erro);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return erroCampo(form.email, 'Informe um e-mail válido. É por ele que você recebe o acesso.');
    if (estado.plano.escolhaTurno && !estado.turno) return erro('Escolha o turno: manhã ou tarde.'), $('loja-turno').scrollIntoView({ block: 'center' });
    if (!form.aceite.checked) return erro('Para continuar, aceite o contrato.'), form.aceite.focus();
    if (!estado.turnstile) return erro(mensagemTurnstile());

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
        turno: estado.turno || undefined,
        sala_id: estado.sala ? estado.sala.id : undefined,
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
              // pagamento.js usa estes campos para mostrar os próximos passos e medir a compra
              categoria: estado.plano.categoria, plano_id: estado.plano.id, recorrencia: estado.plano.recorrencia,
              abertura: !!(estado.plano.direitos && estado.plano.direitos.aberturaEmpresa), turno: estado.turno || '',
              checkoutUrl: x.checkoutUrl, pix_payload: x.pix_payload, pix_imagem: x.pix_imagem, boleto_url: x.boleto_url,
            }));
          } catch (_) { /* sem sessionStorage: a página de pagamento mostra o link da fatura */ }
          // cobrança gerada: dados enviados e aceitos pelo servidor
          track('add_payment_info', {
            currency: 'BRL', value: Number(x.valor) || itemDoPlano().price,
            payment_type: estado.periodicidade === 'mensal' ? 'CREDIT_CARD' : estado.forma,
            item_category: estado.plano.categoria, items: [itemDoPlano()],
          });
          // um instante para o evento sair antes de trocar de página
          setTimeout(function () { location.href = '/pagamento?t=' + encodeURIComponent(x.status_token); }, 300);
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
        if (x.codigo === 'SEM_DISPONIBILIDADE') {
          throw new Error(x.error || 'Esta sala acabou de ser alugada. Escolha outra sala ou agende uma visita.');
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
