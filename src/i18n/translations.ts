import es from "./es";
import en from "./en";

export type Locale = "es" | "en";
export type Translations = typeof es;

const translations: Record<Locale, Translations> = { es, en };

export function getLocale(): Locale {
  const env = process.env.NEXT_PUBLIC_LOCALE;
  if (env === "en" || env === "es") return env;
  return "es";
}

export function getTranslations(): Translations {
  return translations[getLocale()];
}

export function getFormatLocale(): string {
  return getLocale() === "es" ? "es-AR" : "en-US";
}
