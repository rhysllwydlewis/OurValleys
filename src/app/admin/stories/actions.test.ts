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
}));

vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/stories/admin", () => admin);

import {
  archiveStoryAction,
  createStoryAction,
  deleteStoryAction,
  publishStoryAction,
  revertStoryToDraftAction,
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
});
