import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getTranslations } from "@/i18n/translations";

export async function POST(request: NextRequest) {
  const t = getTranslations();
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: t.api.emailAndPasswordRequired }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user || user.deletedAt || !user.active) {
      return NextResponse.json({ error: t.api.invalidCredentials }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: t.api.invalidCredentials }, { status: 401 });
    }

    const roleName = user.role?.name ?? null;
    const token = await signToken({
      userId: user.id,
      email: user.email!,
      name: user.name,
      role: roleName,
      roleId: user.roleId,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: roleName, roleId: user.roleId },
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: t.api.internalError }, { status: 500 });
  }
}
