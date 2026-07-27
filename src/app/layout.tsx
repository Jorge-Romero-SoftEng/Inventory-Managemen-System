import type { Metadata } from "next";
import "./globals.css";
import { getLocale, getTranslations } from "@/i18n/translations";
import { LocaleProvider } from "@/i18n";

export function generateMetadata(): Metadata {
  const t = getTranslations();
  return {
    title: t.layout.title,
    description: t.layout.description,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getLocale();
  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
