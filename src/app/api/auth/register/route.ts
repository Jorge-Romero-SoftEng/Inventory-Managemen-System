import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getTranslations } from "@/i18n/translations";

export async function POST(request: NextRequest) {
  const t = getTranslations();
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: t.api.nameEmailPasswordRequired }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: t.api.emailRegistered }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "admin" },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email!,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } }, { status: 201 });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: t.api.internalError }, { status: 500 });
  }
}
