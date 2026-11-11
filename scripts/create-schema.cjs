require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const db = new PrismaClient();
(async () => {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.searchParams.get("schema") !== "paytrack_v1")
      throw new Error("Expected isolated schema.");
    const existing = await db.$queryRawUnsafe(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name='paytrack_v1'",
    );
    if (existing.length)
      throw new Error("Schema already exists. Review migrations instead of recreating it.");
    const sql = fs.readFileSync("prisma/initial.sql", "utf8");
    if (/\b(DROP\s+(TABLE|SCHEMA)|TRUNCATE|DELETE\s+FROM)\b/i.test(sql))
      throw new Error("Destructive SQL rejected.");
    await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe('CREATE SCHEMA "paytrack_v1"');
        await tx.$executeRawUnsafe('SET LOCAL search_path TO "paytrack_v1"');
        for (const statement of sql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)) {
          if (/CREATE SCHEMA/i.test(statement)) continue;
          await tx.$executeRawUnsafe(statement);
        }
      },
      { timeout: 60000 },
    );
    console.log("Created new paytrack_v1 schema and tables. Other schemas were not modified.");
  } catch (error) {
    console.log(
      error.message.startsWith("Schema") ||
        error.message.startsWith("Expected") ||
        error.message.startsWith("Destructive")
        ? error.message
        : JSON.stringify({ message: "Schema setup failed", code: error.code, meta: error.meta }),
    );
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
})();
