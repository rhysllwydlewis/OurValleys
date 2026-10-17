import { afterEach, describe, expect, it, vi } from "vitest";

const submit = vi.fn(async () => ({ status: "submitted" as const }));
const review = vi.fn(async () => ({ status: "updated" as const }));
const findSimilar = vi.fn(async (): Promise<unknown[]> => []);
const readAdminSession = vi.fn();
const recordAdminAudit = vi.fn(async () => undefined);

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@/modules/businesses/suggestions", () => ({
  submitBusinessSuggestion: submit,
  reviewBusinessSuggestion: review,
}));
vi.mock("@/modules/businesses/creation", () => ({
  findSimilarPublishedBusinesses: findSimilar,
}));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));

const valid = { name: "Cwm Cafe", placeText: "Treorchy" };

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

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

describe("already-listed check", () => {
  const listed = {
    id: "1",
    slug: "cwm-cafe",
    tradingName: "Cwm Cafe",
    welshName: null,
    placeName: "Treorchy",
    categoryName: "Cafe",
    matchKind: "exact",
  };

  it("offers the listed business instead of storing the suggestion", async () => {
    findSimilar.mockResolvedValueOnce([
      listed,
      { ...listed, slug: "weak", matchKind: "possible" },
    ]);
    const { submitBusinessSuggestionAction } =
      await import("@/app/suggest-a-business/actions");
    expect(await submitBusinessSuggestionAction(valid)).toEqual({
      status: "possible_duplicates",
      matches: [
        { slug: "cwm-cafe", tradingName: "Cwm Cafe", placeName: "Treorchy" },
      ],
    });
    expect(submit).not.toHaveBeenCalled();
  });

  it("stores the suggestion once the visitor says it is different", async () => {
    findSimilar.mockResolvedValue([listed]);
    const { submitBusinessSuggestionAction } =
      await import("@/app/suggest-a-business/actions");
    expect(
      await submitBusinessSuggestionAction({
        ...valid,
        differentBusiness: true,
      }),
    ).toEqual({ status: "submitted" });
    expect(findSimilar).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledOnce();
  });

  it("ignores a weak lookup match and a failing lookup", async () => {
    findSimilar.mockResolvedValueOnce([{ ...listed, matchKind: "possible" }]);
    const { submitBusinessSuggestionAction } =
      await import("@/app/suggest-a-business/actions");
    expect(await submitBusinessSuggestionAction(valid)).toEqual({
      status: "submitted",
    });
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
