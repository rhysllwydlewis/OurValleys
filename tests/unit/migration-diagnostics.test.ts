import { describe, expect, it } from "vitest";
import {
  describeDatabaseError,
  redactDatabaseSecrets,
  summarizeOptionalExtensions,
} from "../../src/lib/database/migration-diagnostics";

describe("database migration diagnostics", () => {
  it("summarizes installed, available and unavailable optional extensions", () => {
    expect(
      summarizeOptionalExtensions([
        { name: "pg_trgm", installedVersion: "1.6" },
        { name: "unaccent", installedVersion: null },
      ]),
    ).toEqual({
      postgis: "unavailable",
      pg_trgm: "installed",
      unaccent: "available",
    });
  });

  it("redacts credentials from PostgreSQL URLs and password fields", () => {
    const diagnostic = redactDatabaseSecrets(
      "postgresql://user:secret@example.test:5432/app password=another-secret",
    );

    expect(diagnostic).toContain(
      "postgresql://[redacted]@example.test:5432/app",
    );
    expect(diagnostic).toContain("password=[redacted]");
    expect(diagnostic).not.toContain("secret");
  });

  it("preserves useful database fields while redacting nested causes", () => {
    const cause = Object.assign(
      new Error(
        "connection postgresql://user:secret@example.test/app failed",
      ),
      { code: "ECONNREFUSED" },
    );
    const error = Object.assign(new Error("migration failed"), {
      code: "XX000",
      detail: "extension is unavailable",
      hint: "use a compatible database image",
      cause,
    });

    const description = describeDatabaseError(error);

    expect(description).toContain("migration failed");
    expect(description).toContain("code=XX000");
    expect(description).toContain("detail=extension is unavailable");
    expect(description).toContain("hint=use a compatible database image");
    expect(description).toContain("cause=connection");
    expect(description).not.toContain("user:secret");
  });

  it("handles non-error rejection values safely", () => {
    expect(describeDatabaseError("failed")).toBe(
      "Unknown database migration error.",
    );
  });
});
