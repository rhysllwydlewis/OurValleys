import { describe, expect, it } from "vitest";
import { inviteBusinessMember, validateInviteFields } from "./team";

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

describe("validateInviteFields", () => {
  it("accepts a valid email and role", () => {
    expect(
      validateInviteFields({ email: " Someone@Example.test ", role: "editor" }),
    ).toEqual({});
  });

  it("points a malformed email at the email input", () => {
    expect(
      Object.keys(validateInviteFields({ email: "nope", role: "editor" })),
    ).toEqual(["email"]);
  });

  it("points a role outside the invitable set at the role input", () => {
    expect(
      Object.keys(
        validateInviteFields({ email: "someone@example.test", role: "owner" }),
      ),
    ).toEqual(["role"]);
  });

  it("reports both fields when both are wrong", () => {
    expect(
      Object.keys(validateInviteFields({ email: "", role: "" })).sort(),
    ).toEqual(["email", "role"]);
  });
});
