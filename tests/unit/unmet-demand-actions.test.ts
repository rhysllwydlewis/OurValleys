import { afterEach, describe, expect, it, vi } from "vitest";

const dismiss = vi.fn(async () => "dismissal-1");
const readAdminSession = vi.fn();
const recordAdminAudit = vi.fn(async () => undefined);

vi.mock("@/modules/platform/unmet-demand", () => ({
  dismissUnmetDemand: dismiss,
}));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));

const valid = {
  queryText: "bakery",
  categorySlug: null,
  placeSlug: "pontypridd",
  status: "seeded",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("dismissUnmetDemandAction", () => {
  it("refuses callers who are not platform admins", async () => {
    readAdminSession.mockResolvedValue(null);
    const { dismissUnmetDemandAction } =
      await import("@/app/admin/demand/actions");
    expect(await dismissUnmetDemandAction(valid)).toBe("forbidden");
    expect(dismiss).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("rejects unknown statuses and oversized text", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    const { dismissUnmetDemandAction } =
      await import("@/app/admin/demand/actions");
    expect(await dismissUnmetDemandAction({ ...valid, status: "gone" })).toBe(
      "invalid",
    );
    expect(
      await dismissUnmetDemandAction({ ...valid, queryText: "x".repeat(81) }),
    ).toBe("invalid");
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("records the decision and an audit entry for an admin", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    const { dismissUnmetDemandAction } =
      await import("@/app/admin/demand/actions");
    expect(await dismissUnmetDemandAction(valid)).toBe("dismissed");
    expect(dismiss).toHaveBeenCalledWith({
      ...valid,
      adminUserId: "admin-1",
    });
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "unmet_demand.dismissed",
        targetId: "dismissal-1",
      }),
    );
  });
});
