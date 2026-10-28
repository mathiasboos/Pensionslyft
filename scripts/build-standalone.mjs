// Builds public/pensionssparkalkylatorn.html: the Pensionssparkalkylatorn as one self-contained page (no server, no
// network). The script in it is bundled from standalone/pensionssparkalkylatorn.ts together with the site's own model
// (src/lib/pension.ts), so the numbers are the same as on /pensionskalkylator. Never edit the output by hand; run
//   npm run build:standalone
// and commit the result whenever src/lib/pension.ts, src/lib/format.ts or standalone/ change.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function buildStandalone() {
  const result = await build({
    entryPoints: [join(root, "standalone/pensionssparkalkylatorn.ts")],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2019",
    minify: false,
    legalComments: "none",
  });
  const script = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  const template = readFileSync(join(root, "standalone/pensionssparkalkylatorn.template.html"), "utf8");
  return template.replace("/*SCRIPT*/", () => script);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = await buildStandalone();
  const out = join(root, "public/pensionssparkalkylatorn.html");
  if (process.argv.includes("--check")) {
    // For the tests: fails when the committed file is not what the sources build to.
    if (readFileSync(out, "utf8") !== html) {
      console.error("public/pensionssparkalkylatorn.html is out of date: run `npm run build:standalone` and commit it.");
      process.exit(1);
    }
    console.log("The standalone file is up to date.");
  } else {
    writeFileSync(out, html);
    console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
  }
}
