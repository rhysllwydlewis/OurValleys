import { afterEach, describe, expect, it, vi } from "vitest";

const submit = vi.fn(async () => ({ status: "submitted" as const }));
const review = vi.fn(async () => ({ status: "updated" as const }));
const readAdminSession = vi.fn();
const recordAdminAudit = vi.fn(async () => undefined);

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@/modules/businesses/suggestions", () => ({
  submitBusinessSuggestion: submit,
  reviewBusinessSuggestion: review,
}));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));

const valid = { name: "Cwm Cafe", placeText: "Treorchy" };

afterEach(() => vi.clearAllMocks());

describe("submitBusinessSuggestionAction", () => {
  it("swallows honeypot submissions without storing them", async () => {
    const { submitBusinessSuggestionAction } =
      await import("@/app/suggest-a-business/actions");
    const result = await submitBusinessSuggestionAction({
      ...valid,
      website: "http://spam",
    });
    expect(result).toEqual({ status: "submitted" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects invalid input and rate limits a repeat visitor", async () => {
    const { submitBusinessSuggestionAction } =
      await import("@/app/suggest-a-business/actions");
    expect(await submitBusinessSuggestionAction({ name: "x" })).toEqual({
      status: "invalid",
    });
    for (let i = 0; i < 5; i += 1) {
      expect(await submitBusinessSuggestionAction(valid)).toEqual({
        status: "submitted",
      });
    }
    expect(await submitBusinessSuggestionAction(valid)).toEqual({
      status: "rate_limited",
    });
    expect(submit).toHaveBeenCalledTimes(5);
  });
});

describe("reviewSuggestionAction", () => {
  const input = {
    suggestionId: "7f1c2b1e-6a5d-4d6e-9b8a-1c2d3e4f5a6b",
    status: "seeded",
  };

  it("refuses non-admins before touching data", async () => {
    readAdminSession.mockResolvedValue(null);
    const { reviewSuggestionAction } =
      await import("@/app/admin/suggestions/actions");
    expect(await reviewSuggestionAction(input)).toEqual({
      status: "forbidden",
    });
    expect(review).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("rejects an unknown status for an admin", async () => {
    readAdminSession.mockResolvedValue({ userId: crypto.randomUUID() });
    const { reviewSuggestionAction } =
      await import("@/app/admin/suggestions/actions");
    expect(
      await reviewSuggestionAction({ ...input, status: "published" }),
    ).toEqual({ status: "invalid" });
    expect(review).not.toHaveBeenCalled();
  });

  it("updates and audits for an admin", async () => {
    readAdminSession.mockResolvedValue({ userId: crypto.randomUUID() });
    const { reviewSuggestionAction } =
      await import("@/app/admin/suggestions/actions");
    expect(await reviewSuggestionAction(input)).toEqual({ status: "ok" });
    expect(recordAdminAudit).toHaveBeenCalledOnce();
  });
});
