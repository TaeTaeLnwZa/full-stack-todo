import { randomUUID } from "node:crypto";
import type { Client, Row } from "@libsql/client";
import { AppError } from "./errors";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

function toTask(row: Row): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    completed: Number(row.completed) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listTasks(db: Client, userId: string): Promise<Task[]> {
  const result = await db.execute({
    sql: "SELECT id, title, completed, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC",
    args: [userId],
  });
  return result.rows.map(toTask);
}

export async function addTask(db: Client, userId: string, rawTitle: unknown): Promise<Task> {
  if (typeof rawTitle !== "string") throw new AppError(400, "Enter a task.");
  const title = rawTitle.trim();
  if (!title || title.length > 200) throw new AppError(400, "Task must be 1–200 characters.");
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: "INSERT INTO tasks (id, user_id, title, completed, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
    args: [id, userId, title, now, now],
  });
  return { id, title, completed: false, createdAt: now, updatedAt: now };
}

export async function setTaskCompleted(db: Client, userId: string, taskId: string, completed: unknown): Promise<Task> {
  if (typeof completed !== "boolean") throw new AppError(400, "Completed must be true or false.");
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: "UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ? AND user_id = ? RETURNING id, title, completed, created_at, updated_at",
    args: [completed ? 1 : 0, now, taskId, userId],
  });
  if (!result.rows[0]) throw new AppError(404, "Task not found.");
  return toTask(result.rows[0]);
}

export async function removeTask(db: Client, userId: string, taskId: string): Promise<void> {
  const result = await db.execute({
    sql: "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    args: [taskId, userId],
  });
  if (!result.rowsAffected) throw new AppError(404, "Task not found.");
}
