import { describe, expect, it } from "vitest";
import { parseDatabaseEnvironment, parseServerEnvironment } from "./env";

const validEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres@localhost:5432/ourvalleys_test",
  BETTER_AUTH_SECRET: "x".repeat(64),
  BETTER_AUTH_URL: "http://localhost:3000",
  AUTH_EMAIL_PASSWORD_ENABLED: "false",
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

  it("parses a valid full server environment", () => {
    const result = parseServerEnvironment(validEnvironment);
    expect(result.AUTH_EMAIL_PASSWORD_ENABLED).toBe(false);
    expect(result.NODE_ENV).toBe("test");
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
