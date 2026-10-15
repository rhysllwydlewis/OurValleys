import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
  saveSearchForUser: vi.fn(),
  removeSavedSearchForUser: vi.fn(),
  openSavedSearchForUser: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/public-demo-policy", () => ({
  isPublicDemoEmail: (email: string) => email === "demo@example.test",
}));
vi.mock("@/modules/residents/saved-discovery", () => ({
  saveBusinessForUser: vi.fn(),
  removeBusinessForUser: vi.fn(),
  saveEventForUser: vi.fn(),
  removeEventForUser: vi.fn(),
  savePlaceForUser: vi.fn(),
  removePlaceForUser: vi.fn(),
}));
vi.mock("@/modules/residents/saved-searches", () => ({
  saveSearchForUser: mocks.saveSearchForUser,
  removeSavedSearchForUser: mocks.removeSavedSearchForUser,
  openSavedSearchForUser: mocks.openSavedSearchForUser,
}));

import {
  openSearchAction,
  removeSearchAction,
  saveSearchAction,
} from "@/app/account/saved/actions";

const userId = "00000000-0000-4000-8000-000000000101";
const otherUserId = "00000000-0000-4000-8000-000000000102";
const itemId = "00000000-0000-4000-8000-000000000301";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function redirectedTo(run: () => Promise<never>) {
  try {
    await run();
  } catch (error) {
    return (error as Error).message.replace("REDIRECT:", "");
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({
    user: { id: userId, email: "resident@example.test" },
  });
  mocks.saveSearchForUser.mockResolvedValue("saved");
  mocks.removeSavedSearchForUser.mockResolvedValue("removed");
  mocks.openSavedSearchForUser.mockResolvedValue("/search?q=bakery");
});

describe("saved search server actions", () => {
  it("saves for the verified session and returns to the search with the outcome", async () => {
    const destination = await redirectedTo(() =>
      saveSearchAction(
        form({
          query: "bakery",
          type: "events",
          returnTo: "/search?q=bakery&type=events",
          userId: otherUserId,
        }),
      ),
    );
    expect(destination).toBe(
      "/search?q=bakery&type=events&savedKind=search&savedOutcome=saved",
    );
    expect(mocks.saveSearchForUser).toHaveBeenCalledWith(
      userId,
      "bakery",
      "events",
    );
  });

  it("sends anonymous visitors to sign in and back, without touching the service", async () => {
    mocks.getSession.mockResolvedValue(null);
    const destination = await redirectedTo(() =>
      saveSearchAction(
        form({ query: "bakery", type: "all", returnTo: "/search?q=bakery" }),
      ),
    );
    expect(destination).toBe("/login?next=%2Fsearch%3Fq%3Dbakery");
    expect(mocks.saveSearchForUser).not.toHaveBeenCalled();
  });

  it("refuses the public demonstration account", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: userId, email: "demo@example.test" },
    });
    const destination = await redirectedTo(() =>
      saveSearchAction(form({ query: "bakery", returnTo: "/search?q=bakery" })),
    );
    expect(destination).toContain("savedOutcome=forbidden");
    expect(mocks.saveSearchForUser).not.toHaveBeenCalled();
  });

  it("ignores an off-site return path", async () => {
    const destination = await redirectedTo(() =>
      saveSearchAction(
        form({ query: "bakery", returnTo: "https://evil.example/x" }),
      ),
    );
    expect(destination.startsWith("/account/saved?")).toBe(true);
  });

  it("removes only through the verified resident", async () => {
    await redirectedTo(() =>
      removeSearchAction(
        form({
          itemId,
          returnTo: "/account/saved?tab=searches",
          userId: otherUserId,
        }),
      ),
    );
    expect(mocks.removeSavedSearchForUser).toHaveBeenCalledWith(userId, itemId);
  });

  it("opens a search at its address, and returns with an outcome when it is not theirs", async () => {
    expect(
      await redirectedTo(() =>
        openSearchAction(form({ itemId, returnTo: "/account/saved" })),
      ),
    ).toBe("/search?q=bakery");
    expect(mocks.openSavedSearchForUser).toHaveBeenCalledWith(userId, itemId);

    mocks.openSavedSearchForUser.mockResolvedValue(null);
    expect(
      await redirectedTo(() =>
        openSearchAction(
          form({ itemId, returnTo: "/account/saved?tab=searches" }),
        ),
      ),
    ).toBe(
      "/account/saved?tab=searches&savedKind=search&savedOutcome=not_found",
    );
  });
});
