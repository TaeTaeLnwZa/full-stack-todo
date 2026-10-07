import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkOrigin, clearSessionCookie, errorResponse, SESSION_COOKIE } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await deleteSession(getDb(), request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
