import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET() {
  const denied = await requirePolicy(POLICY.rolesView);
  if (denied) return denied;

  try {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            rolePolicies: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Get roles error:", error);
    return NextResponse.json({ error: t.api.failedFetchRoles }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.rolesManage);
  if (denied) return denied;

  try {
    const { name, description, policies } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: t.api.nameRequired }, { status: 400 });
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: { name: name.trim(), description: description || null },
      });

      if (Array.isArray(policies) && policies.length > 0) {
        const policyRows = await tx.policy.findMany({
          where: { key: { in: policies as string[] } },
          select: { id: true },
        });
        await tx.rolePolicy.createMany({
          data: policyRows.map((p) => ({ roleId: created.id, policyId: p.id })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: t.api.roleExists }, { status: 409 });
    }
    console.error("Create role error:", error);
    return NextResponse.json({ error: t.api.failedCreateRole }, { status: 500 });
  }
}
