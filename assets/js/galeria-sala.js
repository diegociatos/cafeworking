/**
 * Galeria de fotos da sala: clique na capa ([data-galeria]) abre as fotos em
 * tela cheia, com setas, teclado (← → Esc) e deslize no celular.
 *
 * Uso: <button data-galeria='["https://...","https://..."]' data-galeria-titulo="Sala X">
 * Funciona com cards gravados na página e com os trocados ao vivo (delegação).
 */
(function () {
  var dialogo = null;
  var fotos = [];
  var atual = 0;
  var origem = null;

  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto) e.textContent = texto;
    return e;
  }

  function montar() {
    dialogo = el('dialog', 'galeria');
    dialogo.setAttribute('aria-label', 'Fotos da sala');
    var topo = el('div', 'galeria-topo');
    var titulo = el('strong', 'galeria-titulo');
    var contador = el('span', 'galeria-contador');
    var fechar = el('button', 'galeria-fechar', '×');
    fechar.type = 'button';
    fechar.setAttribute('aria-label', 'Fechar');
    topo.append(titulo, contador, fechar);

    var palco = el('div', 'galeria-palco');
    var img = el('img', 'galeria-img');
    img.alt = '';
    var ant = el('button', 'galeria-seta galeria-ant', '‹');
    var prox = el('button', 'galeria-seta galeria-prox', '›');
    ant.type = prox.type = 'button';
    ant.setAttribute('aria-label', 'Foto anterior');
    prox.setAttribute('aria-label', 'Próxima foto');
    palco.append(ant, img, prox);

    var miniaturas = el('div', 'galeria-miniaturas');
    dialogo.append(topo, palco, miniaturas);
    document.body.appendChild(dialogo);

    fechar.addEventListener('click', function () { dialogo.close(); });
    ant.addEventListener('click', function () { mostrar(atual - 1); });
    prox.addEventListener('click', function () { mostrar(atual + 1); });
    // clique fora da foto (no fundo) fecha
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo || e.target === palco) dialogo.close(); });
    miniaturas.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (b) mostrar(Number(b.getAttribute('data-i')));
    });
    dialogo.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') mostrar(atual - 1);
      if (e.key === 'ArrowRight') mostrar(atual + 1);
    });
    dialogo.addEventListener('close', function () {
      document.documentElement.classList.remove('galeria-aberta');
      if (origem) origem.focus();
    });
    var inicioX = null;
    palco.addEventListener('touchstart', function (e) { inicioX = e.touches[0].clientX; }, { passive: true });
    palco.addEventListener('touchend', function (e) {
      if (inicioX === null) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 40) mostrar(atual + (dx < 0 ? 1 : -1));
      inicioX = null;
    });
  }

  function mostrar(i) {
    atual = (i + fotos.length) % fotos.length;
    var img = dialogo.querySelector('.galeria-img');
    img.src = fotos[atual];
    img.alt = dialogo.querySelector('.galeria-titulo').textContent + ', foto ' + (atual + 1);
    dialogo.querySelector('.galeria-contador').textContent = fotos.length > 1 ? (atual + 1) + ' de ' + fotos.length : '';
    dialogo.querySelectorAll('.galeria-seta').forEach(function (b) { b.hidden = fotos.length < 2; });
    dialogo.querySelectorAll('[data-i]').forEach(function (b) {
      b.setAttribute('aria-current', String(Number(b.getAttribute('data-i')) === atual));
    });
  }

  function abrir(botao) {
    var lista;
    try { lista = JSON.parse(botao.getAttribute('data-galeria') || '[]'); } catch (_) { lista = []; }
    fotos = lista.filter(function (f) { return typeof f === 'string' && (/^https:\/\//.test(f) || /^\/assets\/img\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(f)); });
    if (!fotos.length) return;
    if (!dialogo) montar();
    origem = botao;
    dialogo.querySelector('.galeria-titulo').textContent = botao.getAttribute('data-galeria-titulo') || 'Fotos da sala';
    var miniaturas = dialogo.querySelector('.galeria-miniaturas');
    miniaturas.innerHTML = '';
    miniaturas.hidden = fotos.length < 2;
    fotos.forEach(function (f, i) {
      var b = el('button');
      b.type = 'button';
      b.setAttribute('data-i', i);
      b.setAttribute('aria-label', 'Foto ' + (i + 1));
      var m = el('img');
      m.src = f;
      m.alt = '';
      m.loading = 'lazy';
      b.appendChild(m);
      miniaturas.appendChild(b);
    });
    mostrar(0);
    document.documentElement.classList.add('galeria-aberta');
    dialogo.showModal();
  }

  document.addEventListener('click', function (e) {
    var botao = e.target.closest && e.target.closest('[data-galeria]');
    if (!botao) return;
    e.preventDefault();
    abrir(botao);
  });
})();
