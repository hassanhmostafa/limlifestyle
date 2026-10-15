import * as XLSX from "xlsx";
import JSZip from "jszip";
import { flattenResearchRecord } from "../shared/eventResearchExport";
import { buildResearchDictionary } from "./eventResearchDictionary";

function safeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Keep untrusted user/device values as text so spreadsheet applications do
  // not evaluate them as formulas when a researcher opens the workbook.
  return /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
}

export function buildResearchWorkbook(records: Record<string, unknown>[]) {
  const flattened = records.map(row => flattenResearchRecord(row));
  const columns = Array.from(new Set(flattened.flatMap(row => Object.keys(row)))).sort();
  const data = [columns, ...flattened.map(row => columns.map(column => safeCell(row[column])))];
  const dictionary = buildResearchDictionary(columns, records);
  const workbook = XLSX.utils.book_new();
  const recordsSheet = XLSX.utils.aoa_to_sheet(data);
  recordsSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  recordsSheet["!cols"] = columns.map(column => ({ wch: Math.min(50, Math.max(14, column.length + 2)) }));
  XLSX.utils.book_append_sheet(workbook, recordsSheet, "Visits");
  const dictionarySheet = XLSX.utils.aoa_to_sheet(dictionary.map(row => row.map(safeCell)));
  dictionarySheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  dictionarySheet["!cols"] = [{ wch: 20 }, { wch: 42 }, { wch: 50 }, { wch: 58 }];
  XLSX.utils.book_append_sheet(workbook, dictionarySheet, "Dictionary");
  return Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer", compression: true }));
}

function safeFileComponent(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "event";
}

/** Separate workbooks deliberately retain the same Dictionary sheet in every file. */
export async function buildResearchWorkbookZip(records: Record<string, unknown>[], eventCodes: string[]) {
  const zip = new JSZip();
  for (const eventCode of eventCodes) {
    const selected = records.filter(record => record.eventCode === eventCode);
    zip.file(`LIM-${safeFileComponent(eventCode)}-research.xlsx`, buildResearchWorkbook(selected));
  }
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } }));
}
