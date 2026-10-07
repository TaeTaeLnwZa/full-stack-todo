import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Client } from "@libsql/client";
import { AppError } from "./errors";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;

export type User = { id: string; username: string };

function cleanUsername(input: unknown): string {
  if (typeof input !== "string") throw new AppError(400, "Enter a valid username.");
  const username = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new AppError(400, "Username must be 3–24 letters, numbers, or underscores.");
  }
  return username;
}

function cleanPassword(input: unknown): string {
  if (typeof input !== "string" || input.length < 8 || input.length > 128) {
    throw new AppError(400, "Password must be 8–128 characters.");
  }
  return input;
}

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function matchesPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split(":");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== 64) return false;
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  return timingSafeEqual(expected, actual);
}

export async function register(db: Client, rawUsername: unknown, rawPassword: unknown): Promise<User> {
  const username = cleanUsername(rawUsername);
  const password = cleanPassword(rawPassword);
  const user = { id: randomUUID(), username };
  const now = new Date().toISOString();
  try {
    await db.execute({
      sql: "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
      args: [user.id, username, await passwordHash(password), now],
    });
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new AppError(409, "Username is already taken.");
    throw error;
  }
  return user;
}

export async function login(db: Client, rawUsername: unknown, rawPassword: unknown): Promise<User> {
  const username = cleanUsername(rawUsername);
  const password = cleanPassword(rawPassword);
  const result = await db.execute({
    sql: "SELECT id, username, password_hash FROM users WHERE username = ?",
    args: [username],
  });
  const row = result.rows[0];
  if (!row || !(await matchesPassword(password, String(row.password_hash)))) {
    throw new AppError(401, "Incorrect username or password.");
  }
  return { id: String(row.id), username: String(row.username) };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(db: Client, userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.execute({
    sql: "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    args: [tokenHash(token), userId, expires],
  });
  return token;
}

export async function userFromSession(db: Client, token: string | undefined): Promise<User | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await db.execute({
    sql: `SELECT users.id, users.username FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    args: [tokenHash(token), new Date().toISOString()],
  });
  const row = result.rows[0];
  return row ? { id: String(row.id), username: String(row.username) } : null;
}

export async function deleteSession(db: Client, token: string | undefined): Promise<void> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  await db.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [tokenHash(token)] });
}
