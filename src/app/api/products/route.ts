import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (active !== null) where.active = active === "true";

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        prices: { include: { priceList: true } },
        stock: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barcode, sku, name, categoryId, unit, packSize, cost, active } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        barcode: barcode || null,
        sku: sku || null,
        name,
        categoryId: categoryId ? parseInt(categoryId) : null,
        unit,
        packSize: packSize ? parseFloat(packSize) : 1,
        cost: cost ? parseFloat(cost) : 0,
        active: active !== false,
      },
    });

    await prisma.stock.create({
      data: { productId: product.id, warehouse: "main", quantity: 0 },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
