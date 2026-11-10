import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateTag,
  readAdminSession,
  createPlaceForAdmin,
  updatePlaceForAdmin,
  savePlaceProfileForAdmin,
  recordAdminAudit,
} = vi.hoisted(() => ({
  savePlaceProfileForAdmin: vi.fn(),
  recordAdminAudit: vi.fn(),
  updateTag: vi.fn(),
  readAdminSession: vi.fn(),
  createPlaceForAdmin: vi.fn(),
  updatePlaceForAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/reference-data/place-profile", () => ({
  savePlaceProfileForAdmin,
}));
vi.mock("@/modules/reference-data/admin-places", () => ({
  createPlaceForAdmin,
  updatePlaceForAdmin,
}));

import {
  createPlaceAction,
  savePlaceProfileAction,
  updatePlaceAction,
} from "./actions";

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

  it("saves a place profile as an admin and records who did it", async () => {
    savePlaceProfileForAdmin.mockResolvedValue({ status: "saved", slug: "x" });

    const result = await savePlaceProfileAction({ placeId: "p1" });

    expect(result).toEqual({ status: "saved", slug: "x" });
    expect(savePlaceProfileForAdmin).toHaveBeenCalledWith(
      { placeId: "p1" },
      "admin-1",
    );
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "place.profile_updated",
        targetId: "p1",
      }),
    );
  });

  it("refuses non-admins a profile write and records nothing", async () => {
    readAdminSession.mockResolvedValue(null);

    expect(await savePlaceProfileAction({ placeId: "p1" })).toEqual({
      status: "forbidden",
    });
    expect(savePlaceProfileForAdmin).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("does not audit a rejected profile", async () => {
    savePlaceProfileForAdmin.mockResolvedValue({ status: "invalid" });

    await savePlaceProfileAction({ placeId: "p1" });

    expect(recordAdminAudit).not.toHaveBeenCalled();
  });
});
