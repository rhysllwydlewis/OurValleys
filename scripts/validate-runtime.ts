import { getServerEnvironment } from "../src/lib/env";
import { detectStaleBetterAuthUrl } from "../src/lib/runtime-configuration";

try {
  getServerEnvironment();

  const staleBetterAuthUrl = detectStaleBetterAuthUrl(process.env);
  if (staleBetterAuthUrl) {
    console.warn(
      JSON.stringify({
        warning: "better_auth_url_origin_mismatch",
        message:
          "BETTER_AUTH_URL's origin does not match the origin Railway reports as public. " +
          "Sign-in and other state-changing auth requests may be rejected as an invalid " +
          "origin unless this is an intentional custom-domain setup.",
        configuredOrigin: staleBetterAuthUrl.configured,
        railwayPublicOrigin: staleBetterAuthUrl.railwayPublicOrigin,
      }),
    );
  }

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
