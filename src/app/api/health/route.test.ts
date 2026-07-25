import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("reports the web service as ok without touching any dependency", async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: "ok", service: "web" });
  });
});
