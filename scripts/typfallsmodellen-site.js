/*
 * What pensionslyft.se adds to the Typfallsmodellen app, which is built from another project (see
 * scripts/sync-typfallsmodellen.mjs): the table "Månadsinkomster" can be folded in and out, like the tables of the other
 * calculators (an arrow at the far left of the title bar, then the name), and it is folded in from the start.
 *
 * The app builds its results again on every change, which makes a new table, so the state is kept here, outside the
 * page, and put on the new table as soon as it is there. The title bar's buttons (Årsvis/Månadsvis, CSV, Excel) stay
 * when the table is folded in. The look of the arrow is in scripts/typfallsmodellen-theme.css (.pl-fold).
 */
(function () {
  var TABLE_ID = "pl-monthly-table";
  var folded = true;
  var queued = false;

  function enhance() {
    queued = false;
    var table = document.querySelector(".results section.panel > .scroll > table.table2");
    if (!table) return;
    var scroll = table.parentElement;
    var section = scroll.parentElement;
    var heading = section.querySelector(":scope > h2");
    if (!heading) return;

    var button = heading.querySelector(":scope > .pl-fold");
    if (!button) {
      var title = heading.querySelector(":scope > span");
      if (!title) return;
      button = document.createElement("button");
      button.type = "button";
      button.className = "pl-fold";
      button.setAttribute("aria-controls", TABLE_ID);
      button.innerHTML =
        '<svg class="pl-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
      button.appendChild(title);
      heading.insertBefore(button, heading.firstChild);
      button.addEventListener("click", function () {
        folded = !folded;
        apply(section, button, scroll);
      });
    }
    scroll.id = TABLE_ID;
    apply(section, button, scroll);
  }

  function apply(section, button, scroll) {
    section.classList.toggle("pl-folded", folded);
    button.setAttribute("aria-expanded", String(!folded));
    scroll.setAttribute("aria-hidden", String(folded));
  }

  function schedule() {
    if (queued) return;
    queued = true;
    // A microtask, so that the new table is folded before the browser paints it.
    Promise.resolve().then(enhance);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
