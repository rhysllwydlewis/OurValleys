import { describe, expect, it } from "vitest";
import {
  contactMethodToAction,
  type BusinessContactMethodView,
} from "@/modules/businesses/contacts-and-enquiries";

function method(
  overrides: Partial<BusinessContactMethodView> = {},
): BusinessContactMethodView {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    type: "call",
    label: "Call us",
    value: "+44 1443 123456",
    enabled: true,
    isPrimary: true,
    sortOrder: 0,
    consentNote: null,
    ...overrides,
  };
}

describe("public contact actions", () => {
  it("builds safe telephone and WhatsApp destinations", () => {
    expect(contactMethodToAction(method())?.href).toBe("tel:+441443123456");
    expect(
      contactMethodToAction(
        method({ type: "whatsapp", label: "WhatsApp", value: "+44 7700 900123" }),
      )?.href,
    ).toBe("https://wa.me/447700900123");
  });

  it("projects purpose-specific forms without exposing private account data", () => {
    const action = contactMethodToAction(
      method({ type: "quote", label: "Request a quote", value: "form" }),
    );
    expect(action).toMatchObject({ href: null, formKind: "quote" });
    expect(action).not.toHaveProperty("senderEmail");
  });

  it("drops disabled and invalid contact methods", () => {
    expect(contactMethodToAction(method({ enabled: false }))).toBeNull();
    expect(contactMethodToAction(method({ type: "email", value: "not-an-email" }))).toBeNull();
    expect(contactMethodToAction(method({ type: "booking", value: "javascript:alert(1)" }))).toBeNull();
  });
});
