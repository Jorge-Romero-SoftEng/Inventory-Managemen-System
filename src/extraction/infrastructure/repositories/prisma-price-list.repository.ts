import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { IPriceListRepository } from "@/extraction/application/contracts/repositories.port";
import type { StandardExtraction, StandardExtractedProduct, SupplierPriceList, SupplierPriceListItem } from "@/types/supplier";

/**
 * Prisma returns NUMERIC columns as Decimal; the domain contract uses plain
 * numbers, so every price list row is mapped on the way out.
 */
type PriceListWithItems = Prisma.SupplierPriceListGetPayload<{
  include: { items: { include: { product: true } } };
}>;
type ItemRow = PriceListWithItems["items"][number];

function mapItem(item: ItemRow): SupplierPriceListItem {
  return {
    id: item.id,
    priceListId: item.priceListId,
    productId: item.productId,
    price: Number(item.price),
    currency: item.currency,
    availability: item.availability as SupplierPriceListItem["availability"],
    product: item.product,
  };
}

function mapPriceList(row: PriceListWithItems): SupplierPriceList {
  return {
    ...row,
    items: row.items.map(mapItem),
  };
}

/**
 * Persists a validated extraction. Everything runs inside one Prisma
 * transaction: products are upserted per supplier (canonical supplier
 * catalog), then the price list and its items are created. This guarantees
 * atomicity — a partial price list is never left behind on failure.
 */
export class PrismaPriceListRepository implements IPriceListRepository {
  async persistExtraction(data: {
    supplierId: number;
    documentId: number;
    extraction: StandardExtraction;
  }): Promise<SupplierPriceList> {
    const { supplierId, documentId, extraction } = data;
    const effectiveDate = parseEffectiveDate(extraction.effective_date);
    const currency = inferCurrency(extraction.products);

    return prisma.$transaction(async (tx) => {
      const priceList = await tx.supplierPriceList.create({
        data: {
          supplierId,
          effectiveDate,
          currency,
          sourceDocumentId: documentId,
          status: "extracted",
        },
      });

      const items: {
        priceListId: number;
        productId: number;
        price: number;
        currency: string | null;
        availability: string;
      }[] = [];

      for (const p of extraction.products) {
        const product = await tx.supplierProduct.upsert({
          where: { supplierId_name: { supplierId, name: p.name } },
          update: { unit: p.unit },
          create: { supplierId, name: p.name, unit: p.unit },
        });
        items.push({
          priceListId: priceList.id,
          productId: product.id,
          price: p.price ?? 0,
          currency: p.currency ?? currency,
          availability: p.availability,
        });
      }

      if (items.length > 0) {
        await tx.supplierPriceListItem.createMany({ data: items });
      }

      const row = await tx.supplierPriceList.findUniqueOrThrow({
        where: { id: priceList.id },
        include: { items: { include: { product: true } } },
      });
      return mapPriceList(row);
    });
  }

  async listBySupplier(supplierId: number): Promise<SupplierPriceList[]> {
    const rows = await prisma.supplierPriceList.findMany({
      where: { supplierId },
      include: {
        items: { include: { product: true } },
        sourceDocument: { select: { id: true, inputType: true, fileName: true, createdAt: true } },
      },
      orderBy: { effectiveDate: "desc" },
    });
    return rows.map(mapPriceList);
  }

  async findByDocumentId(documentId: number): Promise<SupplierPriceList | null> {
    const row = await prisma.supplierPriceList.findFirst({
      where: { sourceDocumentId: documentId },
      include: {
        items: { include: { product: true } },
        supplier: true,
      },
    });
    return row ? mapPriceList(row) : null;
  }
}

/** Falls back to "today" when the document omits a date (design decision). */
function parseEffectiveDate(value?: string | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date();
}

/** Picks the most frequent product currency, defaulting to ARS. */
function inferCurrency(products: StandardExtractedProduct[]): string | null {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (p.currency) counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1);
  }
  let best = "ARS";
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}
