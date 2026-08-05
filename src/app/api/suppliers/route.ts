import { NextRequest, NextResponse } from "next/server";
import { POLICY, requirePolicy } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import { buildExtractionContainer } from "@/extraction/application/di/container";
import { Prisma } from "@prisma/client";

const t = getTranslations();

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.suppliersView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const active = searchParams.get("active") === "true" ? true : undefined;
    const { suppliers } = buildExtractionContainer();
    const rows = await suppliers.list({ search, active });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Get suppliers error:", error);
    return NextResponse.json({ error: t.api.failedFetchSuppliers }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.suppliersManage);
  if (denied) return denied;

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: t.api.supplierNameRequired }, { status: 400 });
    }
    const { suppliers } = buildExtractionContainer();
    const row = await suppliers.create({
      name,
      contact: body.contact ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: t.api.supplierNameRequired }, { status: 409 });
    }
    console.error("Create supplier error:", error);
    return NextResponse.json({ error: t.api.failedCreateSupplier }, { status: 500 });
  }
}
