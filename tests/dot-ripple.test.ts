import { describe, expect, it } from "vitest";
import { dotLook, isInteractive, PUSH, REST_ALPHA, REST_RADIUS, rippleAt } from "../src/scripts/dot-ripple";

// The ring travels at 600 px/s, so at t = 0.5 s it is 300 px from the epicentre.
const ringAt = (t: number) => 600 * t;

describe("rippleAt", () => {
  it("is zero before the click and after the ripple has run out", () => {
    expect(rippleAt(100, -0.1)).toBe(0);
    expect(rippleAt(100, 2.4)).toBe(0);
    expect(rippleAt(100, 10)).toBe(0);
  });

  it("peaks at the ring and is quiet far ahead of it and far behind it", () => {
    const t = 0.5;
    const atRing = rippleAt(ringAt(t), t);
    expect(atRing).toBeGreaterThan(0.5);
    expect(Math.abs(rippleAt(ringAt(t) + 400, t))).toBeLessThan(0.01);
    expect(Math.abs(rippleAt(ringAt(t) - 400, t))).toBeLessThan(0.05);
    expect(atRing).toBeGreaterThan(rippleAt(ringAt(t) + 80, t));
    expect(atRing).toBeGreaterThan(rippleAt(ringAt(t) - 80, t));
  });

  it("has a trough behind the ring", () => {
    const t = 0.8;
    const trough = Math.min(...Array.from({ length: 60 }, (_, i) => rippleAt(ringAt(t) - 40 - i * 2, t)));
    expect(trough).toBeLessThan(0);
    expect(trough).toBeGreaterThan(-0.5);
  });

  it("fades with age and with distance", () => {
    expect(rippleAt(ringAt(0.2), 0.2)).toBeGreaterThan(rippleAt(ringAt(1.2), 1.2));
    expect(rippleAt(ringAt(1.2), 1.2)).toBeGreaterThan(rippleAt(ringAt(2), 2));
    // the same ring position, but a later and so a more distant ring is weaker; and it is never above 1
    for (const t of [0.05, 0.3, 0.9, 1.7]) expect(rippleAt(ringAt(t), t)).toBeLessThanOrEqual(1);
  });

  it("starts at the epicentre: at the moment of the click the dots right there are strongest", () => {
    expect(rippleAt(0, 0)).toBeCloseTo(1, 6);
    expect(rippleAt(300, 0)).toBeLessThan(0.01);
  });
});

describe("dotLook", () => {
  it("leaves a dot as it is at rest", () => {
    expect(dotLook(0)).toEqual({ r: REST_RADIUS, alpha: REST_ALPHA });
  });

  it("swells and darkens a dot at the ring, and shrinks it a little in the trough", () => {
    const up = dotLook(1);
    expect(up.r).toBeGreaterThan(REST_RADIUS * 2);
    expect(up.alpha).toBeGreaterThan(REST_ALPHA * 2);
    expect(up.alpha).toBeLessThanOrEqual(1);
    const down = dotLook(-0.5);
    expect(down.r).toBeLessThan(REST_RADIUS);
    expect(down.r).toBeGreaterThan(0);
    expect(down.alpha).toBe(REST_ALPHA);
  });

  it("pushes a dot a few pixels at most", () => {
    expect(PUSH).toBeGreaterThan(0);
    expect(PUSH).toBeLessThanOrEqual(8);
  });
});

describe("isInteractive", () => {
  const el = (matches: boolean) => ({ closest: () => (matches ? {} : null) });

  it("is true when the target is, or is inside, something you can use", () => {
    expect(isInteractive(el(true))).toBe(true);
  });

  it("is false for empty surface, and for a missing target", () => {
    expect(isInteractive(el(false))).toBe(false);
    expect(isInteractive(null)).toBe(false);
    expect(isInteractive({})).toBe(false);
  });
});
