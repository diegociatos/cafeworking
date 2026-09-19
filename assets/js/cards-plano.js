/**
 * Cards dos planos vendidos pelo site.
 *
 * Os planos vêm do app do CafeWorking (Edge Function planos-publicos). O mesmo
 * desenho é usado em dois lugares, por isso este arquivo funciona no Node e no
 * navegador:
 *   - scripts/vitrine.js grava os cards no HTML na publicação (Netlify);
 *   - assets/js/vitrine.js confere ao vivo e troca se o app mudou algo.
 */
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.CWCards = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function escapar(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function precoBRL(n) {
    var v = Number(n) || 0;
    var centavos = Math.round(v * 100) % 100 !== 0;
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: 2 });
  }

  function beneficiosDoPlano(p) {
    var lista = Array.isArray(p.beneficios) ? p.beneficios.filter(Boolean).slice() : [];
    if (!lista.length) {
      var d = p.direitos || {};
      if (d.horasReuniao > 0) lista.push(d.horasReuniao + 'h/mês de sala de reunião');
      if (d.horasCoworking > 0) lista.push(d.horasCoworking + 'h/mês de coworking');
      if (d.dayPass > 0) lista.push(d.dayPass + ' day pass por mês');
      if (d.correspondencias > 0) lista.push(d.correspondencias + ' correspondências/mês');
      if (d.cafeIncluso) lista.push('Café incluso');
    }
    if (p.recorrencia === 'mensal' && p.prazoMinimoMeses > 0) {
      lista.push('Fidelidade de ' + p.prazoMinimoMeses + (p.prazoMinimoMeses === 1 ? ' mês' : ' meses') + ' no mensal');
    }
    return lista;
  }

  /** "CafeWorkingLuxemburgo" → "Luxemburgo" (o nome no app repete a marca). */
  function nomeUnidade(nome) {
    return String(nome || '').replace(/^\s*cafe\s*working\s*/i, '').trim() || String(nome || '');
  }

  function urlContratar(p, sala) {
    return '/contratar?plano=' + encodeURIComponent(p.id) + '&unidade=' + encodeURIComponent(p.unidade_id) +
      (sala ? '&sala=' + encodeURIComponent(sala.id) : '');
  }

  var FOTO_ILUSTRATIVA = '/assets/img/real/salas-privativas/sala-4-lugares.webp';
  var FOTOS_LOCAIS = {
    s1782420700809: '/assets/img/real/salas-privativas/sala-savassi.png?v=savassi-20260919',
    s1782420821947: '/assets/img/real/salas-privativas/sala-belvedere.jpg?v=belvedere-20260919',
    s_lux_santa_tereza: '/assets/img/real/salas-privativas/sala-santa-tereza.jpg?v=santa-tereza-20260919',
  };
  var INVENTARIO_PRIVATIVAS = {
    un_cafeworkingluxembu_e78be3: [
      { id: 's1782420821947', nome: 'Sala Belvedere', capacidade: 5, ocupada: true, fotos: [] },
      { id: 's1782420889913', nome: 'Sala Mangabeiras', capacidade: 5, ocupada: true, fotos: [] },
      { id: 's_lux_funcionarios', nome: 'Sala Funcionários', capacidade: 6, ocupada: true, fotos: [] },
      { id: 's_lux_santa_tereza', nome: 'Sala Santa Tereza', capacidade: 7, ocupada: true, fotos: [] },
    ],
  };

  /** Capa da sala: abre a galeria (galeria-sala.js). Sem foto cadastrada, mostra uma ilustrativa. */
  function capaSala(sala) {
    var fotos = (sala.fotos || []).filter(function (f) { return /^https:\/\//.test(f); });
    if (FOTOS_LOCAIS[sala.id]) fotos.unshift(FOTOS_LOCAIS[sala.id]);
    if (!fotos.length) {
      return '<div class="sala-capa"><img loading="lazy" src="' + FOTO_ILUSTRATIVA + '" alt=""><small>Foto ilustrativa</small></div>';
    }
    return '<button type="button" class="sala-capa" data-galeria="' + escapar(JSON.stringify(fotos)) + '" data-galeria-titulo="' + escapar(sala.nome) + '"' +
      ' aria-label="Ver fotos da ' + escapar(sala.nome) + '">' +
      '<img loading="lazy" src="' + escapar(fotos[0]) + '" alt="' + escapar(sala.nome) + '">' +
      '<small>Ver fotos' + (fotos.length > 1 ? ' (' + fotos.length + ')' : '') + '</small></button>';
  }

  /** Card de uma sala privativa específica: nome e fotos da sala, preço e contrato do plano. */
  function cardSala(p, sala) {
    var h = '<article class="fiscal-card sala-card' + (sala.ocupada ? ' fiscal-card-ocupada' : '') + '">';
    h += capaSala(sala);
    h += '<span>' + (sala.ocupada ? 'Ocupada' : 'Disponível') + '</span>';
    h += '<h3>' + escapar(sala.nome) + '</h3>';
    h += '<p class="sala-sub">Sala privativa para ' + escapar(sala.capacidade || p.capacidade) + ' pessoas</p>';
    h += '<p class="fiscal-price">' + escapar(precoBRL(p.preco)) + '<span>/mês</span></p>';
    if (p.precoAnual && !sala.ocupada) {
      h += '<p class="fiscal-anual">ou ' + escapar(precoBRL(p.precoAnual)) + ' no plano anual (' + escapar(p.descontoAnualPct) + '% de desconto)</p>';
    }
    if (sala.descricao) h += '<p class="sala-descricao">' + escapar(sala.descricao) + '</p>';
    var itens = beneficiosDoPlano(p);
    h += '<ul>' + itens.map(function (b) { return '<li>' + escapar(b) + '</li>'; }).join('') + '</ul>';
    if (sala.ocupada) {
      return h + '<a class="btn btn-outline" href="' + escapar(urlContratar(p, sala) + '&visita=1') + '">Entrar na fila (agendar visita)</a></article>';
    }
    h += '<a class="btn btn-primary" href="' + escapar(urlContratar(p, sala)) + '">Quero esta sala</a>';
    h += '<a class="btn btn-outline fiscal-card-visita" href="' + escapar(urlContratar(p, sala) + '&visita=1') + '">Agendar visita</a>';
    return h + '</article>';
  }

  /** Cards de um plano: sala privativa com salas cadastradas vira um card por sala. */
  function cardsDoPlano(p) {
    if (p.categoria === 'sala_privativa' && Array.isArray(p.salas) && p.salas.length && !p.sobConsulta) {
      var salas = p.salas.slice();
      (INVENTARIO_PRIVATIVAS[p.unidade_id] || []).forEach(function (s) {
        if (!salas.some(function (existente) { return existente.id === s.id; })) salas.push(s);
      });
      return salas.map(function (s) { return cardSala(p, s); }).join('');
    }
    return cardPlano(p);
  }

  function cardPlano(p) {
    // sala privativa sem sala livre do tamanho: aparece, mas não vende
    var ocupada = p.categoria === 'sala_privativa' && p.disponiveis === 0;
    var h = '<article class="fiscal-card' + (p.destaque && !ocupada ? ' featured' : '') + (ocupada ? ' fiscal-card-ocupada' : '') + '">';
    if (ocupada) h += '<span>Ocupada</span>';
    else if (p.destaque) h += '<span>' + escapar(p.destaque) + '</span>';
    h += '<h3>' + escapar(p.nome) + '</h3>';

    if (p.sobConsulta) {
      h += '<p class="fiscal-price fiscal-price-consulta">Sob consulta</p>';
    } else {
      h += '<p class="fiscal-price">' + escapar(precoBRL(p.preco)) + (p.recorrencia === 'mensal' ? '<span>/mês</span>' : '') + '</p>';
      if (p.precoAnual) {
        h += '<p class="fiscal-anual">ou ' + escapar(precoBRL(p.precoAnual)) + ' no plano anual (' + escapar(p.descontoAnualPct) + '% de desconto)</p>';
      }
    }

    var itens = beneficiosDoPlano(p);
    h += '<ul>' + itens.map(function (b) { return '<li>' + escapar(b) + '</li>'; }).join('') + '</ul>';

    if (ocupada) {
      return h + '<p class="fiscal-disponiveis">Todas alugadas no momento</p>' +
        '<a class="btn btn-outline" href="' + escapar(urlContratar(p) + '&visita=1') + '">Entrar na fila (agendar visita)</a></article>';
    }
    if (p.categoria === 'sala_privativa' && p.disponiveis > 0) {
      h += '<p class="fiscal-disponiveis">' + (p.disponiveis === 1 ? 'Última sala disponível' : p.disponiveis + ' salas disponíveis') + '</p>';
    }

    // sob consulta abre o formulário de proposta na mesma página de contratação
    h += p.sobConsulta
      ? '<a class="btn btn-outline" href="' + escapar(urlContratar(p)) + '">Pedir proposta</a>'
      : '<a class="btn btn-primary" href="' + escapar(urlContratar(p)) + '">Quero este plano</a>';
    // sala privativa: também dá para conhecer antes de fechar
    if (p.categoria === 'sala_privativa' && !p.sobConsulta) {
      h += '<a class="btn btn-outline fiscal-card-visita" href="' + escapar(urlContratar(p) + '&visita=1') + '">Agendar visita</a>';
    }
    return h + '</article>';
  }

  /** HTML da vitrine de uma categoria. Vazio quando não há plano: a página mantém o que já tem. */
  /**
   * opts.escolhida: unidade que o visitante escolheu (abre nela, se tiver planos);
   * opts.principal: unidade padrão (Luxemburgo). As demais seguem por nome.
   */
  function renderVitrine(dados, categoria, opts) {
    opts = opts || {};
    if (!dados || !Array.isArray(dados.planos)) return '';
    var planos = dados.planos.filter(function (p) { return p.categoria === categoria; });
    if (!planos.length) return '';

    var unidades = (dados.unidades || []).filter(function (u) {
      return planos.some(function (p) { return p.unidade_id === u.id; });
    });
    if (!unidades.length) unidades = [{ id: planos[0].unidade_id, nome: '' }];
    var peso = function (u) { return u.id === opts.escolhida ? 0 : u.id === opts.principal ? 1 : 2; };
    unidades = unidades.slice().sort(function (a, b) {
      return peso(a) - peso(b) || nomeUnidade(a.nome).localeCompare(nomeUnidade(b.nome), 'pt-BR');
    });

    var grade = function (u, oculta) {
      var cards = planos.filter(function (p) { return p.unidade_id === u.id; })
        .map(cardsDoPlano).join('');
      return '<div class="fiscal-pricing" data-vitrine-unidade="' + escapar(u.id) + '"' + (oculta ? ' hidden' : '') + '>' + cards + '</div>';
    };

    if (unidades.length === 1) return grade(unidades[0], false);

    var abas = '<div class="vitrine-abas" role="tablist" aria-label="Escolha a unidade">' +
      unidades.map(function (u, i) {
        return '<button type="button" role="tab" data-vitrine-aba="' + escapar(u.id) + '" aria-selected="' + (i === 0) + '">' + escapar(nomeUnidade(u.nome)) + '</button>';
      }).join('') + '</div>';
    return abas + unidades.map(function (u, i) { return grade(u, i > 0); }).join('');
  }

  return {
    escapar: escapar, precoBRL: precoBRL, beneficiosDoPlano: beneficiosDoPlano, nomeUnidade: nomeUnidade,
    urlContratar: urlContratar, cardPlano: cardPlano, cardSala: cardSala, capaSala: capaSala, renderVitrine: renderVitrine,
  };
});
