/*
 * What pensionslyft.se adds to a calculator that it shows straight from github.com/mathiasboos/Calculators
 * (scripts/sync-apps.mjs puts it in the file's <head>).
 *
 * - The language is the site's: the page puts it in the address of the frame (?lang=sv or ?lang=en). When the file has
 *   started, its own switch is used to change to it (the file's SV | EN buttons are hidden on the site, whose own
 *   switch changes the page and with it the language of the frame). Until then the file stays hidden, so the wrong
 *   language does not flash; after 1.5 seconds it is shown whatever happens.
 * - A link in the file to the site opens in the whole window, and a link to another site in a new one, instead of
 *   replacing the calculator inside its frame.
 */
(function () {
  var root = document.documentElement;
  var wanted = /[?&]lang=(sv|en)\b/.exec(location.search);
  var lang = wanted ? wanted[1] : "sv";

  function show() {
    root.classList.add("pl-ready");
  }
  var fallback = setTimeout(show, 1500);

  function switchTo(code) {
    var buttons = document.querySelectorAll(".lang-btn");
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      var named = button.getAttribute("data-lang");
      var handler = button.getAttribute("onclick") || "";
      if (named === code || handler.indexOf("'" + code + "'") >= 0 || handler.indexOf('"' + code + '"') >= 0) {
        if (!button.classList.contains("active")) button.click();
        return;
      }
    }
    if (typeof window.setLang === "function") window.setLang(code);
  }

  function links() {
    var anchors = document.querySelectorAll("a[href]");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var href = a.getAttribute("href") || "";
      if (!/^https?:/i.test(href)) continue;
      var host = "";
      try {
        host = new URL(href).hostname;
      } catch (e) {
        continue;
      }
      if (host === "pensionslyft.se" || host === "www.pensionslyft.se") a.target = "_top";
      else {
        a.target = "_blank";
        a.rel = "noopener";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    // This handler was added before the file's own ones and runs first; the timeout lets them run before the switch.
    setTimeout(function () {
      try {
        switchTo(lang);
        links();
      } finally {
        clearTimeout(fallback);
        show();
      }
    }, 0);
  });
})();
