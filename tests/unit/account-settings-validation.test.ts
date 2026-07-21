import { describe, expect, it } from "vitest";
import { isValidProfileImageUrl } from "@/lib/account-settings-validation";

describe("isValidProfileImageUrl", () => {
  it("accepts a blank value, which clears the profile photo", () => {
    expect(isValidProfileImageUrl("")).toBe(true);
    expect(isValidProfileImageUrl("   ")).toBe(true);
  });

  it("accepts a full https link", () => {
    expect(isValidProfileImageUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("rejects a non-https link", () => {
    expect(isValidProfileImageUrl("http://example.com/photo.jpg")).toBe(false);
  });

  it("rejects a value that is not a URL at all", () => {
    expect(isValidProfileImageUrl("not a url")).toBe(false);
  });
});
