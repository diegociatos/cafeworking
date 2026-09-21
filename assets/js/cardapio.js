(function () {
  'use strict';
  var produtos = [], unidade = '', categoria = 'Todos';
  var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function el(tag, classe, texto) { var e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; }
  function desenhar() {
    var caixa = document.querySelector('[data-cardapio-produtos]'), status = document.querySelector('[data-cardapio-status]');
    var lista = produtos.filter(function (p) { return (!unidade || p.unidade_id === unidade) && (categoria === 'Todos' || p.categoria === categoria); });
    caixa.replaceChildren(); status.hidden = lista.length > 0;
    if (!lista.length) { status.textContent = 'Nenhum produto publicado nesta seleção. Fale com a equipe para conhecer as opções do dia.'; return; }
    lista.forEach(function (p) {
      var card = el('article', 'cardapio-produto'), media = el('div', 'cardapio-produto-foto');
      if (p.foto) {
        var img = el('img'); img.src = p.foto; img.alt = p.nome; img.loading = 'lazy'; img.decoding = 'async';
        img.addEventListener('error', function () { media.classList.add('sem-foto'); media.replaceChildren(el('span', '', p.emoji || '☕')); }); media.appendChild(img);
      } else { media.classList.add('sem-foto'); media.appendChild(el('span', '', p.emoji || '☕')); }
      var corpo = el('div', 'cardapio-produto-corpo'); corpo.appendChild(el('small', '', p.categoria)); corpo.appendChild(el('h3', '', p.nome)); corpo.appendChild(el('strong', '', moeda.format(Number(p.preco) || 0)));
      card.append(media, corpo); caixa.appendChild(card);
    });
  }
  function filtros() {
    var caixa = document.querySelector('[data-cardapio-filtros]');
    var cats = ['Todos'].concat(Array.from(new Set(produtos.filter(function (p) { return !unidade || p.unidade_id === unidade; }).map(function (p) { return p.categoria; }))));
    if (cats.indexOf(categoria) < 0) categoria = 'Todos'; caixa.replaceChildren();
    cats.forEach(function (cat) { var b = el('button', cat === categoria ? 'ativo' : '', cat); b.type = 'button'; b.setAttribute('aria-pressed', String(cat === categoria)); b.addEventListener('click', function () { categoria = cat; filtros(); desenhar(); }); caixa.appendChild(b); });
  }
  async function iniciar() {
    var status = document.querySelector('[data-cardapio-status]'), cfg = window.CAFEWORKING_LOJA || {};
    if (!cfg.supabaseUrl || !cfg.anonKey) { status.textContent = 'Cardápio temporariamente indisponível. Fale com a equipe pelo WhatsApp.'; return; }
    try {
      var resposta = await fetch(cfg.supabaseUrl + '/functions/v1/cardapio-publico', { headers: { apikey: cfg.anonKey, authorization: 'Bearer ' + cfg.anonKey } });
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      var dados = await resposta.json(); produtos = Array.isArray(dados.produtos) ? dados.produtos : [];
      var unidades = Array.isArray(dados.unidades) ? dados.unidades.filter(function (u) { return produtos.some(function (p) { return p.unidade_id === u.id; }); }) : [];
      if (unidades.length) unidade = unidades[0].id;
      var label = document.querySelector('.cardapio-unidade'), select = document.querySelector('[data-cardapio-unidade]');
      if (unidades.length > 1) { label.hidden = false; unidades.forEach(function (u) { var o = el('option', '', u.nome + (u.cidade ? ' · ' + u.cidade : '')); o.value = u.id; select.appendChild(o); }); select.addEventListener('change', function () { unidade = select.value; categoria = 'Todos'; filtros(); desenhar(); }); }
      filtros(); desenhar();
    } catch (_) { status.textContent = 'Não foi possível carregar o cardápio agora. Fale com a equipe pelo WhatsApp.'; }
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
