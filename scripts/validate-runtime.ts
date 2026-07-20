import { getServerEnvironment } from "../src/lib/env";

try {
  getServerEnvironment();
  console.info(
    JSON.stringify({
      runtimeConfiguration: "valid",
      authenticationConfiguration: "valid",
    }),
  );
} catch (error: unknown) {
  console.error("Runtime configuration validation failed.");
  console.error(
    error instanceof Error
      ? error.message
      : "Unknown runtime configuration error.",
  );
  process.exitCode = 1;
}
