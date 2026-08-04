import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/policies";
import { getTranslations } from "@/i18n/translations";

export async function GET() {
  const t = getTranslations();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }
  return NextResponse.json(user);
}
