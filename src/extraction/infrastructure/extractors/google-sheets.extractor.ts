import type { ITextExtractor, ExtractSource } from "@/extraction/application/contracts/text-extractor.port";
import { TextExtractionError } from "@/extraction/domain/errors";

const SPREADSHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
const SHEET_VALUES_URL = "https://sheets.googleapis.com/v4/spreadsheets/{id}/values/A1:ZZ1000";

/** Extracts the spreadsheet id from a docs.google.com/spreadsheets URL. */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(SPREADSHEET_ID_RE);
  return match ? match[1] : null;
}

/**
 * Google Sheets text extraction over the Sheets REST API using a public API
 * key (see GOOGLE_SHEETS_API_KEY). Only publicly shared spreadsheets are
 * supported; private sheets would require a service account.
 */
export class GoogleSheetsTextExtractor implements ITextExtractor {
  constructor(private readonly apiKey: string) {}

  async extract({ url }: ExtractSource): Promise<string> {
    if (!url) throw new TextExtractionError("Google Sheets URL is missing");
    const id = extractSpreadsheetId(url);
    if (!id) throw new TextExtractionError(`Could not find a spreadsheet id in: ${url}`);
    if (!this.apiKey) throw new TextExtractionError("GOOGLE_SHEETS_API_KEY is not configured");

    const apiUrl = `${SHEET_VALUES_URL.replace("{id}", id)}?key=${encodeURIComponent(this.apiKey)}`;
    let response: Response;
    try {
      response = await fetch(apiUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TextExtractionError(`Sheets API request failed: ${message}`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new TextExtractionError(`Sheets API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { values?: unknown[][] };
    const rows = data.values ?? [];
    const lines: string[] = [];
    for (const row of rows) {
      lines.push(row.map((cell) => String(cell ?? "").trim()).join(" | "));
    }
    return lines.join("\n");
  }
}
