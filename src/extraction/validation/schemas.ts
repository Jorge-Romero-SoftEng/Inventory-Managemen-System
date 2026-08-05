import { z } from "zod";

/**
 * Coerces a raw value coming out of Gemini into a finite number or null.
 *
 * Real-world supplier lists (especially ARS) format prices with Argentine
 * conventions: thousands separated by "." and decimals by ","
 * (e.g. "1.250,50"). Gemini may emit these as strings, so we normalize
 * before parsing. Design decision: prices we cannot parse are coerced to
 * null (matching the standard schema) instead of failing the whole document.
 */
export function coercePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  const str = String(raw).trim().replace(/\s/g, "");
  if (!str) return null;

  let cleaned: string;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    // es-AR: "1.250" or "1.250,50"
    cleaned = str.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    // en-US: "1,250" or "1,250.50"
    cleaned = str.replace(/,/g, "");
  } else {
    // single decimal marker: "1250,50" or "1250.50"
    cleaned = str.replace(/,/g, ".");
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Normalizes availability labels the model may produce ("Disponible",
 * "agotado", "S/I", "sí", "no", …) into the standard three-value enum.
 * Anything unrecognized falls back to "unknown" so the document still loads.
 */
export function coerceAvailability(raw: unknown): "available" | "out_of_stock" | "unknown" {
  if (raw === null || raw === undefined) return "unknown";
  const s = String(raw).trim().toLowerCase();
  if (["available", "disponible", "si", "sí", "yes", "y", "hay", "stock"].includes(s)) {
    return "available";
  }
  if (["out_of_stock", "agotado", "sin stock", "no", "none", "unavailable"].includes(s)) {
    return "out_of_stock";
  }
  return "unknown";
}

const availabilitySchema = z
  .custom<unknown>()
  .transform((v) => coerceAvailability(v))
  .pipe(z.enum(["available", "out_of_stock", "unknown"]));

const priceSchema = z
  .custom<unknown>()
  .transform((v) => coercePrice(v))
  .pipe(z.number().nullable());

const productSchema = z.object({
  name: z.string().trim().min(1, "product name is required"),
  unit: z.string().trim().default(""),
  price: priceSchema.default(null),
  currency: z.string().trim().toUpperCase().nullable().default(null),
  availability: availabilitySchema.default("unknown"),
});

/**
 * The standard JSON schema described in supplier-price-extraction.md.
 *
 * effective_date is allowed to be null/empty even though the spec marks it
 * required: PDFs and WhatsApp messages frequently omit a date, so we fall
 * back to "today" at persist time rather than dropping the whole document.
 */
export const standardExtractionSchema = z.object({
  supplier: z.string().trim().min(1, "supplier name is required"),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "effective_date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  products: z.array(productSchema).max(500, "too many products for one document"),
});

export type StandardExtractionParsed = z.infer<typeof standardExtractionSchema>;
