import { NextRequest } from "next/server";

export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export function apiRequest(path: string): NextRequest {
  return new NextRequest(apiUrl(path));
}

export function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function withParams(id: string | number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

export function prismaError(code: string) {
  const err = new Error("Prisma error");
  (err as { code?: string }).code = code;
  return err;
}
