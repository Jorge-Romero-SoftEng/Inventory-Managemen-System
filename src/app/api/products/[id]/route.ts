import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.productsView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        prices: { include: { priceList: true } },
        stock: true,
      },
    });

    if (!product || product.deletedAt) {
      return NextResponse.json({ error: t.api.productNotFound }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ error: t.api.failedFetchProduct }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.productsUpdate);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const { barcode, name, categoryId, cost, active } = body;

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...(barcode !== undefined && { barcode: barcode || null }),
        ...(name !== undefined && { name }),
        ...(categoryId !== undefined && { categoryId: categoryId ? Number(categoryId) : null }),
        ...(cost !== undefined && { cost: parseFloat(cost) }),
        ...(active !== undefined && { active }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: t.api.barcodeExists }, { status: 409 });
    }
    console.error("Update product error:", error);
    return NextResponse.json({ error: t.api.failedUpdateProduct }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.productsDelete);
  if (denied) return denied;

  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: t.api.productNotFound }, { status: 404 });
    }
    console.error("Delete product error:", error);
    return NextResponse.json({ error: t.api.failedDeleteProduct }, { status: 500 });
  }
}
