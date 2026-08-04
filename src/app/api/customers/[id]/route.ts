import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.customersView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id: parseInt(id) } });
    if (!customer || customer.deletedAt) return NextResponse.json({ error: t.api.customerNotFound }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json({ error: t.api.failedFetchCustomer }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.customersUpdate);
  if (denied) return denied;

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
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: t.api.customerNotFound }, { status: 404 });
    }
    console.error("Update customer error:", error);
    return NextResponse.json({ error: t.api.failedUpdateCustomer }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.customersDelete);
  if (denied) return denied;

  try {
    const { id } = await params;
    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: t.api.customerNotFound }, { status: 404 });
    }
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: t.api.failedDeleteCustomer }, { status: 500 });
  }
}
