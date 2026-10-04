import { describe, expect, it } from "vitest";
import {
  contextOf,
  INPUT_COLUMNS,
  mikrosimCsvRows,
  newRow,
  parseMikrosimCsv,
  RESULT_COLUMNS,
  rowError,
  rowFromForm,
  runRow,
} from "../src/lib/typfall/mikrosim";
import { DEFAULT_FORM, runScenario } from "../src/lib/typfall/scenario";

const ids = () => {
  let n = 0;
  return () => String(++n);
};
const head = INPUT_COLUMNS.map((c) => c.sv).join(";");

describe("mikrosim", () => {
  const context = contextOf(DEFAULT_FORM);

  it("runs a new row as the forecast of the default form", () => {
    const run = runRow(newRow("1"), context);
    expect(run.result!.brutto).toBe(runScenario(DEFAULT_FORM).brutto);
  });

  it("takes a row from the form with the ages it uses and the saving of the advanced settings", () => {
    const row = rowFromForm({ ...DEFAULT_FORM, born: 1990, par: 60, monthlyWage: 40000, inflation: 2, mode: "avancerat", adv: { ...DEFAULT_FORM.adv, sparManad: 1500 } }, "7");
    expect(row).toMatchObject({ id: "7", born: 1990, retirementAge: 66, annualSalary: 480000, yearlyInflation: 0.02, ipsMonthly: 1500 });
    // in Normalt the advanced settings are not used
    expect(rowFromForm({ ...DEFAULT_FORM, adv: { ...DEFAULT_FORM.adv, sparManad: 1500 } }, "8").ipsMonthly).toBe(0);
  });

  it("gives the reason a row cannot be run", () => {
    const row = newRow("1");
    expect(rowError(row)).toBeUndefined();
    expect(rowError({ ...row, born: 1900 })).toMatch(/Födelseår/);
    expect(rowError({ ...row, startWorkAge: 12 })).toMatch(/arbetslivets start/);
    expect(rowError({ ...row, retirementAge: 60 })).toMatch(/Pensionsåldern/);
    expect(rowError({ ...row, startWorkAge: 40, retirementAge: 40 })).toMatch(/Pensionsåldern|före pensionsåldern/);
    expect(runRow({ ...row, born: 1900 }, context).error).toMatch(/Födelseår/);
    expect(runRow({ ...row, error: "Raden saknar en eller flera kolumner." }, context).error).toMatch(/saknar/);
  });

  it("uses the inflation and the private saving of the row", () => {
    const row = newRow("1");
    expect(runRow({ ...row, ipsMonthly: 2000 }, context).result!.ips).toBeGreaterThan(runRow(row, context).result!.ips);
    expect(runRow({ ...row, scheme: 2 }, context).result!.tjp).toBeGreaterThan(runRow(row, context).result!.tjp);
  });

  it("reads rows from a file, with decimal commas and in any order of the columns", () => {
    const text = `﻿${head}\r\n1975;23;68;398400;0;0;1,7;0;1\r\n1990;25;67;480000;0,02;0;0,017;1500;2\r\n`;
    const { rows, fileError } = parseMikrosimCsv(text, ids());
    expect(fileError).toBeUndefined();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ born: 1990, retirementAge: 67, yearlyInflation: 0.02, realReturn: 0.017, ipsMonthly: 1500, scheme: 2 });
    // the English names and the other order
    const en = parseMikrosimCsv(`${[...INPUT_COLUMNS].reverse().map((c) => c.en).join(",")}\n1,0,0.017,0,0,300000,66,23,1980`, ids());
    expect(en.rows[0]).toMatchObject({ born: 1980, annualSalary: 300000, scheme: 1, realReturn: 0.017 });
  });

  it("explains what is wrong with a file or a row", () => {
    expect(parseMikrosimCsv("", ids()).fileError).toBe("Filen är tom.");
    expect(parseMikrosimCsv("Födelseår;Årslön\n1975;400000", ids()).fileError).toMatch(/saknar kolumnen "Börjar arbeta vid ålder"/);
    const bad = parseMikrosimCsv(`${head}\n1975;23;68;abc;0;0;1,7;0;1\n1975;23;68;398400;0;0;1,7;0;9\n1975;23`, ids()).rows;
    expect(bad[0]!.error).toMatch(/Kan inte tolka "abc" som ett tal i kolumnen "Årslön"/);
    expect(bad[1]!.error).toMatch(/Ogiltigt värde i kolumnen "Välj tjänstepension": 9/);
    expect(bad[2]!.error).toMatch(/saknar en eller flera kolumner/);
    // values outside the limits are moved to the limits
    expect(parseMikrosimCsv(`${head}\n1800;5;99;99999999;0;0;1,7;0;1`, ids()).rows[0]).toMatchObject({ born: 1959, startWorkAge: 15, retirementAge: 72, annualSalary: 12000000 });
  });

  it("writes the inputs and the results of the rows", () => {
    const rows = [newRow("1"), { ...newRow("2"), born: 1900 }];
    const csv = mikrosimCsvRows(rows, context);
    expect(csv[0]).toEqual([...INPUT_COLUMNS.map((c) => c.sv), ...RESULT_COLUMNS.map((c) => c.head)]);
    expect(csv[1]!.slice(0, 3)).toEqual([1975, 23, 68]);
    expect(csv[1]!.slice(INPUT_COLUMNS.length)).toEqual(RESULT_COLUMNS.map((c) => Math.round(c.get(runScenario(DEFAULT_FORM)))));
    expect(csv[2]!.slice(INPUT_COLUMNS.length).every((v) => v === null)).toBe(true);
  });
});
