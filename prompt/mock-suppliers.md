Done. Added the mock supplier dataset and validation tests.
src/extraction/__tests__/fixtures/mock-suppliers.ts — 10 suppliers (4 clean, 6 messy), each with all 4 representations + expected normalized JSON:
- whatsapp: raw chat string
- excel / googleSheets.rows: 2D arrays matching SheetJS header:1 layout (so you can paste them into the extraction UI)
- pdf: lines as pdf-parse would return
- googleSheets.url: docs.google.com/spreadsheets/d/{id} links
- expected: { supplier, effective_date, products[] } per the standard schema
Messy fixtures bake in: abbreviations (Har. 000), mixed currency ($, pesos, U$S 3,80), missing prices (consultar, S/C, sin precio), out-of-stock markers (AGOTADO, NO HAY, NO TENGO), greetings/emojis/voice-note placeholders, REAJUSTE announcements, and omitted effective dates. ~250 products total.
src/extraction/__tests__/mock-suppliers.test.ts — 10 tests asserting schema validity, 10–50 product counts, coercion round-trips, edge-case coverage, and end-to-end pipeline persistence for every fixture (with effective_date fallback to today when omitted).
Verification: tsc --noEmit clean, extraction suite 42/42, full suite 189/189 passing. Lint remains broken from the pre-existing brace-expansion override issue.