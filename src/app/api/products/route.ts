import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.productsView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const barcode = searchParams.get("barcode");
    const categoryId = searchParams.get("categoryId");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = { deletedAt: null };
    if (barcode) {
      where.barcode = barcode;
    } else if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
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
  const denied = await requirePolicy(POLICY.productsCreate);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { barcode, name, categoryId, cost, active } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        barcode: barcode || null,
        name,
        categoryId: categoryId ? Number(categoryId) : null,
        cost: cost ? parseFloat(cost) : 0,
        active: active !== false,
      },
    });

    await prisma.stock.create({
      data: { productId: product.id, warehouse: "main", quantity: 0 },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A product with that barcode already exists" }, { status: 409 });
    }
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
