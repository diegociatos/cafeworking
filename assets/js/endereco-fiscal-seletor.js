(function () {
  var raiz = document.querySelector('[data-fiscal-seletor]');
  var loja = window.CW_LOJA;
  if (!raiz || !loja) return;

  var cidade = raiz.querySelector('[data-fiscal-cidade]');
  var unidade = raiz.querySelector('[data-fiscal-unidade]');
  var status = document.querySelector('[data-fiscal-status]');
  var fotos = {
    un_cafeworkingluxembu_e78be3: '/assets/img/real/fachada/fachada-dia.webp',
    un_cafeworkingestoril_a1c7e2: '/assets/img/real/estoril/parque-avenida-estoril.png',
  };
  var fallback = [
    { id: 'un_cafeworkingluxembu_e78be3', nome: 'Luxemburgo', cidade: 'Belo Horizonte', uf: 'MG', endereco: 'Rua Guaicuí, 715, Luxemburgo · Belo Horizonte/MG' },
    { id: 'un_cafeworkingestoril_a1c7e2', nome: 'Estoril', cidade: 'Belo Horizonte', uf: 'MG', endereco: 'Av. Raja Gabaglia, 2000, Estoril · Belo Horizonte/MG' },
  ];
  var unidades = fallback;

  function nome(s) { return String(s || '').replace(/^\s*cafe\s*working\s*/i, '').trim(); }
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cidadeChave(u) { return String(u.cidade || '').trim() || 'Cidade não informada'; }
  function rotuloCidade(u) { return cidadeChave(u) + (u.uf && cidadeChave(u).indexOf('/') < 0 ? '/' + u.uf : ''); }

  function preencherCidades() {
    var lista = [];
    unidades.forEach(function (u) { if (lista.indexOf(cidadeChave(u)) < 0) lista.push(cidadeChave(u)); });
    lista.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    cidade.innerHTML = lista.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
  }

  function preencherUnidades(preferida) {
    var daCidade = unidades.filter(function (u) { return cidadeChave(u) === cidade.value; });
    unidade.innerHTML = daCidade.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(nome(u.nome)) + '</option>'; }).join('');
    if (preferida && daCidade.some(function (u) { return u.id === preferida; })) unidade.value = preferida;
    atualizar();
  }

  function atualizar() {
    var atual = unidades.filter(function (u) { return u.id === unidade.value; })[0];
    if (!atual) return;
    var foto = (Array.isArray(atual.fotos) && atual.fotos[0]) || atual.foto || fotos[atual.id] || '/assets/img/og/og-endereco-fiscal.jpg';
    raiz.querySelector('[data-fiscal-foto]').src = foto;
    raiz.querySelector('[data-fiscal-foto]').alt = 'Unidade CafeWorking ' + nome(atual.nome);
    raiz.querySelector('[data-fiscal-cidade-rotulo]').textContent = rotuloCidade(atual);
    raiz.querySelector('[data-fiscal-nome]').textContent = 'Unidade ' + nome(atual.nome);
    raiz.querySelector('[data-fiscal-endereco]').textContent = atual.endereco || 'Endereço completo disponível na contratação.';
    try { localStorage.setItem('cw_unidade', atual.id); } catch (_) {}
    var aba = document.querySelector('[data-vitrine-aba="' + atual.id + '"]');
    if (aba) aba.click();
    status.textContent = 'Unidade ' + nome(atual.nome) + ' selecionada.';
  }

  cidade.addEventListener('change', function () { preencherUnidades(); });
  unidade.addEventListener('change', atualizar);
  raiz.querySelector('[data-fiscal-planos]').addEventListener('click', atualizar);

  function iniciar(lista) {
    unidades = lista && lista.length ? lista : fallback;
    preencherCidades();
    var pedida = new URLSearchParams(location.search).get('unidade');
    try { pedida = pedida || localStorage.getItem('cw_unidade'); } catch (_) {}
    var escolhida = unidades.filter(function (u) { return u.id === pedida; })[0] || unidades[0];
    cidade.value = cidadeChave(escolhida);
    preencherUnidades(escolhida.id);
  }

  Promise.all([
    fetch(loja.supabaseUrl + '/functions/v1/planos-publicos?site=1&categoria=endereco_fiscal', { headers: { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey } }).then(function (r) { return r.ok ? r.json() : null; }),
    fetch(loja.supabaseUrl + '/functions/v1/unidades-publicas', { headers: { apikey: loja.anonKey, authorization: 'Bearer ' + loja.anonKey } }).then(function (r) { return r.ok ? r.json() : null; }),
  ]).then(function (res) {
    var catalogo = res[0] || {};
    var publicas = (res[1] && res[1].unidades) || [];
    var ids = {};
    (catalogo.planos || []).forEach(function (p) { if (p.categoria === 'endereco_fiscal' && !p.sobConsulta) ids[p.unidade_id] = true; });
    var base = (catalogo.unidades || []).filter(function (u) { return ids[u.id]; }).map(function (u) {
      var publica = publicas.filter(function (p) { return p.id === u.id; })[0] || {};
      return Object.assign({}, u, publica, { nome: publica.nome || u.nome, cidade: publica.cidade || u.cidade });
    });
    iniciar(base);
  }).catch(function () { iniciar(fallback); });
})();
