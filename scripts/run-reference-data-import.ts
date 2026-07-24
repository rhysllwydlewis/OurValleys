import { closeDatabase } from "../src/lib/database/client";
import { importReferenceData } from "./import-reference-data";

importReferenceData()
  .catch((error: unknown) => {
    console.error("Reference data import failed.");
    console.error(error instanceof Error ? error.message : "Unknown error.");
    process.exitCode = 1;
  })
  .finally(async () => closeDatabase(1));
