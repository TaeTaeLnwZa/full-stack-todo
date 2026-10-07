import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSession, deleteSession, login, register, userFromSession } from "../src/lib/auth";
import { addTask, listTasks, removeTask, setTaskCompleted } from "../src/lib/tasks";

let db: Client;
let directory: string;

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "daymark-test-"));
  db = createClient({ url: `file:${join(directory, `${randomUUID()}.sqlite`)}` });
  const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.execute(statement);
  }
});

afterEach(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("username and password login", () => {
  it("stores a salted hash, signs in, and validates the session", async () => {
    const user = await register(db, "  Alice_1  ", "secure-password");
    const row = await db.execute({ sql: "SELECT password_hash FROM users WHERE id = ?", args: [user.id] });
    expect(String(row.rows[0].password_hash)).toMatch(/^scrypt:/);
    expect(String(row.rows[0].password_hash)).not.toContain("secure-password");
    expect(await login(db, "ALICE_1", "secure-password")).toEqual(user);
    const token = await createSession(db, user.id);
    expect(await userFromSession(db, token)).toEqual(user);
    await deleteSession(db, token);
    expect(await userFromSession(db, token)).toBeNull();
  });

  it("rejects a wrong password and duplicate username", async () => {
    await register(db, "alice", "secure-password");
    await expect(login(db, "alice", "wrong-pass")).rejects.toMatchObject({ status: 401 });
    await expect(register(db, "ALICE", "another-password")).rejects.toMatchObject({ status: 409 });
  });
});

describe("private task list", () => {
  it("adds, completes, lists, and deletes a task", async () => {
    const user = await register(db, "alice", "secure-password");
    const task = await addTask(db, user.id, "  Finish assignment  ");
    expect(task.title).toBe("Finish assignment");
    expect(await listTasks(db, user.id)).toHaveLength(1);
    const completed = await setTaskCompleted(db, user.id, task.id, true);
    expect(completed.completed).toBe(true);
    await removeTask(db, user.id, task.id);
    expect(await listTasks(db, user.id)).toEqual([]);
  });

  it("rejects empty tasks and blocks another user's access", async () => {
    const alice = await register(db, "alice", "secure-password");
    const bob = await register(db, "bob", "secure-password");
    await expect(addTask(db, alice.id, "   ")).rejects.toMatchObject({ status: 400 });
    const task = await addTask(db, alice.id, "Private task");
    expect(await listTasks(db, bob.id)).toEqual([]);
    await expect(setTaskCompleted(db, bob.id, task.id, true)).rejects.toMatchObject({ status: 404 });
    await expect(removeTask(db, bob.id, task.id)).rejects.toMatchObject({ status: 404 });
    expect((await listTasks(db, alice.id))[0].completed).toBe(false);
  });
});
