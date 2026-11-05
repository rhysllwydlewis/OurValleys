import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateTag,
  readAdminSession,
  createPlaceForAdmin,
  updatePlaceForAdmin,
} = vi.hoisted(() => ({
  updateTag: vi.fn(),
  readAdminSession: vi.fn(),
  createPlaceForAdmin: vi.fn(),
  updatePlaceForAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({
  recordAdminAudit: vi.fn(),
}));
vi.mock("@/modules/reference-data/admin-places", () => ({
  createPlaceForAdmin,
  updatePlaceForAdmin,
}));

import { createPlaceAction, updatePlaceAction } from "./actions";

describe("admin place actions and the cached place tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
  });

  it("drops the cached place tree after a place is created or updated", async () => {
    createPlaceForAdmin.mockResolvedValue({ status: "created", id: "p1" });
    updatePlaceForAdmin.mockResolvedValue({ status: "updated" });

    await createPlaceAction({});
    await updatePlaceAction({ id: "p1" });

    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith("business-directory");
  });

  it("leaves the cache alone when nothing changed", async () => {
    updatePlaceForAdmin.mockResolvedValue({ status: "invalid" });

    await updatePlaceAction({ id: "p1" });

    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses non-admins before touching anything", async () => {
    readAdminSession.mockResolvedValue(null);

    expect(await createPlaceAction({})).toEqual({ status: "forbidden" });
    expect(createPlaceForAdmin).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
