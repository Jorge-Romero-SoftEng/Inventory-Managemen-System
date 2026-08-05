import { createHash } from "node:crypto";

/** SHA-256 hex digest of normalized extraction text (used for dedupe). */
export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
