import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") === "en" ? "en" : "es";

    const priceLists = await prisma.priceList.findMany({
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
    return NextResponse.json({ error: "Failed to fetch price lists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nameEs, nameEn } = await request.json();
    if (!nameEs || !nameEn) {
      return NextResponse.json({ error: "nameEs and nameEn are required" }, { status: 400 });
    }
    const priceList = await prisma.priceList.create({ data: { nameEs, nameEn } });
    return NextResponse.json(priceList, { status: 201 });
  } catch (error) {
    console.error("Create price list error:", error);
    return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
  }
}
