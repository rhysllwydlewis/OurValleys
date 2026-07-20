import { describe, expect, it } from "vitest";
import { parseDatabaseEnvironment, parseServerEnvironment } from "./env";
import { resolveDatabaseConnection } from "./runtime-configuration";

const validEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres@localhost:5432/ourvalleys_test",
  BETTER_AUTH_SECRET: "x".repeat(64),
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  LOG_LEVEL: "info",
};

describe("environment parsing", () => {
  it("parses database configuration independently of authentication", () => {
    const result = parseDatabaseEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: validEnvironment.DATABASE_URL,
    });

    expect(result.DATABASE_URL).toBe(validEnvironment.DATABASE_URL);
    expect(result.NODE_ENV).toBe("production");
  });

  it("accepts Railway-style PostgreSQL connection parts", () => {
    const result = parseDatabaseEnvironment({
      NODE_ENV: "production",
      PGHOST: "postgres.railway.internal",
      PGPORT: "5432",
      PGUSER: "postgres",
      PGPASSWORD: "not-logged",
      PGDATABASE: "railway",
    });

    expect(result.DATABASE_URL).toBe(
      "postgresql://postgres:not-logged@postgres.railway.internal:5432/railway",
    );
  });

  it("prefers an explicit Railway private URL over a stale generic URL", () => {
    const result = resolveDatabaseConnection({
      NODE_ENV: "production",
      RAILWAY_ENVIRONMENT_ID: "production-environment",
      DATABASE_URL: "postgresql://postgres@127.0.0.1:5432/stale",
      DATABASE_PRIVATE_URL:
        "postgresql://postgres:private@postgres.railway.internal:5432/railway",
    });

    expect(result.source).toBe("DATABASE_PRIVATE_URL");
    expect(result.endpointClass).toBe("railway-private");
    expect(result.url).toContain("postgres.railway.internal");
  });

  it("prefers complete Railway PG variables over a generic URL", () => {
    const result = resolveDatabaseConnection({
      NODE_ENV: "production",
      RAILWAY_SERVICE_ID: "web-service",
      DATABASE_URL: "postgresql://postgres@db.example.test:5432/stale",
      PGHOST: "postgres.railway.internal",
      PGPORT: "5432",
      PGUSER: "postgres",
      PGPASSWORD: "private",
      PGDATABASE: "railway",
    });

    expect(result.source).toBe("PG_VARIABLES");
    expect(result.endpointClass).toBe("railway-private");
  });

  it("keeps ordinary DATABASE_URL precedence outside Railway", () => {
    const result = resolveDatabaseConnection({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres@localhost:5432/direct",
      DATABASE_PRIVATE_URL:
        "postgresql://postgres@postgres.railway.internal:5432/private",
    });

    expect(result.source).toBe("DATABASE_URL");
    expect(result.endpointClass).toBe("loopback");
  });

  it.each(["localhost", "127.0.0.1", "127.0.1.1"])(
    "rejects the %s loopback database target in Railway production",
    (hostname) => {
      expect(() =>
        resolveDatabaseConnection({
          NODE_ENV: "production",
          RAILWAY_ENVIRONMENT_ID: "production-environment",
          DATABASE_URL: `postgresql://postgres@${hostname}:5432/railway`,
        }),
      ).toThrow("not a loopback host");
    },
  );

  it("parses a valid full server environment", () => {
    const result = parseServerEnvironment(validEnvironment);
    expect(result.BETTER_AUTH_URL).toBe("http://localhost:3000");
    expect(result.NODE_ENV).toBe("test");
  });

  it("derives public service URLs from Railway when explicit URLs are absent", () => {
    const result = parseServerEnvironment({
      NODE_ENV: "production",
      DATABASE_URL:
        "postgresql://postgres@postgres.railway.internal:5432/railway",
      BETTER_AUTH_SECRET: validEnvironment.BETTER_AUTH_SECRET,
      RAILWAY_PUBLIC_DOMAIN: "ourvalleys-production.up.railway.app",
    });

    expect(result.BETTER_AUTH_URL).toBe(
      "https://ourvalleys-production.up.railway.app",
    );
    expect(result.NEXT_PUBLIC_SITE_URL).toBe(
      "https://ourvalleys-production.up.railway.app",
    );
  });

  it("rejects MongoDB as an incompatible system of record without revealing it", () => {
    const mongoUrl =
      "mongodb://private-user:private-password@mongo.internal/app";
    expect(() =>
      parseDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: mongoUrl,
      }),
    ).toThrow("DATABASE_URL");

    try {
      parseDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: mongoUrl,
      });
    } catch (error) {
      expect(String(error)).not.toContain("private-user");
      expect(String(error)).not.toContain("private-password");
    }
  });

  it("rejects incomplete PostgreSQL parts with a bounded field list", () => {
    expect(() =>
      parseDatabaseEnvironment({
        NODE_ENV: "production",
        PGHOST: "postgres.railway.internal",
        PGUSER: "postgres",
      }),
    ).toThrow("PGHOST, PGUSER, PGPASSWORD, PGDATABASE");
  });

  it("uses a complete direct URL when unrelated PG variables are incomplete", () => {
    const result = resolveDatabaseConnection({
      NODE_ENV: "test",
      DATABASE_URL: validEnvironment.DATABASE_URL,
      PGHOST: "unused.internal",
    });

    expect(result.source).toBe("DATABASE_URL");
  });

  it("rejects an undersized authentication secret without revealing it", () => {
    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow("BETTER_AUTH_SECRET");
  });

  it("rejects invalid public URLs", () => {
    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        NEXT_PUBLIC_SITE_URL: "not-a-url",
      }),
    ).toThrow("NEXT_PUBLIC_SITE_URL");
  });

  it("rejects a missing database URL for database consumers", () => {
    expect(() => parseDatabaseEnvironment({ NODE_ENV: "production" })).toThrow(
      "DATABASE_URL",
    );
  });
});
