import { describe, expect, it } from "vitest";
import kommuner from "../src/data/kommuner-2026.json";

describe("municipal tax rates 2026", () => {
  const rates = Object.entries(kommuner.rates);

  it("has the 290 municipalities", () => {
    expect(kommuner.year).toBe(2026);
    expect(rates).toHaveLength(290);
  });

  it("has SCB's highest and lowest rate", () => {
    const [lowest] = [...rates].sort((a, b) => a[1] - b[1]);
    const [highest] = [...rates].sort((a, b) => b[1] - a[1]);
    expect(lowest).toEqual(["Österåker", 28.93]);
    expect(highest).toEqual(["Dorotea", 35.65]);
  });
});
