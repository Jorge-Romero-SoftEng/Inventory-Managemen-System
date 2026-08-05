import { NextRequest, NextResponse } from "next/server";
import { POLICY, requirePolicy } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import { buildExtractionContainer } from "@/extraction/application/di/container";

const t = getTranslations();

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const denied = await requirePolicy(POLICY.suppliersView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { suppliers } = buildExtractionContainer();
    const row = await suppliers.getById(Number(id));
    if (!row) return NextResponse.json({ error: t.api.supplierNotFound }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Get supplier error:", error);
    return NextResponse.json({ error: t.api.failedFetchSupplier }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requirePolicy(POLICY.suppliersManage);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const { suppliers } = buildExtractionContainer();
    const row = await suppliers.update(Number(id), {
      name: body.name,
      contact: body.contact ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      active: body.active,
    });
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Supplier not found")) {
      return NextResponse.json({ error: t.api.supplierNotFound }, { status: 404 });
    }
    console.error("Update supplier error:", error);
    return NextResponse.json({ error: t.api.failedUpdateSupplier }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const denied = await requirePolicy(POLICY.suppliersManage);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { suppliers } = buildExtractionContainer();
    await suppliers.remove(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return NextResponse.json({ error: t.api.failedDeleteSupplier }, { status: 500 });
  }
}
