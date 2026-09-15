/**
 * Menu do celular (até 980px): o botão ☰ abre a gaveta (body.mobile-menu-open)
 * e, dentro dela, cada item com submenu abre por toque (.cw-dropdown.mobile-open).
 * No desktop os dropdowns abrem por hover/foco, pelo CSS.
 */
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".mobile-toggle");
  var menu = document.querySelector(".cw-menu");

  function definirAberto(aberto) {
    document.body.classList.toggle("mobile-menu-open", aberto);
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
    toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    toggle.textContent = aberto ? "×" : "☰";
  }

  if (toggle && menu) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", function () {
      definirAberto(!document.body.classList.contains("mobile-menu-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("mobile-menu-open")) {
        definirAberto(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 980 && document.body.classList.contains("mobile-menu-open")) definirAberto(false);
    });
  }

  document.querySelectorAll(".cw-dropdown > .cw-menu-link").forEach(function (link) {
    link.setAttribute("aria-expanded", "false");

    link.addEventListener("click", function (e) {
      if (window.innerWidth > 980) return;
      e.preventDefault();
      var parent = link.closest(".cw-dropdown");
      var willOpen = !parent.classList.contains("mobile-open");

      document.querySelectorAll(".cw-dropdown.mobile-open").forEach(function (dropdown) {
        if (dropdown !== parent) {
          dropdown.classList.remove("mobile-open");
          var dropdownLink = dropdown.querySelector(".cw-menu-link");
          if (dropdownLink) dropdownLink.setAttribute("aria-expanded", "false");
        }
      });

      parent.classList.toggle("mobile-open", willOpen);
      link.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });
});
