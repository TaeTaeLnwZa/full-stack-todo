import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:./todo.sqlite";
    if (process.env.NODE_ENV === "production" && !process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL is required in production");
    }
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}
