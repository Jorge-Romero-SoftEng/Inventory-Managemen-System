import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prices = await prisma.productPrice.findMany({
      where: { productId: parseInt(id) },
      include: { priceList: true },
    });
    return NextResponse.json(prices);
  } catch (error) {
    console.error("Get prices error:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { prices } = await request.json();

    const productId = parseInt(id);

    await prisma.$transaction(
      prices.map((p: { priceListId: number; price: number }) =>
        prisma.productPrice.upsert({
          where: {
            productId_priceListId: { productId, priceListId: p.priceListId },
          },
          update: { price: parseFloat(p.price as unknown as string) },
          create: {
            productId,
            priceListId: p.priceListId,
            price: parseFloat(p.price as unknown as string),
          },
        })
      )
    );

    const updated = await prisma.productPrice.findMany({
      where: { productId },
      include: { priceList: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update prices error:", error);
    return NextResponse.json({ error: "Failed to update prices" }, { status: 500 });
  }
}
