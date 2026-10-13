/*
 * What pensionslyft.se adds to the Pensionsplaneraren (Retirement_Planner.html in github.com/mathiasboos/Calculators).
 * scripts/sync-pensionsplaneraren.mjs puts it in the app's <head>, after the bundled Chart.js and before the app's own
 * code, so it must not depend on anything but Chart.js and the app's global functions once the page is loaded.
 *
 * - Swedish is the language on the site. The app starts in English, so once its own start-up has run, the language is
 *   switched with the app's own setLang(). A visitor who clicks EN or SV keeps that choice in this browser.
 *   Until then the page stays hidden (scripts/pensionsplaneraren-theme.css), so the English texts do not flash; after
 *   1.5 seconds it is shown whatever happens.
 * - The charts' own tooltips are white with ink text, as on the site's other calculators (the app draws them dark), and
 *   the charts use the site's font. They are drawn again when the fonts have loaded.
 */
(function () {
  var KEY = "pensionslyft.planner.lang";
  var root = document.documentElement;

  function chosen() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  // A click on EN or SV in the app's header is the visitor's own choice.
  document.addEventListener(
    "click",
    function (event) {
      var button = event.target && event.target.closest ? event.target.closest(".lang-btn[data-lang]") : null;
      if (!button) return;
      try {
        localStorage.setItem(KEY, button.getAttribute("data-lang"));
      } catch (e) {
        /* private mode: the choice lasts for this page only */
      }
    },
    true,
  );

  function show() {
    root.classList.add("pl-ready");
  }
  var fallback = setTimeout(show, 1500);

  document.addEventListener("DOMContentLoaded", function () {
    // This handler was added before the app's own ones and runs first; the timeout lets them run before the switch.
    setTimeout(function () {
      try {
        var lang = chosen() || "sv";
        if (typeof window.setLang === "function" && root.lang !== lang) window.setLang(lang);
      } finally {
        clearTimeout(fallback);
        show();
      }
    }, 0);
  });

  var Chart = window.Chart;
  if (!Chart) return;
  var ink = "#0f2034";
  var muted = "#545f6c";
  Chart.defaults.font.family = '"Inter", ui-sans-serif, system-ui, sans-serif';
  Chart.defaults.color = muted;
  Chart.register({
    id: "pensionslyftTooltip",
    beforeInit: function (chart) {
      var options = chart.config.options || (chart.config.options = {});
      var plugins = options.plugins || (options.plugins = {});
      var tooltip = plugins.tooltip || (plugins.tooltip = {});
      // A chart whose tooltip the app draws itself as HTML is made white by the stylesheet.
      if (tooltip.enabled === false) return;
      tooltip.backgroundColor = "#ffffff";
      tooltip.titleColor = ink;
      tooltip.bodyColor = ink;
      tooltip.footerColor = muted;
      tooltip.borderColor = "#e7e5e0";
      tooltip.borderWidth = 1;
    },
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      Object.values(Chart.instances || {}).forEach(function (chart) {
        try {
          chart.update("none");
        } catch (e) {
          /* a chart that is being replaced */
        }
      });
    });
  }
})();
