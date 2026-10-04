// Parse the workbook once and cache a JSON dump of every sheet (value + formula per cell).
const XLSX = require("xlsx");
const fs = require("fs");
const t = Date.now();
const wb = XLSX.readFile("typfall.xlsb", { cellFormula: true, cellNF: false, cellStyles: false, bookVBA: true, sheetStubs: false });
console.log("parsed in", Date.now() - t, "ms");
const out = {};
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const cells = {};
  for (const [addr, c] of Object.entries(ws)) {
    if (addr[0] === "!") continue;
    cells[addr] = c.f !== undefined ? { v: c.v, f: c.f } : { v: c.v };
  }
  out[name] = { ref: ws["!ref"], cells };
  console.log(name.padEnd(26), (ws["!ref"] || "").padEnd(14), Object.keys(cells).length, "cells,", Object.values(cells).filter((c) => c.f).length, "formulas");
}
fs.writeFileSync("sheets.json", JSON.stringify(out));
const names = (wb.Workbook && wb.Workbook.Names) || [];
fs.writeFileSync("names.json", JSON.stringify(names, null, 1));
console.log("defined names:", names.length);
if (wb.vbaraw) fs.writeFileSync("vbaProject.bin", wb.vbaraw);
