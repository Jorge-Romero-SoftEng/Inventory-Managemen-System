import { describe, it, expect } from "vitest";
import { coercePrice, coerceAvailability, standardExtractionSchema } from "../validation/schemas";

describe("coercePrice", () => {
  it("parses Argentine thousands and decimals", () => {
    expect(coercePrice("1.250,50")).toBe(1250.5);
  });

  it("parses Argentine thousands without decimals", () => {
    expect(coercePrice("1.250")).toBe(1250);
  });

  it("parses plain comma decimals", () => {
    expect(coercePrice("1250,50")).toBe(1250.5);
  });

  it("parses plain dot decimals", () => {
    expect(coercePrice("1250.50")).toBe(1250.5);
  });

  it("parses English format", () => {
    expect(coercePrice("1,250.50")).toBe(1250.5);
  });

  it("keeps numbers as-is", () => {
    expect(coercePrice(1250.5)).toBe(1250.5);
  });

  it("returns null for empty values", () => {
    expect(coercePrice("")).toBeNull();
    expect(coercePrice(null)).toBeNull();
    expect(coercePrice(undefined)).toBeNull();
  });

  it("returns null for unparseable values", () => {
    expect(coercePrice("abc")).toBeNull();
  });
});

describe("coerceAvailability", () => {
  it("normalizes spanish variants", () => {
    expect(coerceAvailability("Disponible")).toBe("available");
    expect(coerceAvailability("AGOTADO")).toBe("out_of_stock");
  });

  it("defaults unknown labels to unknown", () => {
    expect(coerceAvailability("quizas")).toBe("unknown");
    expect(coerceAvailability(null)).toBe("unknown");
  });
});

describe("standardExtractionSchema", () => {
  it("accepts valid output and coerces fields", () => {
    const parsed = standardExtractionSchema.parse({
      supplier: " Molino ",
      effective_date: "2026-08-01",
      products: [
        {
          name: "Harina 000",
          unit: "kg",
          price: "1.250,50",
          currency: "ars",
          availability: "Disponible",
        },
      ],
    });
    expect(parsed.supplier).toBe("Molino");
    expect(parsed.products[0].price).toBe(1250.5);
    expect(parsed.products[0].currency).toBe("ARS");
    expect(parsed.products[0].availability).toBe("available");
  });

  it("defaults missing optional fields", () => {
    const parsed = standardExtractionSchema.parse({
      supplier: "Molino",
      effective_date: null,
      products: [{ name: "Harina", price: null, currency: null, availability: "unknown" }],
    });
    expect(parsed.products[0].unit).toBe("");
    expect(parsed.products[0].price).toBeNull();
    expect(parsed.products[0].availability).toBe("unknown");
  });

  it("rejects a missing supplier name", () => {
    expect(() =>
      standardExtractionSchema.parse({
        supplier: " ",
        effective_date: "2026-08-01",
        products: [],
      }),
    ).toThrow();
  });

  it("rejects a malformed effective_date", () => {
    expect(() =>
      standardExtractionSchema.parse({
        supplier: "Molino",
        effective_date: "01/08/2026",
        products: [],
      }),
    ).toThrow();
  });

  it("rejects an empty product name", () => {
    expect(() =>
      standardExtractionSchema.parse({
        supplier: "Molino",
        effective_date: "2026-08-01",
        products: [{ name: " " }],
      }),
    ).toThrow();
  });
});
