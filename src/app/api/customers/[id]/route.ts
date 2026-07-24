import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id: parseInt(id) } });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...body,
        ...(body.creditLimit !== undefined && { creditLimit: parseFloat(body.creditLimit) }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.customer.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
