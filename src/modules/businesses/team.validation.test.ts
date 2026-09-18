import { describe, expect, it } from "vitest";
import { inviteBusinessMember } from "./team";

describe("inviteBusinessMember validation", () => {
  it("rejects a malformed email before any database work", async () => {
    await expect(
      inviteBusinessMember({
        businessId: "00000000-0000-4000-8000-000000000001",
        email: "not-an-email",
        role: "editor",
        invitedByUserId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
  });

  it("rejects a role outside the invitable set before any database work", async () => {
    await expect(
      inviteBusinessMember({
        businessId: "00000000-0000-4000-8000-000000000001",
        email: "someone@example.test",
        role: "owner" as never,
        invitedByUserId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
  });

  it("rejects a malformed business id before any database work", async () => {
    await expect(
      inviteBusinessMember({
        businessId: "not-a-uuid",
        email: "someone@example.test",
        role: "editor",
        invitedByUserId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
  });
});
