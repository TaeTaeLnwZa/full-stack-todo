import { NextRequest, NextResponse } from "next/server";
import { createSession, register } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkOrigin, errorResponse, readJson, setSessionCookie } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await readJson(request);
    const db = getDb();
    const user = await register(db, body.username, body.password);
    const token = await createSession(db, user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
