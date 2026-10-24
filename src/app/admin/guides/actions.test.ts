import { beforeEach, describe, expect, it, vi } from "vitest";

const readAdminSession = vi.hoisted(() => vi.fn());
const saveGuideWelshForAdmin = vi.hoisted(() => vi.fn());
const deleteGuideWelshForAdmin = vi.hoisted(() => vi.fn());
const recordAdminAudit = vi.hoisted(() => vi.fn());

vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/guides/welsh-admin", () => ({
  saveGuideWelshForAdmin,
  deleteGuideWelshForAdmin,
}));
vi.mock("@/modules/guides/admin", () => ({}));

import { deleteGuideWelshAction, saveGuideWelshAction } from "./actions";

const guideId = "00000000-0000-4000-8000-0000000009aa";

describe("Welsh guide actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses everyone who is not a signed-in platform admin", async () => {
    readAdminSession.mockResolvedValue(null);

    expect(await saveGuideWelshAction({ guideId })).toEqual({
      status: "forbidden",
    });
    expect(await deleteGuideWelshAction({ id: guideId })).toBe("forbidden");
    expect(saveGuideWelshForAdmin).not.toHaveBeenCalled();
    expect(deleteGuideWelshForAdmin).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("audits a successful save but not a refused one", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    saveGuideWelshForAdmin.mockResolvedValueOnce({ status: "conflict" });
    await saveGuideWelshAction({ guideId });
    expect(recordAdminAudit).not.toHaveBeenCalled();

    saveGuideWelshForAdmin.mockResolvedValueOnce({
      status: "saved",
      updatedAt: new Date().toISOString(),
      progress: { total: 1, done: 1, complete: true, missing: [] },
    });
    await saveGuideWelshAction({ guideId });
    expect(recordAdminAudit).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "guide.welsh_saved",
      targetType: "guide",
      targetId: guideId,
    });
  });

  it("rejects a malformed id before touching the database, and audits removal", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    expect(await deleteGuideWelshAction({ id: "nope" })).toBe("invalid");
    expect(deleteGuideWelshForAdmin).not.toHaveBeenCalled();

    deleteGuideWelshForAdmin.mockResolvedValueOnce("deleted");
    expect(await deleteGuideWelshAction({ id: guideId })).toBe("deleted");
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "guide.welsh_removed",
        targetId: guideId,
      }),
    );
  });
});
