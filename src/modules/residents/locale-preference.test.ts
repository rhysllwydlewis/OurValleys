import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rows = vi.hoisted(() => ({ selected: [] as Array<{ locale: string }> }));
const upsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/database/client", () => ({
  getDatabase: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => rows.selected }) }),
    }),
    insert: () => ({
      values: (values: unknown) => ({
        onConflictDoUpdate: async (conflict: unknown) =>
          upsert(values, conflict),
      }),
    }),
  }),
}));

import { readSavedLocale, saveLocale } from "./locale-preference";

describe("locale preference", () => {
  beforeEach(() => {
    rows.selected = [];
    upsert.mockReset();
  });

  it("returns the saved language", async () => {
    rows.selected = [{ locale: "cy" }];
    expect(await readSavedLocale("u1")).toBe("cy");
  });

  it("returns undefined when nothing is saved", async () => {
    expect(await readSavedLocale("u1")).toBeUndefined();
  });

  it("ignores an unsupported stored value", async () => {
    rows.selected = [{ locale: "fr" }];
    expect(await readSavedLocale("u1")).toBeUndefined();
  });

  it("upserts the chosen language for the resident", async () => {
    await saveLocale("u1", "cy");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [values, conflict] = upsert.mock.calls[0] as [
      { userId: string; locale: string },
      { set: { locale: string } },
    ];
    expect(values).toEqual({ userId: "u1", locale: "cy" });
    expect(conflict.set.locale).toBe("cy");
  });
});
