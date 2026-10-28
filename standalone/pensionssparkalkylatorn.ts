// The Pensionssparkalkylatorn as a page of its own, in plain DOM code (no framework). The model and the number
// formats are the site's own (src/lib), bundled in by scripts/build-standalone.mjs.
import { calculatePayout } from "../src/lib/pension";
import { formatPercent, formatSek, formatSekShort, groupDigits, num, parseAmount, stepValue } from "../src/lib/format";

type Row = { year: number; opening: number; deposits: number; growth: number; paid: number; closing: number; totalIn: number };

const state = { currentCapital: 350000, monthlyDeposit: 2000, yearsToRetirement: 25, annualReturn: 6.5, annualFee: 0.6, payoutYears: 20 };

const COLUMNS: { label: string; value: (r: Row) => number; plain?: boolean }[] = [
  { label: "År", value: (r) => r.year, plain: true },
  { label: "Ingående kapital", value: (r) => r.opening },
  { label: "Insättningar", value: (r) => r.deposits },
  { label: "Avkastning efter avgift", value: (r) => r.growth },
  { label: "Utbetalning", value: (r) => r.paid },
  { label: "Utgående kapital", value: (r) => r.closing },
  { label: "Insatt totalt", value: (r) => r.totalIn },
];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function amountField(id: string, label: string, key: "currentCapital" | "monthlyDeposit", step: number) {
  return `<div class="field"><label for="${id}">${label}</label><div class="row">
    <button type="button" class="step" data-step="${key}" data-dir="-1" aria-label="Minska ${label.toLowerCase()} med ${num.format(step)} kr">−</button>
    <div class="num"><input id="${id}" data-key="${key}" data-stepby="${step}" type="text" inputmode="numeric" autocomplete="off" /><span>kr</span></div>
    <button type="button" class="step" data-step="${key}" data-dir="1" aria-label="Öka ${label.toLowerCase()} med ${num.format(step)} kr">+</button></div></div>`;
}

function sliderField(id: string, label: string, key: keyof typeof state, min: number, max: number, step: number, tip?: string) {
  const lab = tip
    ? `<span class="lab tip" tabindex="0" role="button" aria-describedby="${id}-tip">${label}<span class="pop" id="${id}-tip" role="tooltip"><b>${tip.split("|")[0]}</b><br />${tip.split("|")[1]}</span></span>`
    : `<label class="lab" for="${id}">${label}</label>`;
  return `<div class="field"><div class="sliderhead">${lab}<output id="${id}-out" for="${id}"></output></div>
    <input id="${id}" data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" ${tip ? `aria-label="${label}"` : ""} /></div>`;
}

$("app").innerHTML = `
  <form class="card inputs" onsubmit="return false" aria-label="Indata">
    ${amountField("current-capital", "Nuvarande pensionskapital", "currentCapital", 10000)}
    ${amountField("monthly-deposit", "Månadssparande", "monthlyDeposit", 100)}
    ${sliderField("years", "År till pension", "yearsToRetirement", 1, 45, 1)}
    ${sliderField("return", "Förväntad avkastning", "annualReturn", 0, 12, 0.1)}
    ${sliderField("fee", "Årlig avgift", "annualFee", 0, 2.5, 0.05)}
    ${sliderField("payout", "Utbetalas under", "payoutYears", 5, 30, 1, "Tjänstepension och privat pension:|Du kan välja att få din pension utbetald under en tidsbegränsad period (t.ex. 5, 10, 15 eller 20 år) eller livsvarigt (så länge du lever). Kortare tid än 5 år tillåts generellt inte av Skatteverket för att det ska räknas som en pensionsförsäkring.")}
  </form>
  <div class="col">
    <div class="stats" id="stats" aria-live="polite"></div>
    <section class="card chart">
      <div class="head"><h2>Kapital och utbetalningar</h2>
        <ul class="legend"><li><i style="background:var(--c1)"></i>Kapital</li><li><i style="background:var(--c2)"></i>Insättningar</li><li><i style="background:var(--c4)"></i>Utbetalning per år</li></ul></div>
      <p class="sub" id="chart-sub"></p>
      <div class="plot" id="plot"><svg id="svg" viewBox="0 0 800 340" role="img" aria-label="Diagram över kapital och utbetalningar år för år, se tabellen nedan"></svg><div class="tooltip" id="tip"></div></div>
    </section>
    <details class="card table" id="table-card">
      <summary><h2 id="table-title"></h2><span><button type="button" class="btn" id="csv">Ladda ner CSV</button></span></summary>
      <div class="scroll"><table><thead><tr>${COLUMNS.map((c) => `<th scope="col">${c.label}</th>`).join("")}</tr></thead><tbody id="tbody"></tbody></table></div>
    </details>
    <div class="note" id="note"></div>
  </div>`;

let rows: Row[] = [];

function render() {
  const s = state;
  const result = calculatePayout(s);

  // The result year by year: first the saving, then the payout.
  const saving: Row[] = result.series.slice(1).map((point, i) => {
    const before = result.series[i]!;
    const deposits = point.deposits - before.deposits;
    return { year: point.year, opening: before.capital, deposits, growth: point.capital - before.capital - deposits, paid: 0, closing: point.capital, totalIn: point.deposits };
  });
  const payout: Row[] = result.payouts.map((p) => ({ year: p.year, opening: p.opening, deposits: 0, growth: p.growth, paid: p.paid, closing: p.closing, totalIn: result.totalDeposits }));
  rows = [...saving, ...payout];

  $("stats").innerHTML = [
    ["Kapital vid pension", formatSek(result.finalCapital), "", "hl"],
    ["Per månad i uttag", formatSek(result.monthlyPension), `i ${s.payoutYears} år`, "hl"],
    ["Totalt utbetalt", formatSek(result.totalPaid), "", ""],
    ["Egna insättningar", formatSek(result.totalDeposits), "", ""],
    ["Varav avkastning", formatSek(result.totalGrowth), "", "wide"],
  ]
    .map(([l, v, n, c]) => `<div class="stat ${c}"><div class="eyebrow">${l}</div><div class="v">${v}</div>${n ? `<div class="n">${n}</div>` : ""}</div>`)
    .join("");

  $("chart-sub").textContent = `Kapitalet växer till pensionen och betalas sedan ut under ${s.payoutYears} år. Före skatt.`;
  $("table-title").textContent = `År för år (${rows.length} år)`;
  $("tbody").innerHTML = rows.map((r) => `<tr>${COLUMNS.map((c) => `<td>${c.plain ? c.value(r) : num.format(Math.round(c.value(r)))}</td>`).join("")}</tr>`).join("");
  $("note").innerHTML = `<p>Du får <strong>${formatSek(result.monthlyPension)}</strong> i månaden i ${s.payoutYears} år, tillsammans <strong>${formatSek(result.totalPaid)}</strong> före skatt. Det som står kvar under uttaget fortsätter att växa, så du får ut mer än du hade sparat vid pensionen.</p>
    <p>Avgiften på ${formatPercent(s.annualFee, 2)} kostar dig ungefär <strong>${formatSek(result.feeCost)}</strong> fram till pension jämfört med ett avgiftsfritt sparande. Läs mer i artikeln om <a href="https://pensionslyft.se/artiklar/avgifter-som-ater-upp-din-pension">avgifter</a>.</p>`;

  drawChart(result.series, result.payouts, s.yearsToRetirement);
}

type Point = { year: number; capital: number; deposits?: number; paid?: number };

let lastChart: Parameters<typeof drawChart> | undefined;

function drawChart(series: { year: number; capital: number; deposits: number }[], payouts: { year: number; closing: number; paid: number }[], retirement: number) {
  lastChart = [series, payouts, retirement];
  const data: Point[] = [
    ...series.map((p) => ({ year: p.year, capital: p.capital, deposits: p.deposits })),
    ...payouts.map((p) => ({ year: p.year, capital: p.closing, paid: p.paid })),
  ];
  // Drawn at the width it is shown at, so that the text keeps its size on a phone.
  const W = Math.max(300, Math.min(800, $("plot").clientWidth || 800));
  const H = W < 520 ? 280 : 340, L = 60, R = 12, T = 26, B = 28;
  $("svg").setAttribute("viewBox", `0 0 ${W} ${H}`);
  const last = data[data.length - 1]!.year;
  const rawMax = Math.max(...data.map((d) => Math.max(d.capital, d.paid ?? 0)), 1);
  const stepSize = niceStep(rawMax / 4);
  const yMax = Math.ceil(rawMax / stepSize) * stepSize;
  const x = (year: number) => L + (year / last) * (W - L - R);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);

  let out = "";
  for (let v = 0; v <= yMax + 1e-6; v += stepSize) {
    out += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" stroke-dasharray="3 3"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${esc(formatSekShort(v))}</text>`;
  }
  const every = Math.max(1, Math.ceil(last / 10));
  for (let year = 0; year <= last; year += every) out += `<text x="${x(year)}" y="${H - 8}" text-anchor="middle">${year}</text>`;

  const area = (pts: { year: number; v: number }[], color: string, opacity: number) =>
    `<path d="M${x(pts[0]!.year)},${y(0)} ${pts.map((p) => `L${x(p.year)},${y(p.v)}`).join(" ")} L${x(pts[pts.length - 1]!.year)},${y(0)} Z" fill="${color}" fill-opacity="${opacity}"/>` +
    `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.v)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>`;

  out += area(series.map((p) => ({ year: p.year, v: p.deposits })), "var(--c2)", 0.15);
  out += area(data.map((p) => ({ year: p.year, v: p.capital })), "var(--c1)", 0.22);
  const bw = Math.min(28, ((W - L - R) / last) * 0.7);
  for (const p of payouts) out += `<rect x="${x(p.year) - bw / 2}" y="${y(p.paid)}" width="${bw}" height="${y(0) - y(p.paid)}" rx="3" fill="var(--c4)"/>`;
  out += `<line x1="${x(retirement)}" x2="${x(retirement)}" y1="${T - 6}" y2="${H - B}" stroke="var(--fg)" stroke-dasharray="3 3"/><text x="${x(retirement)}" y="${T - 10}" text-anchor="middle" style="fill:var(--fg)">Pension</text>`;
  out += `<line id="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted-fg)" stroke-opacity="0.6" visibility="hidden"/>`;
  $("svg").innerHTML = out;

  const svg = $("svg") as unknown as SVGSVGElement;
  const tip = $("tip");
  const cursor = svg.querySelector("#cursor") as SVGLineElement;
  const show = (clientX: number) => {
    const box = svg.getBoundingClientRect();
    const sx = ((clientX - box.left) / box.width) * W;
    const year = Math.min(last, Math.max(0, Math.round(((sx - L) / (W - L - R)) * last)));
    const d = data.find((p) => p.year === year)!;
    cursor.setAttribute("x1", String(x(year)));
    cursor.setAttribute("x2", String(x(year)));
    cursor.setAttribute("visibility", "visible");
    const line = (l: string, v: number | undefined) => (v === undefined ? "" : `<div class="t"><span>${l}</span><span>${formatSek(v)}</span></div>`);
    tip.innerHTML = `<b>År ${year}</b>${line("Kapital", d.capital)}${line("Insättningar", d.deposits)}${line("Utbetalning per år", d.paid)}`;
    tip.style.display = "block";
    const px = (x(year) / W) * box.width;
    tip.style.left = `${px > box.width / 2 ? px - tip.offsetWidth - 12 : px + 12}px`;
    tip.style.top = "8px";
  };
  const hide = () => {
    tip.style.display = "none";
    cursor.setAttribute("visibility", "hidden");
  };
  svg.onpointermove = (e) => show(e.clientX);
  svg.onpointerdown = (e) => show(e.clientX);
  svg.onpointerleave = hide;
}

/** A round step (1, 2, 2.5 or 5 times a power of ten) at least as large as `raw`. */
function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

const display: Record<string, (v: number) => string> = {
  years: (v) => `${v} år`,
  return: (v) => formatPercent(v, 1),
  fee: (v) => formatPercent(v, 2),
  payout: (v) => `${v} år`,
};

function syncInputs() {
  document.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((input) => {
    const key = input.dataset.key as keyof typeof state;
    if (input.type === "range") {
      input.value = String(state[key]);
      $(`${input.id}-out`).textContent = display[input.id]!(state[key]);
    } else if (document.activeElement !== input) {
      input.value = groupDigits(String(state[key]));
    }
  });
}

document.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((input) => {
  const key = input.dataset.key as keyof typeof state;
  input.addEventListener("input", () => {
    if (input.type === "range") state[key] = parseFloat(input.value);
    else {
      input.value = groupDigits(input.value);
      const value = parseAmount(input.value);
      state[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
    }
    syncInputs();
    render();
  });
  input.addEventListener("blur", () => {
    if (input.type !== "range") input.value = groupDigits(String(state[key]));
  });
});

// The + and − buttons: a click steps once, holding the button repeats.
document.querySelectorAll<HTMLButtonElement>("button.step").forEach((button) => {
  const key = button.dataset.step as "currentCapital" | "monthlyDeposit";
  const dir = Number(button.dataset.dir) as 1 | -1;
  const stepBy = Number(($(key === "currentCapital" ? "current-capital" : "monthly-deposit") as HTMLInputElement).dataset.stepby);
  const go = () => {
    state[key] = stepValue(state[key], stepBy, dir, 0);
    syncInputs();
    render();
  };
  let timer: number | undefined, repeat: number | undefined;
  const stop = () => {
    window.clearTimeout(timer);
    window.clearInterval(repeat);
  };
  button.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    go();
    timer = window.setTimeout(() => (repeat = window.setInterval(go, 80)), 450);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => button.addEventListener(ev, stop));
  button.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
});

// The explanation of "Utbetalas under" also opens by tap or Enter, for phones and keyboards.
const tipEl = document.querySelector<HTMLElement>(".tip");
tipEl?.addEventListener("click", () => tipEl.classList.toggle("open"));
tipEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    tipEl.classList.toggle("open");
  }
  if (e.key === "Escape") tipEl.classList.remove("open");
});

// CSV as on the site: semicolons, whole numbers, CRLF, and a byte order mark so that Swedish Excel reads å, ä, ö.
$("csv").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const csv = [COLUMNS.map((c) => c.label).join(";"), ...rows.map((r) => COLUMNS.map((c) => Math.round(c.value(r))).join(";"))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "pensionssparkalkylator.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

syncInputs();
render();
let shownWidth = $("plot").clientWidth;
new ResizeObserver(() => {
  const width = $("plot").clientWidth;
  if (width !== shownWidth && lastChart) {
    shownWidth = width;
    drawChart(...lastChart);
  }
}).observe($("plot"));
