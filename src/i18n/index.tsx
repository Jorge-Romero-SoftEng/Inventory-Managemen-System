"use client";

import { createContext, useContext } from "react";
import { getTranslations, type Translations } from "./translations";
import es from "./es";

const LocaleContext = createContext<Translations>(es);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const t = getTranslations();
  return <LocaleContext.Provider value={t}>{children}</LocaleContext.Provider>;
}

export function useTranslations(): Translations {
  return useContext(LocaleContext);
}

export { getLocale, getTranslations, getFormatLocale, type Translations } from "./translations";
