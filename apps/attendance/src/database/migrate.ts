import { database } from "./data-source";

async function main() {
  await database.initialize();
  try {
    await database.runMigrations();
    console.log("Attendance migrations complete.");
  } finally {
    await database.destroy();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
