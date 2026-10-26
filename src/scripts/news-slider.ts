import { nextIndex } from "@/lib/slider";

const AUTO_MS = 6000;

function init(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>("[data-track]");
  const slides = [...root.querySelectorAll<HTMLElement>("[data-slide]")];
  const dots = [...root.querySelectorAll<HTMLButtonElement>("[data-dot]")];
  if (!track || slides.length < 2) return;

  let current = 0;
  let timer: number | undefined;
  let stopped = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const show = (index: number, smooth = true) => {
    current = index;
    track.scrollTo({ left: slides[index].offsetLeft - track.offsetLeft, behavior: smooth ? "smooth" : "auto" });
    mark();
  };
  const mark = () =>
    dots.forEach((dot, i) => {
      dot.dataset.active = String(i === current);
      dot.setAttribute("aria-current", i === current ? "true" : "false");
    });
  const stop = () => {
    stopped = true;
    window.clearInterval(timer);
  };
  const start = () => {
    window.clearInterval(timer);
    if (!stopped && !document.hidden) timer = window.setInterval(() => show(nextIndex(current, slides.length, 1)), AUTO_MS);
  };

  // The visible slide follows swiping and scrolling, too.
  track.addEventListener(
    "scroll",
    () => {
      const index = Math.round(track.scrollLeft / slides[0].offsetWidth);
      if (index !== current && index >= 0 && index < slides.length) {
        current = index;
        mark();
      }
    },
    { passive: true },
  );
  root.querySelector("[data-prev]")?.addEventListener("click", () => {
    stop();
    show(nextIndex(current, slides.length, -1));
  });
  root.querySelector("[data-next]")?.addEventListener("click", () => {
    stop();
    show(nextIndex(current, slides.length, 1));
  });
  dots.forEach((dot, i) =>
    dot.addEventListener("click", () => {
      stop();
      show(i);
    }),
  );
  // Reading, pointing or touching pauses; a click, swipe or key press ends the auto-advance for good.
  root.addEventListener("mouseenter", () => window.clearInterval(timer));
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", () => window.clearInterval(timer));
  root.addEventListener("focusout", start);
  root.addEventListener("touchstart", stop, { passive: true });
  document.addEventListener("visibilitychange", () => (document.hidden ? window.clearInterval(timer) : start()));

  mark();
  start();
}

document.querySelectorAll<HTMLElement>("[data-news-slider]").forEach(init);
