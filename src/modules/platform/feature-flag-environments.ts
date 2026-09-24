// Shared between the server-only feature-flags module and client admin UI —
// deliberately has no server-only imports so it can be bundled for the
// browser without pulling the database client along with it.
export const featureFlagEnvironments = [
  "development",
  "test",
  "production",
] as const;

export type FeatureFlagEnvironment = (typeof featureFlagEnvironments)[number];
