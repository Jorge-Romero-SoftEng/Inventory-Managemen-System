import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.rolesView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        rolePolicies: {
          include: { policy: { select: { id: true, key: true, nameEs: true, nameEn: true, module: true } } },
        },
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
    });
    if (!role || role.deletedAt) {
      return NextResponse.json({ error: t.api.roleNotFound }, { status: 404 });
    }
    return NextResponse.json(role);
  } catch (error) {
    console.error("Get role error:", error);
    return NextResponse.json({ error: t.api.failedFetchRole }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.rolesManage);
  if (denied) return denied;

  try {
    const { id } = await params;
    const roleId = parseInt(id);
    const { name, description, policies } = await request.json();

    const role = await prisma.$transaction(async (tx) => {
      const existing = await tx.role.findUnique({ where: { id: roleId } });
      if (!existing || existing.deletedAt) {
        throw new Error("ROLE_NOT_FOUND");
      }

      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          ...(name !== undefined && name.trim() && { name: name.trim() }),
          ...(description !== undefined && { description: description || null }),
          updatedAt: new Date(),
        },
      });

      if (Array.isArray(policies)) {
        await tx.rolePolicy.deleteMany({ where: { roleId } });
        if (policies.length > 0) {
          const policyRows = await tx.policy.findMany({
            where: { key: { in: policies as string[] } },
            select: { id: true },
          });
          await tx.rolePolicy.createMany({
            data: policyRows.map((p) => ({ roleId, policyId: p.id })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    return NextResponse.json(role);
  } catch (error) {
    const notFound = error instanceof Error && error.message === "ROLE_NOT_FOUND";
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: notFound ? t.api.roleNotFound : t.api.failedUpdateRole },
      { status: notFound ? 404 : 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.rolesManage);
  if (denied) return denied;

  try {
    const { id } = await params;
    const roleId = parseInt(id);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.deletedAt) {
      return NextResponse.json({ error: t.api.roleNotFound }, { status: 404 });
    }
    if (role.isSystem) {
      return NextResponse.json({ error: t.api.cannotDeleteSystemRole }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { roleId },
        data: { roleId: null, active: false },
      });
      await tx.role.update({
        where: { id: roleId },
        data: { deletedAt: new Date() },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete role error:", error);
    return NextResponse.json({ error: t.api.failedDeleteRole }, { status: 500 });
  }
}
