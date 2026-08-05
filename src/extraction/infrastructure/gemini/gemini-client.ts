import type { IAiExtractor } from "@/extraction/application/contracts/ai.port";
import { GeminiError } from "@/extraction/domain/errors";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * System instructions embedded in every extraction request. The prompt asks
 * Gemini to follow the standard JSON schema exactly and to interpret
 * Argentine price/availability conventions.
 */
const SYSTEM_PROMPT = `You extract supplier price lists into structured JSON.

Follow the EXACT JSON schema:
{
  "supplier": "string — the supplier/provider name",
  "effective_date": "YYYY-MM-DD — the list date if present, otherwise today's date",
  "products": [
    {
      "name": "string — product name",
      "unit": "string — e.g. kg, g, l, pack, bag, 50kg",
      "price": "number|null — unit price; null when not specified",
      "currency": "string|null — currency code (ARS, USD, ...); null when unknown",
      "availability": "available|out_of_stock|unknown"
    }
  ]
}

Rules:
- The price list is what the SUPPLIER sells to us (cost prices), not retail prices.
- Argentine prices: "1.250,50" means 1250.50 (dot = thousands, comma = decimal). Convert to a plain number.
- Mark products as "out_of_stock" only when the document explicitly says so (agotado, sin stock, no hay).
- Do not invent prices; use null when the price is not present.
- Normalize units (kg, g, l, pack).
- Return only the JSON object, no commentary.`;

/**
 * Gemini's structured output is generated with responseMimeType json + a
 * responseSchema, but we still tolerate prose/code-fence wrapping by
 * extracting the outermost JSON object before parsing.
 */
export function parseJsonContent(content: string): unknown {
  let candidate = content.trim();

  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidate = fence[1].trim();

  if (candidate.startsWith("{")) {
    return JSON.parse(candidate);
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(candidate.slice(start, end + 1));
  }

  throw new Error("No JSON object found in model output");
}

/**
 * Gemini 2.5 Flash client over the REST API (no SDK dependency). Requests
 * structured JSON via generationConfig.responseSchema. The returned payload
 * is raw and unvalidated; the pipeline validates it with Zod.
 */
export class GeminiClient implements IAiExtractor {
  constructor(private readonly apiKey: string) {}

  async extract(text: string): Promise<unknown> {
    if (!this.apiKey) {
      throw new GeminiError("GEMINI_API_KEY is not configured");
    }

    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(this.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                supplier: { type: "STRING" },
                effective_date: { type: "STRING" },
                products: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      unit: { type: "STRING" },
                      price: { type: ["NUMBER", "NULL"] },
                      currency: { type: ["STRING", "NULL"] },
                      availability: { type: "STRING" },
                    },
                    required: ["name", "unit", "price", "currency", "availability"],
                  },
                },
              },
              required: ["supplier", "effective_date", "products"],
            },
          },
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GeminiError(`Gemini request failed: ${message}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new GeminiError(`Gemini API error ${response.status}: ${body}`, response.status);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new GeminiError("Gemini returned no content");
    }

    try {
      return parseJsonContent(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GeminiError(`Could not parse Gemini response: ${message}`);
    }
  }
}
