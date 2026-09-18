/**
 * Comportamentos comuns a todas as páginas.
 * O menu do celular (abrir, fechar e dropdowns) fica em mobile-menu.js.
 */
(function () {
  // service worker: navegação offline e cache das imagens (sw.js)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* sem SW, o site funciona igual */ });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var main = document.querySelector('main');
    if (main) {
      if (!main.id) main.id = 'conteudo-principal';
      main.setAttribute('tabindex', '-1');
      var atalho = document.createElement('a');
      atalho.href = '#' + main.id;
      atalho.className = 'cw-skip-link';
      atalho.textContent = 'Pular para o conteúdo';
      document.body.insertBefore(atalho, document.body.firstChild);
      atalho.addEventListener('click', function () { main.focus(); });
    }
    // âncoras da mesma página: rolagem suave e fecha o menu do celular
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var alvo = document.getElementById(id.slice(1));
        if (!alvo) return;
        e.preventDefault();
        alvo.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', id);
        if (document.body.classList.contains('mobile-menu-open')) {
          document.body.classList.remove('mobile-menu-open');
          var toggle = document.querySelector('.mobile-toggle');
          if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = '☰'; }
        }
      });
    });
  });
})();
