import { describe, expect, it } from "vitest";
import {
  detectStaleBetterAuthUrl,
  resolveDatabaseConnection,
  resolveDatabaseUrl,
  resolveServiceUrl,
  resolveTrustedOrigins,
  type RuntimeConfigurationInput,
} from "@/lib/runtime-configuration";

describe("resolveDatabaseConnection", () => {
  it("prefers DATABASE_URL outside a Railway environment", () => {
    const result = resolveDatabaseConnection({
      DATABASE_URL: "postgresql://user:pass@db.example.com/app",
      DATABASE_PRIVATE_URL: "postgresql://user:pass@private.example.com/app",
      POSTGRES_URL: "postgresql://user:pass@other.example.com/app",
    });
    expect(result.source).toBe("DATABASE_URL");
    expect(result.url).toBe("postgresql://user:pass@db.example.com/app");
    expect(result.endpointClass).toBe("public-or-external");
  });

  it("falls back through DATABASE_PRIVATE_URL then POSTGRES_URL outside Railway", () => {
    expect(
      resolveDatabaseConnection({
        DATABASE_PRIVATE_URL: "postgresql://user:pass@private.example.com/app",
        POSTGRES_URL: "postgresql://user:pass@other.example.com/app",
      }).source,
    ).toBe("DATABASE_PRIVATE_URL");

    expect(
      resolveDatabaseConnection({
        POSTGRES_URL: "postgresql://user:pass@other.example.com/app",
      }).source,
    ).toBe("POSTGRES_URL");
  });

  it("prefers DATABASE_PRIVATE_URL over DATABASE_URL inside a Railway environment", () => {
    const result = resolveDatabaseConnection({
      RAILWAY_ENVIRONMENT: "production",
      DATABASE_URL: "postgresql://user:pass@public.example.com/app",
      DATABASE_PRIVATE_URL: "postgresql://user:pass@db.railway.internal/app",
    });
    expect(result.source).toBe("DATABASE_PRIVATE_URL");
    expect(result.endpointClass).toBe("railway-private");
  });

  it("builds a connection from PGHOST/PGUSER/PGPASSWORD/PGDATABASE parts", () => {
    const result = resolveDatabaseConnection({
      PGHOST: "db.internal",
      PGUSER: "app",
      PGPASSWORD: "secret",
      PGDATABASE: "ourvalleys",
    });
    expect(result.source).toBe("PG_VARIABLES");
    expect(result.url).toBe(
      "postgresql://app:secret@db.internal:5432/ourvalleys",
    );
  });

  it("throws when PG_VARIABLES are only partially supplied", () => {
    expect(() =>
      resolveDatabaseConnection({ PGHOST: "db.internal", PGUSER: "app" }),
    ).toThrowError(/PGHOST, PGUSER, PGPASSWORD, PGDATABASE/);
  });

  it("throws a DATABASE_URL error when nothing is configured at all", () => {
    expect(() => resolveDatabaseConnection({})).toThrowError(/DATABASE_URL/);
  });

  it("rejects a non-Postgres connection string", () => {
    expect(() =>
      resolveDatabaseConnection({ DATABASE_URL: "mysql://user:pass@host/db" }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("rejects a malformed connection string", () => {
    expect(() =>
      resolveDatabaseConnection({ DATABASE_URL: "not a url" }),
    ).toThrowError(/DATABASE_URL/);
  });

  describe("endpoint classification", () => {
    const cases: Array<[string, string]> = [
      ["postgresql://user:pass@localhost/db", "loopback"],
      ["postgresql://user:pass@127.0.0.1/db", "loopback"],
      ["postgresql://user:pass@0.0.0.0/db", "loopback"],
      ["postgresql://user:pass@[::1]/db", "loopback"],
      ["postgresql://user:pass@app.railway.internal/db", "railway-private"],
      ["postgresql://user:pass@service.internal/db", "private-network"],
      ["postgresql://user:pass@host.local/db", "private-network"],
      ["postgresql://user:pass@10.0.0.5/db", "private-network"],
      ["postgresql://user:pass@192.168.1.5/db", "private-network"],
      ["postgresql://user:pass@172.16.0.1/db", "private-network"],
      ["postgresql://user:pass@172.31.255.255/db", "private-network"],
      ["postgresql://user:pass@172.15.0.1/db", "public-or-external"],
      ["postgresql://user:pass@172.32.0.1/db", "public-or-external"],
      ["postgresql://user:pass@db.example.com/db", "public-or-external"],
    ];

    it.each(cases)("classifies %s as %s", (url, expected) => {
      expect(
        resolveDatabaseConnection({ DATABASE_URL: url }).endpointClass,
      ).toBe(expected);
    });
  });

  it("blocks a loopback DATABASE_URL in a Railway production environment", () => {
    expect(() =>
      resolveDatabaseConnection({
        NODE_ENV: "production",
        RAILWAY_ENVIRONMENT: "production",
        DATABASE_URL: "postgresql://user:pass@localhost/db",
      }),
    ).toThrowError(/loopback host/);
  });

  it("allows a loopback DATABASE_URL outside Railway or outside production", () => {
    expect(() =>
      resolveDatabaseConnection({
        DATABASE_URL: "postgresql://user:pass@localhost/db",
      }),
    ).not.toThrow();

    expect(() =>
      resolveDatabaseConnection({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost/db",
      }),
    ).not.toThrow();

    expect(() =>
      resolveDatabaseConnection({
        RAILWAY_ENVIRONMENT: "production",
        DATABASE_URL: "postgresql://user:pass@localhost/db",
      }),
    ).not.toThrow();
  });
});

describe("resolveDatabaseUrl", () => {
  it("returns just the resolved connection string", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgresql://user:pass@db.example.com/app",
      }),
    ).toBe("postgresql://user:pass@db.example.com/app");
  });
});

describe("resolveServiceUrl", () => {
  it("normalises an explicit value to its origin", () => {
    expect(
      resolveServiceUrl(
        "https://ourvalleys.example.com/some/path",
        undefined,
        "X",
      ),
    ).toBe("https://ourvalleys.example.com");
  });

  it("falls back to the Railway public domain when unset", () => {
    expect(resolveServiceUrl(undefined, "app.up.railway.app", "X")).toBe(
      "https://app.up.railway.app",
    );
  });

  it("prefers an explicit value over the Railway public domain", () => {
    expect(
      resolveServiceUrl(
        "https://custom.example.com",
        "app.up.railway.app",
        "X",
      ),
    ).toBe("https://custom.example.com");
  });

  it("throws naming the field when neither source is configured", () => {
    expect(() =>
      resolveServiceUrl(undefined, undefined, "BETTER_AUTH_URL"),
    ).toThrowError(/BETTER_AUTH_URL/);
  });

  it("rejects a non-http(s) protocol", () => {
    expect(() =>
      resolveServiceUrl("ftp://example.com", undefined, "X"),
    ).toThrowError(/X/);
  });

  it("rejects a malformed URL", () => {
    expect(() => resolveServiceUrl("not a url", undefined, "X")).toThrowError(
      /X/,
    );
  });
});

describe("resolveTrustedOrigins", () => {
  it("returns an empty list when nothing is configured", () => {
    expect(resolveTrustedOrigins({})).toEqual([]);
  });

  it("includes BETTER_AUTH_URL, NEXT_PUBLIC_SITE_URL and the Railway public domain", () => {
    const origins = resolveTrustedOrigins({
      BETTER_AUTH_URL: "https://auth.example.com/api",
      NEXT_PUBLIC_SITE_URL: "https://ourvalleys.example.com",
      RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
    });
    expect(origins).toEqual([
      "https://auth.example.com",
      "https://ourvalleys.example.com",
      "https://app.up.railway.app",
    ]);
  });

  it("deduplicates identical origins", () => {
    const origins = resolveTrustedOrigins({
      BETTER_AUTH_URL: "https://ourvalleys.example.com/auth",
      NEXT_PUBLIC_SITE_URL: "https://ourvalleys.example.com",
    });
    expect(origins).toEqual(["https://ourvalleys.example.com"]);
  });

  it("ignores an invalid URL rather than throwing", () => {
    expect(resolveTrustedOrigins({ BETTER_AUTH_URL: "not a url" })).toEqual([]);
  });
});

describe("detectStaleBetterAuthUrl", () => {
  const base: RuntimeConfigurationInput = {
    RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
    BETTER_AUTH_URL: "https://app.up.railway.app",
  };

  it("returns null when the Railway public domain is not set", () => {
    expect(
      detectStaleBetterAuthUrl({ BETTER_AUTH_URL: "https://example.com" }),
    ).toBeNull();
  });

  it("returns null when BETTER_AUTH_URL is not set", () => {
    expect(
      detectStaleBetterAuthUrl({ RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app" }),
    ).toBeNull();
  });

  it("returns null when the configured origin matches Railway's public origin", () => {
    expect(detectStaleBetterAuthUrl(base)).toBeNull();
  });

  it("reports a mismatch when a custom domain is configured", () => {
    expect(
      detectStaleBetterAuthUrl({
        ...base,
        BETTER_AUTH_URL: "https://www.ourvalleys.wales",
      }),
    ).toEqual({
      configured: "https://www.ourvalleys.wales",
      railwayPublicOrigin: "https://app.up.railway.app",
    });
  });

  it("returns null when BETTER_AUTH_URL is not a valid URL", () => {
    expect(
      detectStaleBetterAuthUrl({ ...base, BETTER_AUTH_URL: "not a url" }),
    ).toBeNull();
  });
});
