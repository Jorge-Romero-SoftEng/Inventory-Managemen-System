import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const priceLists = await prisma.priceList.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(priceLists);
  } catch (error) {
    console.error("Get price lists error:", error);
    return NextResponse.json({ error: "Failed to fetch price lists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const priceList = await prisma.priceList.create({ data: { name } });
    return NextResponse.json(priceList, { status: 201 });
  } catch (error) {
    console.error("Create price list error:", error);
    return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
  }
}
