import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";
import bcrypt from "bcryptjs";

const t = getTranslations();

export async function GET() {
  const denied = await requirePolicy(POLICY.usersView);
  if (denied) return denied;

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        roleId: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: t.api.failedFetchUsers }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.usersManage);
  if (denied) return denied;

  try {
    const { name, email, password, roleId, active } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: t.api.nameEmailPasswordRequired }, { status: 400 });
    }
    if (!roleId) {
      return NextResponse.json({ error: t.api.roleRequired }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: t.api.emailRegistered }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: parseInt(roleId),
        active: active !== false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: t.api.emailRegistered }, { status: 409 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: t.api.failedCreateUser }, { status: 500 });
  }
}
