
document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.querySelector(".mobile-toggle");
  const menu = document.querySelector(".cw-menu");

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      document.body.classList.toggle("mobile-menu-open");
      toggle.setAttribute("aria-expanded", document.body.classList.contains("mobile-menu-open") ? "true" : "false");
      toggle.textContent = document.body.classList.contains("mobile-menu-open") ? "×" : "☰";
    });
  }

  document.querySelectorAll(".cw-dropdown > .cw-menu-link").forEach(function (link) {
    link.setAttribute("aria-expanded", "false");

    link.addEventListener("click", function (e) {
      if (window.innerWidth <= 980) {
        e.preventDefault();
        const parent = link.closest(".cw-dropdown");
        const willOpen = !parent.classList.contains("mobile-open");

        document.querySelectorAll(".cw-dropdown.mobile-open").forEach(function (dropdown) {
          if (dropdown !== parent) {
            dropdown.classList.remove("mobile-open");
            const dropdownLink = dropdown.querySelector(".cw-menu-link");
            if (dropdownLink) dropdownLink.setAttribute("aria-expanded", "false");
          }
        });

        parent.classList.toggle("mobile-open", willOpen);
        link.setAttribute("aria-expanded", willOpen ? "true" : "false");
      }
    });
  });
});
