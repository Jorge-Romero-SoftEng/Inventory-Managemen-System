import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePolicy, POLICY } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

const t = getTranslations();

export async function GET(request: NextRequest) {
  const denied = await requirePolicy(POLICY.categoriesView);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.name = { contains: search, mode: "insensitive" as const };
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ error: t.api.failedFetchCategories }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePolicy(POLICY.categoriesCreate);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: t.api.nameRequired }, { status: 400 });
    }

    const category = await prisma.category.create({ data: { name: name.trim() } });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: t.api.categoryExists }, { status: 409 });
    }
    console.error("Create category error:", error);
    return NextResponse.json({ error: t.api.failedCreateCategory }, { status: 500 });
  }
}
