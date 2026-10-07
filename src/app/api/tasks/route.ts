import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, errorResponse, readJson, requireUser } from "@/lib/http";
import { addTask, listTasks } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { db, user } = await requireUser(request);
    return NextResponse.json({ tasks: await listTasks(db, user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { db, user } = await requireUser(request);
    const body = await readJson(request);
    return NextResponse.json({ task: await addTask(db, user.id, body.title) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
