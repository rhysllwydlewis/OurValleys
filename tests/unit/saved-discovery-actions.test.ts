import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
  saveBusinessForUser: vi.fn(),
  removeBusinessForUser: vi.fn(),
  saveEventForUser: vi.fn(),
  removeEventForUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));

vi.mock("@/lib/public-demo-policy", () => ({
  isPublicDemoEmail: (email: string) => email === "demo@example.test",
}));

vi.mock("@/modules/residents/saved-discovery", () => ({
  saveBusinessForUser: mocks.saveBusinessForUser,
  removeBusinessForUser: mocks.removeBusinessForUser,
  saveEventForUser: mocks.saveEventForUser,
  removeEventForUser: mocks.removeEventForUser,
}));

import {
  removeBusinessAction,
  removeEventAction,
  saveBusinessAction,
  saveEventAction,
} from "@/app/account/saved/actions";

const userId = "00000000-0000-4000-8000-000000000101";
const itemId = "00000000-0000-4000-8000-000000000201";

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("itemId", overrides.itemId ?? itemId);
  data.set("returnTo", overrides.returnTo ?? "/businesses");
  return data;
}

function signedInSession(email = "resident@example.test", id = userId) {
  return { user: { id, email } };
}

async function expectRedirect(
  action: (data: FormData) => Promise<never>,
  data: FormData,
  destination: string,
) {
  await expect(action(data)).rejects.toThrow(`REDIRECT:${destination}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(signedInSession());
  mocks.saveBusinessForUser.mockResolvedValue("saved");
  mocks.removeBusinessForUser.mockResolvedValue("removed");
  mocks.saveEventForUser.mockResolvedValue("saved");
  mocks.removeEventForUser.mockResolvedValue("removed");
});

describe("saved discovery server actions", () => {
  it.each([
    [saveBusinessAction, mocks.saveBusinessForUser, "business"],
    [removeBusinessAction, mocks.removeBusinessForUser, "business"],
    [saveEventAction, mocks.saveEventForUser, "event"],
    [removeEventAction, mocks.removeEventForUser, "event"],
  ] as const)(
    "derives the resident from the verified session",
    async (action, mutation, kind) => {
      await expectRedirect(
        action,
        formData(),
        `/businesses?savedKind=${kind}&savedOutcome=${
          action === removeBusinessAction || action === removeEventAction
            ? "removed"
            : "saved"
        }`,
      );
      expect(mutation).toHaveBeenCalledWith(userId, itemId);
    },
  );

  it("directs anonymous residents to sign in before calling the service", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expectRedirect(
      saveBusinessAction,
      formData(),
      "/login?next=%2Fbusinesses",
    );
    expect(mocks.saveBusinessForUser).not.toHaveBeenCalled();
  });

  it("preserves the exact event return path through anonymous sign-in", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expectRedirect(
      saveEventAction,
      formData({ returnTo: `/events/${itemId}` }),
      `/login?next=%2Fevents%2F${itemId}`,
    );
    expect(mocks.saveEventForUser).not.toHaveBeenCalled();
  });

  it("fails closed when the authenticated session cannot be read", async () => {
    mocks.getSession.mockRejectedValue(new Error("session unavailable"));
    await expectRedirect(
      saveBusinessAction,
      formData(),
      "/businesses?savedKind=business&savedOutcome=forbidden",
    );
    expect(mocks.saveBusinessForUser).not.toHaveBeenCalled();
  });

  it("denies shared public-demo mutations", async () => {
    mocks.getSession.mockResolvedValue(signedInSession("demo@example.test"));
    await expectRedirect(
      saveEventAction,
      formData(),
      "/businesses?savedKind=event&savedOutcome=forbidden",
    );
    expect(mocks.saveEventForUser).not.toHaveBeenCalled();
  });

  it("denies sessions whose user identifier is invalid", async () => {
    mocks.getSession.mockResolvedValue(
      signedInSession("resident@example.test", "not-a-uuid"),
    );
    await expectRedirect(
      removeBusinessAction,
      formData(),
      "/businesses?savedKind=business&savedOutcome=forbidden",
    );
    expect(mocks.removeBusinessForUser).not.toHaveBeenCalled();
  });

  it("rejects invalid item identifiers before calling the service", async () => {
    await expectRedirect(
      saveBusinessAction,
      formData({ itemId: "not-a-uuid" }),
      "/businesses?savedKind=business&savedOutcome=invalid",
    );
    expect(mocks.saveBusinessForUser).not.toHaveBeenCalled();
  });

  it.each([
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "/\\attacker.example/steal",
  ])("falls back from unsafe return destination %s", async (returnTo) => {
    await expectRedirect(
      saveEventAction,
      formData({ returnTo }),
      "/account/saved?savedKind=event&savedOutcome=saved",
    );
  });

  it("preserves an existing safe query string", async () => {
    mocks.saveBusinessForUser.mockResolvedValue("already_saved");
    await expectRedirect(
      saveBusinessAction,
      formData({ returnTo: "/businesses?q=plumber" }),
      "/businesses?q=plumber&savedKind=business&savedOutcome=already_saved",
    );
  });
});
