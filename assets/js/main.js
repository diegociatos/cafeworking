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
    // âncoras da mesma página: rolagem suave e fecha o menu do celular
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var alvo = document.getElementById(id.slice(1));
        if (!alvo) return;
        e.preventDefault();
        alvo.scrollIntoView({ behavior: 'smooth' });
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
