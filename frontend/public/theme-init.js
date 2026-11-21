(function () {
  try {
    var isHome = window.location.pathname === "/" || window.location.pathname === "";
    if (isHome) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("entre-cartas:theme", "dark");
    } else {
      var stored = localStorage.getItem("entre-cartas:theme");
      var theme = stored || "dark";
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
