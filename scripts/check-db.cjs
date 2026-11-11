require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  try {
    const rows = await db.$queryRawUnsafe(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name='paytrack_v1'",
    );
    console.log(JSON.stringify({ isolatedSchemaExists: rows.length > 0 }));
  } catch {
    console.log("Database connection failed (details suppressed to protect credentials).");
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
})();
