import { beforeEach, describe, expect, it, vi } from "vitest";

const readAdminSession = vi.hoisted(() => vi.fn());
const recordAdminAudit = vi.hoisted(() => vi.fn());
const admin = vi.hoisted(() => ({
  createStoryForAdmin: vi.fn(),
  updateStoryForAdmin: vi.fn(),
  publishStoryForAdmin: vi.fn(),
  archiveStoryForAdmin: vi.fn(),
  revertStoryToDraftForAdmin: vi.fn(),
  deleteStoryForAdmin: vi.fn(),
  scheduleStoryForAdmin: vi.fn(),
}));
const picture = vi.hoisted(() => ({
  saveStoryPicture: vi.fn(),
  updateStoryPictureAlt: vi.fn(),
  removeStoryPicture: vi.fn(),
}));

vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/stories/admin", () => admin);
vi.mock("@/modules/stories/picture", () => picture);

import {
  archiveStoryAction,
  createStoryAction,
  deleteStoryAction,
  publishStoryAction,
  removeStoryPictureAction,
  revertStoryToDraftAction,
  saveStoryPictureAction,
  scheduleStoryAction,
  updateStoryAction,
} from "./actions";

const id = "00000000-0000-4000-8000-0000000009bb";

describe("local story actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse everyone who is not a signed-in platform admin", async () => {
    readAdminSession.mockResolvedValue(null);

    expect(await createStoryAction({})).toEqual({ status: "forbidden" });
    expect(await updateStoryAction({})).toEqual({ status: "forbidden" });
    expect(await publishStoryAction({ id })).toBe("forbidden");
    expect(await archiveStoryAction({ id })).toBe("forbidden");
    expect(await revertStoryToDraftAction({ id })).toBe("forbidden");
    expect(await deleteStoryAction({ id })).toBe("forbidden");

    for (const fn of Object.values(admin)) expect(fn).not.toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("rejects a malformed id before touching the database", async () => {
    readAdminSession.mockResolvedValue({ userId: "u1" });

    expect(await publishStoryAction({ id: "nope" })).toBe("invalid");
    expect(await deleteStoryAction({})).toBe("invalid");
    expect(admin.publishStoryForAdmin).not.toHaveBeenCalled();
    expect(admin.deleteStoryForAdmin).not.toHaveBeenCalled();
  });

  it("audits each successful change with the acting admin", async () => {
    readAdminSession.mockResolvedValue({ userId: "u1" });
    admin.publishStoryForAdmin.mockResolvedValue("updated");
    admin.deleteStoryForAdmin.mockResolvedValue("deleted");
    admin.createStoryForAdmin.mockResolvedValue({
      status: "created",
      id,
      updatedAt: "x",
    });

    await publishStoryAction({ id });
    await deleteStoryAction({ id });
    await createStoryAction({});

    expect(recordAdminAudit.mock.calls.map(([call]) => call.action)).toEqual([
      "story.published",
      "story.deleted",
      "story.created",
    ]);
    expect(recordAdminAudit.mock.calls[0]![0]).toMatchObject({
      actorUserId: "u1",
      targetType: "local_story",
      targetId: id,
    });
    expect(admin.createStoryForAdmin).toHaveBeenCalledWith({}, "u1");
  });

  it("does not audit a refused change", async () => {
    readAdminSession.mockResolvedValue({ userId: "u1" });
    admin.publishStoryForAdmin.mockResolvedValue("not_ready");

    expect(await publishStoryAction({ id })).toBe("not_ready");
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  describe("scheduling and pictures", () => {
    it("refuse everyone who is not a platform admin", async () => {
      readAdminSession.mockResolvedValue(null);
      const form = new FormData();
      form.set("storyId", id);
      form.set("alt", "A picture");
      form.set(
        "image",
        new File([new Uint8Array(8)], "a.png", { type: "image/png" }),
      );

      expect(
        await scheduleStoryAction({ id, publishAt: "2030-01-01T10:00" }),
      ).toBe("forbidden");
      expect(await saveStoryPictureAction(form)).toEqual({
        status: "forbidden",
      });
      expect(await removeStoryPictureAction({ id })).toEqual({
        status: "forbidden",
      });
      expect(admin.scheduleStoryForAdmin).not.toHaveBeenCalled();
      for (const fn of Object.values(picture))
        expect(fn).not.toHaveBeenCalled();
      expect(recordAdminAudit).not.toHaveBeenCalled();
    });

    it("validate input before touching the database", async () => {
      readAdminSession.mockResolvedValue({ userId: "u1" });
      expect(await scheduleStoryAction({ id: "nope", publishAt: "x" })).toBe(
        "invalid",
      );
      expect(await scheduleStoryAction({ id })).toBe("invalid");
      expect(await removeStoryPictureAction({ id: "nope" })).toEqual({
        status: "not_found",
      });
      expect(admin.scheduleStoryForAdmin).not.toHaveBeenCalled();
      expect(picture.removeStoryPicture).not.toHaveBeenCalled();
    });

    it("audit successes only", async () => {
      readAdminSession.mockResolvedValue({ userId: "u1" });
      admin.scheduleStoryForAdmin.mockResolvedValueOnce("schedule_soon");
      expect(
        await scheduleStoryAction({ id, publishAt: "2030-01-01T10:00" }),
      ).toBe("schedule_soon");
      expect(recordAdminAudit).not.toHaveBeenCalled();

      admin.scheduleStoryForAdmin.mockResolvedValueOnce("updated");
      await scheduleStoryAction({ id, publishAt: "2030-01-01T10:00" });
      picture.updateStoryPictureAlt.mockResolvedValueOnce({ status: "saved" });
      const form = new FormData();
      form.set("storyId", id);
      form.set("alt", "Described");
      expect(await saveStoryPictureAction(form)).toEqual({ status: "saved" });
      expect(picture.saveStoryPicture).not.toHaveBeenCalled();
      picture.removeStoryPicture.mockResolvedValueOnce({ status: "saved" });
      await removeStoryPictureAction({ id });
      expect(recordAdminAudit.mock.calls.map(([call]) => call.action)).toEqual([
        "story.scheduled",
        "story.picture_saved",
        "story.picture_removed",
      ]);
    });
  });
});
