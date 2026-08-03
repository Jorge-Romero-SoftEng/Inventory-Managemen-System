import { describe, it, expect, vi } from "vitest";

async function loadTranslations(locale: "es" | "en", appName?: string) {
  vi.resetModules();
  process.env.NEXT_PUBLIC_LOCALE = locale;
  if (appName === undefined) {
    delete process.env.NEXT_PUBLIC_APP_NAME;
  } else {
    process.env.NEXT_PUBLIC_APP_NAME = appName;
  }
  const { getTranslations } = await import("@/i18n/translations");
  return getTranslations();
}

function collectKeys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      collectKeys(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
}

describe("translations", () => {
  it("es uses brand defaults when NEXT_PUBLIC_APP_NAME is unset", async () => {
    const t = await loadTranslations("es");

    expect(t.layout.brand).toBe("WholesalePOS");
    expect(t.layout.headerBrand).toBe("WHOLESALE POS");
    expect(t.layout.title).toBe("Wholesale POS");
    expect(t.login.title).toBe("Wholesale POS");
    expect(t.layout.description).toBe("Sistema de Punto de Venta e Inventario Mayorista");
  });

  it("en uses brand defaults when NEXT_PUBLIC_APP_NAME is unset", async () => {
    const t = await loadTranslations("en");

    expect(t.layout.brand).toBe("WholesalePOS");
    expect(t.layout.headerBrand).toBe("WHOLESALE POS");
    expect(t.layout.title).toBe("Wholesale POS");
    expect(t.login.title).toBe("Wholesale POS");
    expect(t.layout.description).toBe("Wholesale POS and Inventory Management System");
  });

  it("en replaces every brand string with NEXT_PUBLIC_APP_NAME", async () => {
    const t = await loadTranslations("en", "Mi Negocio");

    expect(t.layout.brand).toBe("Mi Negocio");
    expect(t.layout.headerBrand).toBe("Mi Negocio");
    expect(t.layout.title).toBe("Mi Negocio");
    expect(t.login.title).toBe("Mi Negocio");
    expect(t.layout.description).toBe("Mi Negocio and Inventory Management System");
  });

  it("es replaces brand strings but keeps its static description", async () => {
    const t = await loadTranslations("es", "Mi Negocio");

    expect(t.layout.brand).toBe("Mi Negocio");
    expect(t.layout.headerBrand).toBe("Mi Negocio");
    expect(t.layout.title).toBe("Mi Negocio");
    expect(t.login.title).toBe("Mi Negocio");
    expect(t.layout.description).toBe("Sistema de Punto de Venta e Inventario Mayorista");
  });

  it("en and es expose the same key structure", async () => {
    vi.resetModules();
    const en = (await import("@/i18n/en")).default;
    const es = (await import("@/i18n/es")).default;

    expect(collectKeys(es).sort()).toEqual(collectKeys(en).sort());
  });
});
