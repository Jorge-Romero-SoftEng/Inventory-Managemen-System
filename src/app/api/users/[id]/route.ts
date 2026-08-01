import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePolicy, POLICY } from "@/lib/policies";
import bcrypt from "bcryptjs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.usersView);
  if (denied) return denied;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        deletedAt: true,
        roleId: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.usersManage);
  if (denied) return denied;

  try {
    const { id } = await params;
    const userId = parseInt(id);
    const { name, email, password, roleId, active } = await request.json();

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    if (roleId !== undefined && roleId !== null) data.roleId = parseInt(roleId);
    if (active !== undefined) data.active = active === true;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requirePolicy(POLICY.usersManage);
  if (denied) return denied;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (userId === session.userId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), active: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
