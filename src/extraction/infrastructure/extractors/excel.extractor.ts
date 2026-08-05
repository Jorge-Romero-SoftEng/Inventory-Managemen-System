import * as XLSX from "xlsx";
import type { ITextExtractor, ExtractSource } from "@/extraction/application/contracts/text-extractor.port";
import { TextExtractionError } from "@/extraction/domain/errors";

/**
 * Excel (.xlsx/.xls) text extraction via SheetJS. Each sheet is rendered as
 * a "|"-separated table. The tabular layout is preserved so Gemini can
 * distinguish product names, units, prices and availability columns.
 */
export class ExcelTextExtractor implements ITextExtractor {
  async extract({ buffer }: ExtractSource): Promise<string> {
    if (!buffer) throw new TextExtractionError("Excel buffer is missing");
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const parts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          raw: false,
          defval: "",
        });
        parts.push(`## Sheet: ${sheetName}`);
        for (const row of rows) {
          parts.push(row.map((cell) => String(cell ?? "").trim()).join(" | "));
        }
      }
      return parts.join("\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TextExtractionError(`Could not parse Excel file: ${message}`);
    }
  }
}
