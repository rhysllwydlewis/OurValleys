import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateTag,
  readAdminSession,
  resolvePlaceSuggestion,
  recordAdminAudit,
} = vi.hoisted(() => ({
  updateTag: vi.fn(),
  readAdminSession: vi.fn(),
  resolvePlaceSuggestion: vi.fn(),
  recordAdminAudit: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/reference-data/place-suggestions", () => ({
  resolvePlaceSuggestion,
}));

import { resolvePlaceSuggestionAction } from "./actions";

const input = {
  suggestionId: "11111111-1111-4111-8111-111111111111",
  outcome: "applied",
  addAsFact: true,
};

describe("resolvePlaceSuggestionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
  });

  it("refuses everyone who is not a platform admin, touching nothing", async () => {
    readAdminSession.mockResolvedValue(null);
    expect(await resolvePlaceSuggestionAction(input)).toEqual({
      status: "forbidden",
    });
    expect(resolvePlaceSuggestion).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("audits an applied fact and refreshes the cached place pages", async () => {
    resolvePlaceSuggestion.mockResolvedValue({
      status: "resolved",
      placeSlug: "porth",
      addedFact: true,
    });
    await resolvePlaceSuggestionAction(input);
    expect(resolvePlaceSuggestion).toHaveBeenCalledWith(input, "admin-1");
    expect(updateTag).toHaveBeenCalledWith("business-directory");
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "place_suggestion.applied",
        targetId: input.suggestionId,
      }),
    );
  });

  it("audits a dismissal without touching the cache", async () => {
    resolvePlaceSuggestion.mockResolvedValue({
      status: "resolved",
      placeSlug: "porth",
      addedFact: false,
    });
    await resolvePlaceSuggestionAction({
      ...input,
      outcome: "dismissed",
      addAsFact: false,
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "place_suggestion.dismissed" }),
    );
  });

  it("does not audit a refused decision", async () => {
    resolvePlaceSuggestion.mockResolvedValue({ status: "already_decided" });
    expect(await resolvePlaceSuggestionAction(input)).toEqual({
      status: "already_decided",
    });
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });
});
