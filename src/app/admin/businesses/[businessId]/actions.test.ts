import { beforeEach, describe, expect, it, vi } from "vitest";

const readAdminSession = vi.hoisted(() => vi.fn());
const recordAdminAudit = vi.hoisted(() => vi.fn());
const updateTag = vi.hoisted(() => vi.fn());
const approveBusinessPublication = vi.hoisted(() => vi.fn());
const suspendBusiness = vi.hoisted(() => vi.fn());
const reinstateBusiness = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("@/modules/identity/audit-log", () => ({ recordAdminAudit }));
vi.mock("@/modules/businesses/publication", () => ({
  approveBusinessPublication,
  suspendBusiness,
  reinstateBusiness,
  rejectBusinessPublication: vi.fn(),
}));
vi.mock("@/modules/businesses/verification", () => ({
  recordVerificationCheck: vi.fn(),
  revokeVerificationCheck: vi.fn(),
}));

import { approveAction, reinstateAction, suspendAction } from "./actions";

const businessId = "00000000-0000-4000-8000-0000000009bb";

describe("business moderation actions and the homepage cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readAdminSession.mockResolvedValue({ userId: "admin-1" });
  });

  it("drops the homepage cache after approve, suspend and reinstate", async () => {
    approveBusinessPublication.mockResolvedValue({ status: "approved" });
    suspendBusiness.mockResolvedValue({ status: "suspended" });
    reinstateBusiness.mockResolvedValue({ status: "reinstated" });

    await approveAction({ businessId });
    await suspendAction({ businessId, note: "Reported by a resident" });
    await reinstateAction({ businessId });

    expect(updateTag).toHaveBeenCalledTimes(9);
    expect(updateTag).toHaveBeenCalledWith("homepage");
    expect(updateTag).toHaveBeenCalledWith("business-directory");
    expect(updateTag).toHaveBeenCalledWith("events");
  });

  it("leaves the cache alone when the change did not happen", async () => {
    suspendBusiness.mockResolvedValue({ status: "not_found" });

    await suspendAction({ businessId, note: "Reported by a resident" });

    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses non-admins before touching anything", async () => {
    readAdminSession.mockResolvedValue(null);

    expect(await suspendAction({ businessId, note: "Reported" })).toEqual({
      status: "forbidden",
    });
    expect(suspendBusiness).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
