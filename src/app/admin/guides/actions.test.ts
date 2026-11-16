import { beforeEach, describe, expect, it, vi } from "vitest";

const readAdminSession = vi.hoisted(() => vi.fn());
const saveGuideWelshForAdmin = vi.hoisted(() => vi.fn());
const deleteGuideWelshForAdmin = vi.hoisted(() => vi.fn());
const recordAdminAudit = vi.hoisted(() => vi.fn());
const updateTag = vi.hoisted(() => vi.fn());
const publishGuideForAdmin = vi.hoisted(() => vi.fn());
const saveGuidePicture = vi.hoisted(() => vi.fn());
const updateGuidePictureText = vi.hoisted(() => vi.fn());
const removeGuidePicture = vi.hoisted(() => vi.fn());

vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/guides/welsh-admin", () => ({
  saveGuideWelshForAdmin,
  deleteGuideWelshForAdmin,
}));
vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/modules/guides/admin", () => ({ publishGuideForAdmin }));
vi.mock("@/modules/guides/guide-picture", () => ({
  saveGuidePicture,
  updateGuidePictureText,
  removeGuidePicture,
}));

import {
  deleteGuideWelshAction,
  publishGuideAction,
  removeGuidePictureAction,
  saveGuidePictureAction,
  saveGuideWelshAction,
} from "./actions";

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

  it("refreshes the cached guide lists only after a change really lands", async () => {
    readAdminSession.mockResolvedValue(null);
    await publishGuideAction({ id: guideId });
    expect(updateTag).not.toHaveBeenCalled();

    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    publishGuideForAdmin.mockResolvedValueOnce("not_found");
    await publishGuideAction({ id: guideId });
    expect(updateTag).not.toHaveBeenCalled();

    publishGuideForAdmin.mockResolvedValueOnce("updated");
    await publishGuideAction({ id: guideId });
    expect(updateTag).toHaveBeenCalledWith("guides");
    expect(updateTag).toHaveBeenCalledWith("homepage");
  });
});

describe("guide picture actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function pictureForm(withFile: boolean, id: string = guideId): FormData {
    const data = new FormData();
    data.set("guideId", id);
    data.set("alt", "Hills above the town");
    data.set("altCy", "Bryniau uwchben y dref");
    data.set("credit", "A. Photographer");
    if (withFile) {
      data.set(
        "image",
        new File([new Uint8Array([1, 2, 3])], "hills.png", {
          type: "image/png",
        }),
      );
    }
    return data;
  }

  it("refuses everyone who is not a signed-in platform admin, before reading the upload", async () => {
    readAdminSession.mockResolvedValue(null);

    expect(await saveGuidePictureAction(pictureForm(true))).toEqual({
      status: "forbidden",
    });
    expect(await removeGuidePictureAction({ guideId })).toEqual({
      status: "forbidden",
    });
    expect(saveGuidePicture).not.toHaveBeenCalled();
    expect(updateGuidePictureText).not.toHaveBeenCalled();
    expect(removeGuidePicture).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("uploads a chosen file, refreshes the public guides and audits it", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    saveGuidePicture.mockResolvedValue({ status: "saved" });

    expect(await saveGuidePictureAction(pictureForm(true))).toEqual({
      status: "saved",
    });
    expect(saveGuidePicture).toHaveBeenCalledWith(
      expect.objectContaining({
        guideId,
        contentType: "image/png",
        alt: "Hills above the town",
        altCy: "Bryniau uwchben y dref",
        credit: "A. Photographer",
      }),
    );
    expect(saveGuidePicture.mock.calls[0]![0].bytes).toEqual(
      Buffer.from([1, 2, 3]),
    );
    expect(updateGuidePictureText).not.toHaveBeenCalled();
    expect(updateTag).toHaveBeenCalledWith("guides");
    expect(updateTag).toHaveBeenCalledWith("homepage");
    expect(recordAdminAudit).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "guide.picture_saved",
      targetType: "guide",
      targetId: guideId,
    });
  });

  it("edits the words only when no file is chosen", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    updateGuidePictureText.mockResolvedValue({ status: "saved" });

    await saveGuidePictureAction(pictureForm(false));
    expect(saveGuidePicture).not.toHaveBeenCalled();
    expect(updateGuidePictureText).toHaveBeenCalledWith({
      guideId,
      alt: "Hills above the town",
      altCy: "Bryniau uwchben y dref",
      credit: "A. Photographer",
    });
  });

  it("neither audits nor refreshes a refused or failed save", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    for (const outcome of [
      { status: "invalid", message: "Upload a JPEG, PNG or WebP image." },
      { status: "not_found" },
      { status: "disabled" },
      { status: "unavailable" },
    ]) {
      saveGuidePicture.mockResolvedValueOnce(outcome);
      expect(await saveGuidePictureAction(pictureForm(true))).toEqual(outcome);
    }
    expect(recordAdminAudit).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("removes the picture and audits it; a malformed request reaches the module as no id", async () => {
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    removeGuidePicture.mockResolvedValueOnce({ status: "saved" });
    expect(await removeGuidePictureAction({ guideId })).toEqual({
      status: "saved",
    });
    expect(removeGuidePicture).toHaveBeenCalledWith(guideId);
    expect(recordAdminAudit).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      action: "guide.picture_removed",
      targetType: "guide",
      targetId: guideId,
    });

    vi.clearAllMocks();
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
    removeGuidePicture.mockResolvedValue({ status: "not_found" });
    for (const bad of [null, "text", 7, {}]) {
      expect(await removeGuidePictureAction(bad)).toEqual({
        status: "not_found",
      });
    }
    expect(removeGuidePicture).toHaveBeenCalledWith(null);
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });
});
