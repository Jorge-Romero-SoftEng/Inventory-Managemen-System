import { NextResponse } from "next/server";
import { requirePolicy, POLICY, POLICY_CATALOG } from "@/lib/policies";

export async function GET() {
  const denied = await requirePolicy(POLICY.rolesView);
  if (denied) return denied;

  return NextResponse.json(POLICY_CATALOG);
}
