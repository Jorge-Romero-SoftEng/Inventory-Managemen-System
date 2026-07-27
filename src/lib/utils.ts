import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getFormatLocale } from "@/i18n/translations"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(getFormatLocale(), {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(getFormatLocale()).format(n);
}
