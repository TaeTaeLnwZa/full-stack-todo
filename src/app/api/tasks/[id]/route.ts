import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, errorResponse, readJson, requireUser } from "@/lib/http";
import { removeTask, setTaskCompleted } from "@/lib/tasks";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    const { db, user } = await requireUser(request);
    const body = await readJson(request);
    const { id } = await context.params;
    return NextResponse.json({ task: await setTaskCompleted(db, user.id, id, body.completed) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    const { db, user } = await requireUser(request);
    const { id } = await context.params;
    await removeTask(db, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
