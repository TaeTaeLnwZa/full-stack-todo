import { readFileSync } from "node:fs";
import { getDb } from "../src/lib/db";

export async function initDb() {
  const db = getDb();
  const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.execute(statement);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  initDb().then(() => console.log("Database ready.")).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
