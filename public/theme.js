(function () {
  const STORAGE_KEY = "portal-theme";

  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return null;
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
      localStorage.setItem(STORAGE_KEY, theme);
    } else {
      root.removeAttribute("data-theme");
      localStorage.removeItem(STORAGE_KEY);
    }

    const button = document.getElementById("theme-toggle");
    if (button) {
      const isDark = (root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
      button.textContent = isDark ? "Tema: Escuro" : "Tema: Claro";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const initial = getInitialTheme();
    applyTheme(initial);

    const button = document.getElementById("theme-toggle");
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  });
})();
