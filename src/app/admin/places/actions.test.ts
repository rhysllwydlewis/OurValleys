import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateTag,
  readAdminSession,
  createPlaceForAdmin,
  updatePlaceForAdmin,
  savePlaceProfileForAdmin,
  recordAdminAudit,
  savePlacePicture,
  updatePlacePictureText,
  removePlacePicture,
} = vi.hoisted(() => ({
  savePlacePicture: vi.fn(),
  updatePlacePictureText: vi.fn(),
  removePlacePicture: vi.fn(),
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
vi.mock("@/modules/reference-data/place-picture", () => ({
  savePlacePicture,
  updatePlacePictureText,
  removePlacePicture,
}));
vi.mock("@/modules/reference-data/admin-places", () => ({
  createPlaceForAdmin,
  updatePlaceForAdmin,
}));

import {
  createPlaceAction,
  removePlacePictureAction,
  savePlacePictureAction,
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

  describe("place pictures", () => {
    const placeId = "11111111-1111-4111-8111-111111111111";

    function form(entries: Record<string, string | File>) {
      const data = new FormData();
      for (const [key, value] of Object.entries(entries)) data.set(key, value);
      return data;
    }

    it("refuses everyone but a platform admin, before touching anything", async () => {
      readAdminSession.mockResolvedValue(null);
      const file = new File([new Uint8Array([1, 2, 3])], "a.png", {
        type: "image/png",
      });

      expect(
        await savePlacePictureAction(
          form({ placeId, alt: "A street", image: file }),
        ),
      ).toEqual({ status: "forbidden" });
      expect(await removePlacePictureAction({ placeId })).toEqual({
        status: "forbidden",
      });
      expect(savePlacePicture).not.toHaveBeenCalled();
      expect(updatePlacePictureText).not.toHaveBeenCalled();
      expect(removePlacePicture).not.toHaveBeenCalled();
      expect(recordAdminAudit).not.toHaveBeenCalled();
    });

    it("uploads a chosen file, audits it and drops the cached directory", async () => {
      savePlacePicture.mockResolvedValue({ status: "saved" });
      const file = new File([new Uint8Array([1, 2, 3])], "a.png", {
        type: "image/png",
      });

      const result = await savePlacePictureAction(
        form({
          placeId,
          alt: "A street",
          altCy: "",
          credit: "Me",
          image: file,
        }),
      );

      expect(result).toEqual({ status: "saved" });
      expect(savePlacePicture).toHaveBeenCalledWith(
        expect.objectContaining({
          placeId,
          contentType: "image/png",
          alt: "A street",
          actorUserId: "admin-1",
        }),
      );
      expect(updateTag).toHaveBeenCalledWith("business-directory");
      expect(recordAdminAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "place.picture_saved",
          targetId: placeId,
        }),
      );
    });

    it("edits only the words when no file is chosen", async () => {
      updatePlacePictureText.mockResolvedValue({ status: "saved" });

      await savePlacePictureAction(form({ placeId, alt: "A street" }));

      expect(savePlacePicture).not.toHaveBeenCalled();
      expect(updatePlacePictureText).toHaveBeenCalledOnce();
    });

    it("does not audit or clear the cache when the save was refused", async () => {
      updatePlacePictureText.mockResolvedValue({
        status: "invalid",
        message: "no",
      });

      const result = await savePlacePictureAction(form({ placeId, alt: "" }));

      expect(result.status).toBe("invalid");
      expect(updateTag).not.toHaveBeenCalled();
      expect(recordAdminAudit).not.toHaveBeenCalled();
    });

    it("audits removal and tolerates malformed input", async () => {
      removePlacePicture.mockResolvedValue({ status: "saved" });
      await removePlacePictureAction({ placeId });
      expect(recordAdminAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "place.picture_removed" }),
      );

      removePlacePicture.mockResolvedValue({ status: "not_found" });
      recordAdminAudit.mockClear();
      expect(await removePlacePictureAction("nonsense")).toEqual({
        status: "not_found",
      });
      expect(recordAdminAudit).not.toHaveBeenCalled();
    });
  });
});
