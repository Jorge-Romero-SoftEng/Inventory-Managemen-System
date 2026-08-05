import { describe, it, expect } from "vitest";
import { SourceDetector } from "../infrastructure/extractors/source-detector";

const detector = new SourceDetector();

describe("SourceDetector", () => {
  it("detects google sheets by URL", () => {
    expect(
      detector.detect({ url: "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0" }),
    ).toBe("google_sheets");
  });

  it("detects PDF by extension", () => {
    expect(detector.detect({ fileName: "lista-de-precios.pdf" })).toBe("pdf");
  });

  it("detects PDF by MIME type", () => {
    expect(detector.detect({ mimeType: "application/pdf" })).toBe("pdf");
  });

  it("detects Excel by extension", () => {
    expect(detector.detect({ fileName: "precios.xlsx" })).toBe("xlsx");
    expect(detector.detect({ fileName: "precios.xls" })).toBe("xlsx");
  });

  it("detects Excel by MIME type", () => {
    expect(
      detector.detect({
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBe("xlsx");
  });

  it("falls back to whatsapp for plain text", () => {
    expect(detector.detect({ hasText: true })).toBe("whatsapp");
    expect(detector.detect({ mimeType: "text/plain" })).toBe("whatsapp");
    expect(detector.detect({})).toBe("whatsapp");
  });

  it("throws on an unknown file", () => {
    expect(() => detector.detect({ fileName: "archive.xyz" })).toThrow();
  });
});
