/*
 * What pensionslyft.se adds to the Typfallsmodellen app, which is built from another project (see
 * scripts/sync-typfallsmodellen.mjs): the table "Månadsinkomster" can be folded in and out, like the tables of the other
 * calculators (an arrow at the far left of the title bar, then the name), and it is folded in from the start.
 *
 * The app builds its results again on every change, which makes a new table, so the state is kept here, outside the
 * page, and put on the new table as soon as it is there. The title bar's buttons (Årsvis/Månadsvis, CSV, Excel) stay
 * when the table is folded in. The look of the arrow is in scripts/typfallsmodellen-theme.css (.pl-fold).
 *
 * A link can open a tab: /typfallsmodellen#retirement opens "Bästa pensionsålder?", #lasts "Hur länge räcker pensionen?"
 * (the names after # are the app's own data-screen names). The page passes its own hash on, the app reads it from the page
 * that holds it, or from its own address when it is opened alone.
 */
(function () {
  var TABLE_ID = "pl-monthly-table";
  var STEP_FIELDS = "label.field > input[type=number][step], label.field > input.percent";
  var PERCENT_STEP = 0.1;
  var folded = true;
  var queued = false;

  function enhance() {
    queued = false;
    addSteppers();
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

  // ---- the minus and plus buttons of the number fields ----

  function isPercent(input) {
    return input.type === "text";
  }

  function stepOf(input) {
    return isPercent(input) ? PERCENT_STEP : parseFloat(input.step) || 1;
  }

  function readPercent(input) {
    var n = parseFloat(String(input.value).replace(/\s/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function fieldLabel(input) {
    var label = input.parentElement && input.parentElement.querySelector(":scope > .field-label");
    return label ? label.textContent.trim() : "";
  }

  function format(number, input) {
    var text = (Math.round(number * 10) / 10).toFixed(1);
    // The app writes its percentages with a decimal comma in Swedish.
    var comma = String(input.value).indexOf(".") === -1 || String(input.value).indexOf(",") !== -1;
    return comma ? text.replace(".", ",") : text;
  }

  function change(input, direction) {
    if (input.disabled || input.readOnly) return;
    if (isPercent(input)) {
      input.value = format(readPercent(input) + direction * PERCENT_STEP, input);
    } else if (direction > 0) {
      input.stepUp();
    } else {
      input.stepDown();
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function atLimit(input, direction) {
    if (input.disabled || input.readOnly) return true;
    if (isPercent(input)) return false;
    var value = parseFloat(input.value);
    if (isNaN(value)) return false;
    var limit = parseFloat(direction > 0 ? input.max : input.min);
    return !isNaN(limit) && (direction > 0 ? value >= limit : value <= limit);
  }

  function makeButton(input, direction) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "pl-step " + (direction > 0 ? "pl-step-plus" : "pl-step-minus");
    button.setAttribute(
      "aria-label",
      (direction > 0 ? "Öka " : "Minska ") + fieldLabel(input) + " med " + String(stepOf(input)).replace(".", ","),
    );
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (direction > 0 ? '<path d="M5 12h14"/><path d="M12 5v14"/>' : '<path d="M5 12h14"/>') +
      "</svg>";

    var timer = 0;
    var repeat = 0;
    function stop() {
      window.clearTimeout(timer);
      window.clearInterval(repeat);
    }
    function press() {
      change(input, direction);
      sync(input);
    }
    // A press steps once, and held down it steps again and again, as the buttons of the other calculators do.
    button.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || button.disabled) return;
      e.preventDefault(); // keeps the focus where it is, and a long press on a phone from opening a menu
      press();
      stop();
      timer = window.setTimeout(function () {
        repeat = window.setInterval(function () {
          if (button.disabled) return stop();
          press();
        }, 70);
      }, 400);
    });
    ["pointerup", "pointerleave", "pointercancel", "blur"].forEach(function (name) {
      button.addEventListener(name, stop);
    });
    // The keyboard: Enter and Space arrive as a click without a pointer.
    button.addEventListener("click", function (e) {
      if (e.detail === 0) press();
    });
    button.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    return button;
  }

  function sync(input) {
    var label = input.parentElement;
    if (!label) return;
    var minus = label.querySelector(":scope > .pl-step-minus");
    var plus = label.querySelector(":scope > .pl-step-plus");
    if (minus) minus.disabled = atLimit(input, -1);
    if (plus) plus.disabled = atLimit(input, 1);
  }

  function addSteppers() {
    var inputs = document.querySelectorAll(STEP_FIELDS);
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var label = input.parentElement;
      if (!label.querySelector(":scope > .pl-step")) {
        label.classList.add("pl-has-step");
        input.insertAdjacentElement("beforebegin", makeButton(input, -1));
        input.insertAdjacentElement("afterend", makeButton(input, 1));
      }
      sync(input);
    }
  }

  // A typed number or a change made by the app itself moves the limits the buttons stop at.
  document.addEventListener("input", function (e) {
    if (e.target && e.target.matches && e.target.matches(STEP_FIELDS)) sync(e.target);
  });

  function schedule() {
    if (queued) return;
    queued = true;
    // A microtask, so that the new table is folded before the browser paints it.
    Promise.resolve().then(enhance);
  }

  // The tab named in the address, opened once, as soon as the app has drawn its tab buttons.
  function openLinkedTab() {
    var hash = "";
    try {
      hash = (window.parent !== window ? window.parent.location.hash : window.location.hash) || "";
    } catch (e) {
      hash = window.location.hash || "";
    }
    var name = hash.replace(/^#/, "");
    if (!/^[a-z]+$/.test(name)) return true;
    var button = document.querySelector('.screen-toggle button[data-screen="' + name + '"]');
    if (!button) return !document.querySelector(".screen-toggle button[data-screen]");
    button.click();
    return true;
  }

  // Not while the app is still drawing its first page: a click then is overwritten by that drawing.
  function afterFirstDrawing(fn) {
    function go() {
      setTimeout(fn, 0);
    }
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
  afterFirstDrawing(openLinkedTab);
})();
