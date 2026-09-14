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

  function urlContratar(p) {
    return '/contratar?plano=' + encodeURIComponent(p.id) + '&unidade=' + encodeURIComponent(p.unidade_id);
  }

  function cardPlano(p) {
    var h = '<article class="fiscal-card' + (p.destaque ? ' featured' : '') + '">';
    if (p.destaque) h += '<span>' + escapar(p.destaque) + '</span>';
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

    // sob consulta abre o formulário de proposta na mesma página de contratação
    h += p.sobConsulta
      ? '<a class="btn btn-outline" href="' + escapar(urlContratar(p)) + '">Pedir proposta</a>'
      : '<a class="btn btn-primary" href="' + escapar(urlContratar(p)) + '">Quero este plano</a>';
    return h + '</article>';
  }

  /** HTML da vitrine de uma categoria. Vazio quando não há plano: a página mantém o que já tem. */
  function renderVitrine(dados, categoria) {
    if (!dados || !Array.isArray(dados.planos)) return '';
    var planos = dados.planos.filter(function (p) { return p.categoria === categoria; });
    if (!planos.length) return '';

    var unidades = (dados.unidades || []).filter(function (u) {
      return planos.some(function (p) { return p.unidade_id === u.id; });
    });
    if (!unidades.length) unidades = [{ id: planos[0].unidade_id, nome: '' }];

    var grade = function (u, oculta) {
      var cards = planos.filter(function (p) { return p.unidade_id === u.id; })
        .map(function (p) { return cardPlano(p); }).join('');
      return '<div class="fiscal-pricing" data-vitrine-unidade="' + escapar(u.id) + '"' + (oculta ? ' hidden' : '') + '>' + cards + '</div>';
    };

    if (unidades.length === 1) return grade(unidades[0], false);

    var abas = '<div class="vitrine-abas" role="tablist" aria-label="Escolha a unidade">' +
      unidades.map(function (u, i) {
        return '<button type="button" role="tab" data-vitrine-aba="' + escapar(u.id) + '" aria-selected="' + (i === 0) + '">' + escapar(u.nome) + '</button>';
      }).join('') + '</div>';
    return abas + unidades.map(function (u, i) { return grade(u, i > 0); }).join('');
  }

  return {
    escapar: escapar, precoBRL: precoBRL, beneficiosDoPlano: beneficiosDoPlano,
    urlContratar: urlContratar, cardPlano: cardPlano, renderVitrine: renderVitrine,
  };
});
