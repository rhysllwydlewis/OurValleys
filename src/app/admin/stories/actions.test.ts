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
const pictures = vi.hoisted(() => ({
  setStoryPicture: vi.fn(),
  setStoryPictureAlt: vi.fn(),
  removeStoryPicture: vi.fn(),
}));

vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/stories/admin", () => admin);
vi.mock("@/modules/stories/pictures", () => pictures);

import {
  archiveStoryAction,
  createStoryAction,
  deleteStoryAction,
  publishStoryAction,
  removeStoryPictureAction,
  revertStoryToDraftAction,
  scheduleStoryAction,
  setStoryPictureAction,
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
    expect(await scheduleStoryAction({ id })).toEqual({ status: "forbidden" });
    expect(await removeStoryPictureAction({ id })).toEqual({
      status: "forbidden",
    });
    const form = new FormData();
    form.set("id", id);
    form.set("image", new File(["x"], "a.png", { type: "image/png" }));
    expect(await setStoryPictureAction(form)).toEqual({ status: "forbidden" });

    for (const fn of [...Object.values(admin), ...Object.values(pictures)]) {
      expect(fn).not.toHaveBeenCalled();
    }
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

  it("audits scheduling and picture changes, and not refused ones", async () => {
    readAdminSession.mockResolvedValue({ userId: "u1" });
    admin.scheduleStoryForAdmin.mockResolvedValue({
      status: "scheduled",
      scheduledFor: "2026-11-01T10:00:00.000Z",
    });
    pictures.setStoryPicture.mockResolvedValue({ status: "saved" });
    pictures.removeStoryPicture.mockResolvedValue({ status: "removed" });

    await scheduleStoryAction({ id });
    const form = new FormData();
    form.set("id", id);
    form.set("imageAlt", "A picture");
    form.set("image", new File(["x"], "a.png", { type: "image/png" }));
    await setStoryPictureAction(form);
    await removeStoryPictureAction({ id });

    expect(recordAdminAudit.mock.calls.map(([call]) => call.action)).toEqual([
      "story.scheduled",
      "story.picture_saved",
      "story.picture_removed",
    ]);

    recordAdminAudit.mockClear();
    admin.scheduleStoryForAdmin.mockResolvedValue({ status: "not_ready" });
    pictures.removeStoryPicture.mockResolvedValue({ status: "not_found" });
    await scheduleStoryAction({ id });
    expect(await removeStoryPictureAction({ id: "nope" })).toEqual({
      status: "not_found",
    });
    await removeStoryPictureAction({ id });
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("updates only the description when no file is sent", async () => {
    readAdminSession.mockResolvedValue({ userId: "u1" });
    pictures.setStoryPictureAlt.mockResolvedValue({ status: "saved" });
    const form = new FormData();
    form.set("id", id);
    form.set("imageAlt", "New words");
    await setStoryPictureAction(form);
    expect(pictures.setStoryPictureAlt).toHaveBeenCalledWith(id, "New words");
    expect(pictures.setStoryPicture).not.toHaveBeenCalled();
  });
});
