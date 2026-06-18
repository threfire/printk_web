(function () {
  var storageKey = "panic-theme";
  var root = document.documentElement;
  var button = document.querySelector("[data-theme-toggle]");

  function applyTheme(theme) {
    if (theme === "light") {
      root.dataset.theme = "light";
    } else {
      delete root.dataset.theme;
    }

    if (button) {
      var isLight = theme === "light";
      button.setAttribute("aria-label", isLight ? "切换深色主题" : "切换亮色主题");
      button.setAttribute("title", isLight ? "切换深色主题" : "切换亮色主题");
      button.classList.toggle("is-light", isLight);
    }
  }

  applyTheme(localStorage.getItem(storageKey));

  if (button) {
    button.addEventListener("click", function () {
      var nextTheme = root.dataset.theme === "light" ? "dark" : "light";
      if (nextTheme === "light") {
        localStorage.setItem(storageKey, "light");
      } else {
        localStorage.removeItem(storageKey);
      }
      applyTheme(nextTheme);
    });
  }
})();
