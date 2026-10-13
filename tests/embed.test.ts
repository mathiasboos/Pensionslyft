import { describe, expect, it } from "vitest";
import { BEGIN, END, headEnd, injectSiteChanges, setTitle, stripSiteChanges } from "../scripts/lib/embed.mjs";
import { contextAt, recolor } from "../scripts/lib/recolor.mjs";
import { colors, fonts, vars } from "../scripts/pensionsplaneraren-colors.mjs";

// The colour at the end of `source`: how is it used there?
function contextOfLast(source: string) {
  const colour = source.match(/(#[0-9A-Fa-f]{3,6}|rgba?\(\d+,\s*\d+,\s*\d+)$/);
  if (!colour) throw new Error(`no colour at the end of ${source}`);
  return contextAt(`${source}'`, source.length - colour[0].length);
}

describe("contextAt", () => {
  it.each([
    ["color:#48B866", "ink"],
    ["background:#48B866", "surface"],
    ["border-left:3px solid #48B866", "surface"],
    ['style="border:1px solid #e7e5e0;color:#48B866', "ink"],
    ["a:hover{color:#48B866", "ink"],
    ["el.style.backgroundColor = on ? '#48B866", "surface"],
    ["'background:'+(on?'#4885C4", "surface"],
    ["';color:'+(on?'#fff", "ink"],
    ["color: active ? '#0f1f3d' : 'var(--sub, #7a96be", "ink"],
    ["{ borderColor: '#48B866", "series"],
    ["{ borderColor: 'x', backgroundColor: '#48B866", "series"],
    ["titleColor:'#48B866", "ink"],
    ["var diffCol = diff >= 0 ? '#48B866", "series"],
    ["var PAL = ['#48B866','#4885C4", "series"],
    ["ctx.fillStyle = lum > 0.6 ? '#0f1f3d' : '#ffffff", "series"],
    ["gradient.addColorStop(0, 'rgba(240,193,66", "series"],
    ["  --gold:     #48B866", "variable"],
  ])("%s → %s", (source, context) => {
    expect(contextOfLast(source)).toBe(context);
  });
});

describe("recolor", () => {
  const map = { colors: { "48b866": { ink: "#0c2a49", surface: "#f0c75e", series: "#7bb0ab" }, ff5b2e: "#9c4438" } };

  it("replaces a colour by how it is used and keeps the alpha and the case", () => {
    const { html, counts } = recolor(
      `<div style="color:#48B866;background:rgba(72,184,102,.2)"></div><script>var d={borderColor:'#48b866'};</script>`,
      map,
    );
    expect(html).toBe(
      `<div style="color:#0C2A49;background:rgba(240,199,94,.2)"></div><script>var d={borderColor:'#7bb0ab'};</script>`,
    );
    expect(counts).toEqual({ "48b866 ink": 1, "48b866 surface": 1, "48b866 series": 1 });
  });

  it("finds colours that the app puts together in code", () => {
    expect(recolor(`x.style.color = 'rgba(255,91,46,' + a + ')';`, map).html).toBe(`x.style.color = 'rgba(156,68,56,' + a + ')';`);
  });

  it("leaves the bundled libraries, the app's variables and character references alone", () => {
    const library = `<script>/*! Chart.js v4 */ var c = '#48B866';</script>`;
    const source = `${library}<style>:root{--gold:#48B866}</style><p>&#228;</p>`;
    const { html, counts } = recolor(source, map);
    expect(html).toBe(source);
    expect(counts).toEqual({});
  });

  it("reports the colours that have no site colour", () => {
    expect(recolor(`<p style="color:#123456;background:#123">x</p>`, map).unmapped).toEqual({ "123456": 1, "112233": 1 });
  });

  it("points the app's variables to the site's where they colour text, and replaces fonts", () => {
    const { html } = recolor(`.a{color:var(--gold)} .b{background:var(--gold)} <script>f={family:'DM Mono'}</script>`, {
      vars: { gold: { ink: "pl-gold-ink" } },
      fonts: { "DM Mono": "Inter" },
    });
    expect(html).toBe(`.a{color:var(--pl-gold-ink)} .b{background:var(--gold)} <script>f={family:'Inter'}</script>`);
  });

  it("is the same for the same input", () => {
    const source = `<p style="color:#48B866">a</p>`;
    expect(recolor(source, map).html).toBe(recolor(source, map).html);
  });
});

describe("the Pensionsplaneraren's colour map", () => {
  it("has 6-digit keys and site colours as hex", () => {
    for (const [key, value] of Object.entries(colors)) {
      expect(key).toMatch(/^[0-9a-f]{6}$/);
      const targets = typeof value === "string" ? [value] : Object.values(value as Record<string, string>);
      for (const target of targets) expect(target).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(Object.keys(vars)).toContain("gold");
    expect(Object.keys(fonts)).toContain("DM Mono");
  });
});

describe("embedding", () => {
  const app = `<html><head><title>App</title><script>var s='<title>x</title></head><body>';</script>\n</head><body></body></html>`;

  it("finds the app's own </head>, not one in a script", () => {
    expect(headEnd(app)).toBe(app.lastIndexOf("</head>"));
  });

  it("puts the site's part in once and can take it out again", () => {
    const once = injectSiteChanges(app, { css: "a{}\n", js: "1;\n" });
    expect(injectSiteChanges(once, { css: "a{}\n", js: "1;\n" })).toBe(once);
    expect(once.indexOf(BEGIN)).toBeLessThan(once.lastIndexOf("</head>"));
    expect(once).toContain(END);
    expect(stripSiteChanges(once)).toBe(app);
  });

  it("refuses a site script that would end the script element", () => {
    expect(() => injectSiteChanges(app, { css: "", js: "'</script>'" })).toThrow();
  });

  it("sets the page title, not a title inside a script", () => {
    expect(setTitle(app, "Pensionsplaneraren – Pensionslyft")).toContain("<title>Pensionsplaneraren – Pensionslyft</title><script>var s='<title>x</title>");
  });
});
