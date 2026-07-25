import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock("@/lib/database/client", () => ({
  getDatabase: () => ({ execute: mocks.execute }),
}));

vi.mock("@/lib/auth", () => ({
  getAuth: mocks.getAuth,
}));

import { GET } from "./route";

describe("GET /api/ready", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("reports ready with a 200 status when the database and auth are both available", async () => {
    mocks.execute.mockResolvedValue(undefined);
    mocks.getAuth.mockReturnValue({ handler: () => undefined });

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      status: "ready",
      database: "reachable",
      authentication: "configured",
    });
  });

  it("reports not_ready with a 503 status when the database query fails", async () => {
    mocks.execute.mockRejectedValue(new Error("connection refused"));
    mocks.getAuth.mockReturnValue({ handler: () => undefined });

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({
      status: "not_ready",
      database: "unavailable",
      authentication: "configured",
    });
  });

  it("reports not_ready with a 503 status when auth is not configured", async () => {
    mocks.execute.mockResolvedValue(undefined);
    mocks.getAuth.mockReturnValue({ handler: undefined });

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({
      status: "not_ready",
      database: "reachable",
      authentication: "unavailable",
    });
  });

  it("reports not_ready with a 503 status when reading auth configuration throws", async () => {
    mocks.execute.mockResolvedValue(undefined);
    mocks.getAuth.mockImplementation(() => {
      throw new Error("Invalid server environment configuration.");
    });

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({
      status: "not_ready",
      database: "reachable",
      authentication: "unavailable",
    });
  });

  it("never exposes the underlying database error detail in the response", async () => {
    mocks.execute.mockRejectedValue(
      new Error('password authentication failed for user "postgres"'),
    );
    mocks.getAuth.mockReturnValue({ handler: () => undefined });

    const response = await GET();
    const body = await response.text();
    expect(body).not.toContain("password authentication failed");
  });
});
