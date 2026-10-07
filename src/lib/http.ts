import type { Client } from "@libsql/client";
import { NextRequest, NextResponse } from "next/server";
import { userFromSession, type User } from "./auth";
import { getDb } from "./db";
import { AppError } from "./errors";

export const SESSION_COOKIE = "todo_session";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new AppError(415, "Send JSON data.");
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AppError(400, "Invalid JSON data.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "Invalid JSON data.");
  }
  return value as Record<string, unknown>;
}

export function checkOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new AppError(403, "Request origin is not allowed.");
  }
}

export async function requireUser(request: NextRequest): Promise<{ db: Client; user: User }> {
  const db = getDb();
  const user = await userFromSession(db, request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) throw new AppError(401, "Please sign in.");
  return { db, user };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
