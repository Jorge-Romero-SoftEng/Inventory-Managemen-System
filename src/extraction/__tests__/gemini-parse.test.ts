import { describe, it, expect } from "vitest";
import { parseJsonContent } from "../infrastructure/gemini/gemini-client";

describe("parseJsonContent", () => {
  it("parses a plain JSON object", () => {
    const result = parseJsonContent('{"supplier":"Molino","products":[]}');
    expect(result).toEqual({ supplier: "Molino", products: [] });
  });

  it("parses JSON wrapped in a code fence", () => {
    const result = parseJsonContent('```json\n{"supplier":"Molino"}\n```');
    expect(result).toEqual({ supplier: "Molino" });
  });

  it("extracts the object from surrounding prose", () => {
    const result = parseJsonContent(
      'Here is the list:\n{"supplier":"Molino","products":[]}\nHope that helps.',
    );
    expect(result).toEqual({ supplier: "Molino", products: [] });
  });

  it("throws when no JSON object exists", () => {
    expect(() => parseJsonContent("sorry, no data")).toThrow();
  });
});
