import { describe, expect, it } from "vitest";
import { getPublicEvent } from "@/modules/events/public";

describe("public event projection", () => {
  it("fails closed before querying for a malformed event identifier", async () => {
    await expect(getPublicEvent("not-an-event-id")).resolves.toEqual({
      state: "not_found",
    });
  });
});
