// "Så växer ditt sparande": the chart of the löneväxlingskalkylator, drawn on a canvas as in the supplied
// Salary_Exchange_Consumer.html (github.com/mathiasboos/Calculators). The geometry and the tooltip are the
// original's; the colours are the site's (src/styles/global.css), as in the Pensionskalkylatorn.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp, fmtKr, fmtOneDecimal, simSeries } from "@/lib/lonevaxling";

const C_H = 360; // the white fill of the original is 360 px high, also on a phone
// A canvas needs plain colours, so these are the values of the site's tokens.
const NAVY = "#0c2a49"; // --chart-1, the capital
const GOLD = "#a18142"; // --chart-2, the capital paid in
const NAVY_RGB = "12,42,73";
const GRID = "#e7e5e0"; // --border
const INK = "#545f6c"; // --muted-foreground

/** The measures of the chart, which are smaller on a phone. */
function geometry(W: number) {
  const mobile = W < 480;
  return {
    mobile,
    padL: mobile ? 88 : 130,
    padR: mobile ? 10 : 20,
    padT: mobile ? 14 : 20,
    padB: mobile ? 30 : 40,
    chartH: mobile ? 240 : 360,
    fontSize: mobile ? 11 : 14,
  };
}

interface Drawing {
  W: number;
  premie: number;
  years: number;
  selPct: number;
  hoverIdx: number | null;
}

function draw(cv: HTMLCanvasElement, { W, premie, years, selPct, hoverIdx }: Drawing) {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const { mobile, padL, padR, padT, padB, chartH, fontSize } = geometry(W);
  cv.width = W * dpr;
  cv.height = chartH * dpr;
  cv.style.height = `${chartH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // White background
  ctx.fillStyle = "#fff"; // --card
  ctx.fillRect(0, 0, W, C_H);

  const mainSeries = simSeries(premie, selPct, years);
  const inbetalt = Array.from({ length: years + 1 }, (_, y) => premie * y * 12);

  const maxV = Math.max(mainSeries[years]!, 1);

  const iw = W - padL - padR;
  const ih = chartH - padT - padB;
  const X = (i: number) => padL + (iw * i) / years;
  const Y = (v: number) => padT + ih * (1 - v / maxV);

  // Grid lines and the labels of the y axis, in kronor
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.fillStyle = INK;
  ctx.font = `${fontSize}px Inter,system-ui,sans-serif`;
  ctx.textAlign = "right";
  for (let g = 1; g <= 4; g++) {
    const v = (maxV * g) / 4;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    const label = Math.round(v).toLocaleString("sv-SE") + " kr";
    ctx.fillText(label, padL - 6, y + Math.round(fontSize * 0.4));
  }

  // The area under the main curve
  const grad = ctx.createLinearGradient(0, padT, 0, padT + ih);
  grad.addColorStop(0, `rgba(${NAVY_RGB},0.18)`);
  grad.addColorStop(1, `rgba(${NAVY_RGB},0.04)`);
  ctx.beginPath();
  mainSeries.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.lineTo(X(years), Y(0));
  ctx.lineTo(X(0), Y(0));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Gold dashed line: the capital paid in
  ctx.beginPath();
  inbetalt.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = mobile ? 2 : 2.5;
  ctx.setLineDash([7, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Navy main line
  ctx.beginPath();
  mainSeries.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = mobile ? 2 : 3;
  ctx.stroke();

  // The labels of the x axis
  ctx.fillStyle = INK;
  ctx.font = `${fontSize}px Inter,system-ui,sans-serif`;
  const stepX = years > 30 ? 10 : years > 12 ? 5 : years > 6 ? 2 : 1;
  for (let y = 0; y <= years; y += stepX) {
    ctx.textAlign = y === 0 ? "left" : "center";
    ctx.fillText(y === 0 ? "Idag" : "+" + y + " år", X(y), chartH - 8);
  }

  // The line and the dots at the hovered year
  if (hoverIdx !== null) {
    const i = Math.min(hoverIdx, years);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(i), padT);
    ctx.lineTo(X(i), chartH - padB);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(X(i), Y(mainSeries[i]!), 5, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(i), Y(inbetalt[i]!), 5, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

interface Props {
  /** The pension premium a month. */
  premie: number;
  /** Years until the pension. */
  years: number;
  /** Return a year, percent. */
  avkastning: number;
}

export default function LonevaxlingChart({ premie, years, avkastning }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  // The labels of the canvas are drawn again when the web fonts of the site have loaded.
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => active && setFontsLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // The width of the canvas, also when the window changes (which hides the tooltip, as in the original)
  useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const measure = () => {
      setWidth(Math.floor(cv.getBoundingClientRect().width) || cv.parentElement?.offsetWidth || 600);
      setHoverIdx(null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(cv);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (cv && width > 0) draw(cv, { W: width, premie, years, selPct: avkastning, hoverIdx });
  }, [width, premie, years, avkastning, hoverIdx, fontsLoaded]);

  const selFmt = fmtOneDecimal(avkastning);
  const main = simSeries(premie, avkastning, years);
  const i = hoverIdx === null ? null : Math.min(hoverIdx, years);

  // The tooltip stays beside the hovered year, to the left of it if it would not fit to the right.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const cv = canvasRef.current;
    if (!tip || !cv || i === null) return;
    const W = cv.getBoundingClientRect().width;
    const { padL, padR } = geometry(W);
    const iw = W - padL - padR;
    const px = padL + (iw * i) / years;
    const tw = tip.offsetWidth;
    let left = px + 14;
    if (left + tw > W) left = px - tw - 14;
    tip.style.left = Math.max(0, left) + "px";
    tip.style.top = "10px";
  }, [i, years, width]);

  const showTip = (clientX: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const { padL, padR } = geometry(rect.width);
    const iw = rect.width - padL - padR;
    const x = clientX - rect.left;
    setHoverIdx(Math.round(clamp((x - padL) / iw, 0, 1) * years));
  };
  const hideTip = () => setHoverIdx(null);

  return (
    <div className="compound-wrap">
      <div className="compound-title">Så växer ditt sparande</div>
      <div className="compound-sub">
        Utveckling fram till pension vid <b>{`${selFmt} %`}</b> avkastning per år.
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Diagram över hur sparandet växer: om ${years} år är värdet ${fmtKr(main[years]!)} vid ${selFmt} % avkastning per år, varav ${fmtKr(premie * years * 12)} är inbetalt kapital.`}
        onMouseMove={(e) => showTip(e.clientX)}
        onMouseLeave={hideTip}
        onTouchStart={(e) => showTip(e.touches[0]!.clientX)}
        onTouchMove={(e) => showTip(e.touches[0]!.clientX)}
        onTouchEnd={hideTip}
      />
      {i !== null && (
        <div className="compound-tip vis" ref={tipRef}>
          <div className="ct-yr">{i === 0 ? "Idag" : "Om " + i + " år"}</div>
          <div className="ct-row">
            <span style={{ display: "inline-block", width: 22, height: 0, borderTop: `2px dashed ${GOLD}` }} />
            Inbetalt<b>{fmtKr(premie * i * 12)}</b>
          </div>
          <div className="ct-row">
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: NAVY }} />
            {`${selFmt} %`}<b>{fmtKr(main[i]!)}</b>
          </div>
        </div>
      )}
      <div className="compound-legend">
        <span>
          <span className="leg-swatch" style={{ display: "inline-block", width: 22, height: 0, borderTop: `2.5px dashed ${GOLD}` }} />
          Inbetalt kapital
        </span>
        <span>
          <span className="leg-swatch" style={{ background: NAVY }} />
          {`Värde vid ${selFmt} %`}
        </span>
      </div>
    </div>
  );
}
