/*
 * The dots of the hero (.dot-grid) ripple when you click a surface where nothing happens: a wave goes out from the click, and
 * the dots it passes swell, darken and are pushed a little outward, with a short trailing wave behind it.
 *
 * A CSS background cannot move single dots, so when this script runs the dots are drawn on a canvas that sits where the
 * CSS dots were (same grid, colour, mask and place behind the content). Without JavaScript, or for a reader who has asked
 * for less motion, the script does nothing and the CSS dots stay as they were.
 *
 * The wave itself (rippleAt) and the test of what counts as "nothing happens" (isInteractive) are plain functions, tested
 * in tests/dot-ripple.test.ts.
 */

/** The grid of the CSS dots: a tile of 14 px with the dot in the middle. */
export const SPACING = 14;
export const REST_RADIUS = 1.2;
export const REST_ALPHA = 0.22;

const SPEED = 600; // px a second
const LIFE = 2.4; // seconds
const WIDTH = 70; // px, the width of the ring
const REACH = 900; // px, the distance at which the wave is half as strong
const SWELL = 1.2; // how much larger than at rest a dot gets at the ring
const DARKEN = 0.5; // how much more alpha a dot gets at the ring
const PUSH = 5; // px, how far the ring pushes a dot outward
const FALLBACK_COLOUR = "#0c2a49"; // --primary

/**
 * The strength of one ripple at distance `d` (px) from its epicentre, `t` seconds after the click: about -0.3 to 1,
 * positive at the ring and a little negative in the trough behind it.
 */
export function rippleAt(d: number, t: number): number {
  if (t < 0 || t >= LIFE) return 0;
  const x = (d - SPEED * t) / WIDTH;
  const fade = Math.pow(1 - t / LIFE, 1.5) / (1 + d / REACH);
  return Math.exp((-x * x) / 2) * Math.cos(2.2 * x) * fade;
}

/** What a dot looks like under a total wave strength `w`: its radius and alpha. The push is `PUSH * w` along the radial direction. */
export function dotLook(w: number): { r: number; alpha: number } {
  const up = Math.max(w, 0);
  const down = Math.min(w, 0);
  return {
    r: REST_RADIUS * (1 + SWELL * up + 0.25 * down),
    alpha: Math.min(REST_ALPHA + DARKEN * up, 1),
  };
}

export { PUSH };

const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, option, [contenteditable], [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="slider"], [role="switch"], [role="checkbox"], [role="radio"], .range';

/** Clicks on these do something, so they do not ripple. */
export function isInteractive(target: { closest?: (selector: string) => unknown } | null): boolean {
  return !!target && typeof target.closest === "function" && !!target.closest(INTERACTIVE);
}

interface Ripple {
  x: number; // page coordinates
  y: number;
  start: number; // ms
}

interface Field {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  colour: string;
}

function init() {
  const hosts = [...document.querySelectorAll<HTMLElement>(".dot-grid")];
  if (!hosts.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const fields: Field[] = hosts.map((el) => {
    const canvas = document.createElement("canvas");
    canvas.className = "dot-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.prepend(canvas);
    el.dataset.dots = "canvas";
    return { el, canvas, ctx: canvas.getContext("2d")!, width: 0, height: 0, dpr: 1, colour: FALLBACK_COLOUR };
  });

  const ripples: Ripple[] = [];
  let frame = 0;

  const colourOf = (el: HTMLElement) => {
    // --primary is an oklch() colour; a canvas that cannot read it keeps the previous colour, so check it took.
    const value = getComputedStyle(el).getPropertyValue("--primary").trim();
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.fillStyle = "#123456";
    probe.fillStyle = value || FALLBACK_COLOUR;
    return probe.fillStyle !== "#123456" ? value || FALLBACK_COLOUR : FALLBACK_COLOUR;
  };

  const size = (f: Field) => {
    const rect = f.el.getBoundingClientRect();
    f.width = Math.ceil(rect.width);
    f.height = Math.ceil(rect.height);
    f.dpr = Math.min(window.devicePixelRatio || 1, 2);
    f.canvas.width = Math.max(1, Math.round(f.width * f.dpr));
    f.canvas.height = Math.max(1, Math.round(f.height * f.dpr));
    f.colour = colourOf(f.el);
    draw(f, performance.now());
  };

  const draw = (f: Field, now: number) => {
    const { ctx, width, height, dpr } = f;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = f.colour;
    const rect = f.el.getBoundingClientRect();
    const originX = rect.left + window.scrollX;
    const originY = rect.top + window.scrollY;
    const live = ripples.map((r) => ({ x: r.x - originX, y: r.y - originY, t: (now - r.start) / 1000 }));
    const cols = Math.ceil(width / SPACING);
    const rows = Math.ceil(height / SPACING);
    const R2 = Math.PI * 2;
    ctx.globalAlpha = REST_ALPHA;
    // The dots at rest in one path.
    ctx.beginPath();
    const moving: [number, number, number, number, number][] = []; // cx, cy, w, push x, push y
    for (let j = 0; j < rows; j++) {
      const cy = SPACING / 2 + j * SPACING;
      for (let i = 0; i < cols; i++) {
        const cx = SPACING / 2 + i * SPACING;
        let w = 0;
        let nx = 0;
        let ny = 0;
        for (const r of live) {
          const dx = cx - r.x;
          const dy = cy - r.y;
          const d = Math.hypot(dx, dy);
          const s = rippleAt(d, r.t);
          if (s !== 0) {
            w += s;
            if (d > 0) {
              nx += (dx / d) * s;
              ny += (dy / d) * s;
            }
          }
        }
        if (Math.abs(w) < 0.02) {
          ctx.moveTo(cx + REST_RADIUS, cy);
          ctx.arc(cx, cy, REST_RADIUS, 0, R2);
        } else {
          // The push is along the radial direction; the sign of each ripple's strength says out (+) or in (-).
          const len = Math.hypot(nx, ny);
          const k = len > 1 ? 1 / len : 1;
          moving.push([cx, cy, Math.max(-1, Math.min(1, w)), nx * k * PUSH, ny * k * PUSH]);
        }
      }
    }
    ctx.fill();
    for (const [cx, cy, w, pushX, pushY] of moving) {
      const look = dotLook(w);
      ctx.globalAlpha = look.alpha;
      ctx.beginPath();
      ctx.arc(cx + pushX, cy + pushY, Math.max(look.r, 0.3), 0, R2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const tick = (now: number) => {
    frame = 0;
    for (let i = ripples.length - 1; i >= 0; i--) if ((now - ripples[i]!.start) / 1000 >= LIFE) ripples.splice(i, 1);
    for (const f of fields) {
      f.canvas.dataset.active = String(ripples.length);
      // The last frame (no ripple left) is drawn for every field, so that none is left in the middle of a wave.
      if (!ripples.length || inView(f)) draw(f, now);
    }
    if (ripples.length && !document.hidden) frame = requestAnimationFrame(tick);
  };

  const inView = (f: Field) => {
    const r = f.el.getBoundingClientRect();
    return r.bottom > -REACH && r.top < window.innerHeight + REACH;
  };

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!e.isPrimary || e.button !== 0) return;
      if (isInteractive(e.target as Element | null)) return;
      ripples.push({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, start: performance.now() });
      if (ripples.length > 6) ripples.shift();
      if (!frame) frame = requestAnimationFrame(tick);
    },
    { passive: true },
  );

  // A hidden tab stops the animation; when it is back, go on (or finish, if the ripples have run out meanwhile).
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ripples.length && !frame) frame = requestAnimationFrame(tick);
  });

  const observer = new ResizeObserver(() => fields.forEach(size));
  fields.forEach((f) => observer.observe(f.el));
  fields.forEach(size);
}

if (typeof document !== "undefined") init();
