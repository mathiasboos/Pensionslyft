/** A column of a table that can be shown on the page and downloaded as CSV or Excel. */
export interface ExportColumn<T> {
  label: string;
  value: (row: T) => number;
  /** A year or an age: written as it is, without thousands separators in the table and the sheet. */
  plain?: boolean;
}

/** The rows as CSV text: semicolons as separators (as Swedish Excel expects), whole numbers, CRLF between rows. */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  return [
    columns.map((c) => c.label).join(";"),
    ...rows.map((row) => columns.map((c) => Math.round(c.value(row))).join(";")),
  ].join("\r\n");
}

export function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv<T>(rows: T[], columns: ExportColumn<T>[], fileName: string) {
  // A byte order mark lets Swedish Excel open the file directly with å, ä and ö right.
  download(new Blob(["﻿" + toCsv(rows, columns)], { type: "text/csv;charset=utf-8" }), fileName);
}

export async function downloadExcel<T>(rows: T[], columns: ExportColumn<T>[], fileName: string, sheet: string) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const data = [
    columns.map((c) => ({ value: c.label, fontWeight: "bold" as const })),
    ...rows.map((row) =>
      columns.map((c) => ({ value: Math.round(c.value(row)), format: c.plain ? "0" : "#,##0" })),
    ),
  ];
  const blob = await writeExcelFile(data, {
    sheet,
    columns: columns.map((c) => ({ width: c.plain ? 7 : Math.max(12, c.label.length + 2) })),
    stickyRowsCount: 1,
  }).toBlob();
  download(blob, fileName);
}
