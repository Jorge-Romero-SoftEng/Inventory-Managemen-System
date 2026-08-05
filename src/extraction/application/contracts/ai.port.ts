/**
 * Port for the AI structured-extraction engine (Gemini 2.5 Flash in the
 * default composition). Returns the raw parsed JSON; validation against the
 * standard schema happens in the pipeline so the AI adapter stays thin and
 * the schema stays the single source of truth.
 */
export interface IAiExtractor {
  extract(text: string): Promise<unknown>;
}
