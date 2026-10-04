/** Saves rows as a CSV file that Excel opens with Swedish settings (semicolon, decimal comma). */
export function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const cell = (v: string | number | null) =>
    v === null
      ? ""
      : typeof v === "number"
        ? String(Math.round(v * 1000) / 1000).replace(".", ",")
        : `"${v.replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
