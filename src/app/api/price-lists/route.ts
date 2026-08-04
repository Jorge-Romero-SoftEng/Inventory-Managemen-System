import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.priceListsView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") === "en" ? "en" : "es";

    const priceLists = await prisma.priceList.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
        active: true,
        createdAt: true,
      },
      orderBy: { nameEs: "asc" },
    });

    const mapped = priceLists.map((pl) => ({
      id: pl.id,
      name: lang === "en" ? pl.nameEn : pl.nameEs,
      active: pl.active,
      createdAt: pl.createdAt,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Get price lists error:", error);
    return NextResponse.json({ error: t.api.failedFetchPriceLists }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.priceListsManage);
  if (denied) return denied;

  try {
    const { nameEs, nameEn } = await request.json();
    if (!nameEs || !nameEn) {
      return NextResponse.json({ error: t.api.priceListNameRequired }, { status: 400 });
    }
    const priceList = await prisma.priceList.create({ data: { nameEs, nameEn } });
    return NextResponse.json(priceList, { status: 201 });
  } catch (error) {
    console.error("Create price list error:", error);
    return NextResponse.json({ error: t.api.failedCreatePriceList }, { status: 500 });
  }
}
