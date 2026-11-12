import { describe, expect, it } from "vitest";
import { adminNavGroups, isAdminLinkActive } from "./admin-nav-model";

const links = adminNavGroups.flatMap((group) => group.links);
const find = (href: string) => links.find((link) => link.href === href)!;
const activeFor = (pathname: string) =>
  links.filter((link) => isAdminLinkActive(link, pathname)).map((l) => l.href);

describe("admin navigation", () => {
  it("lists every admin section once, all under /admin", () => {
    const hrefs = links.map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toHaveLength(17);
    for (const href of hrefs) expect(href.startsWith("/admin")).toBe(true);
  });

  it("marks exactly one section current, including nested pages", () => {
    expect(activeFor("/admin")).toEqual(["/admin"]);
    expect(activeFor("/admin/places")).toEqual(["/admin/places"]);
    expect(activeFor("/admin/places/123")).toEqual(["/admin/places"]);
    // A sibling path that merely starts with the same letters is not nested.
    expect(activeFor("/admin/place-suggestions")).toEqual([
      "/admin/place-suggestions",
    ]);
    expect(activeFor("/admin/guides/new")).toEqual(["/admin/guides"]);
  });

  it("keeps the overview exact so it is not current on every admin page", () => {
    expect(isAdminLinkActive(find("/admin"), "/admin/users")).toBe(false);
  });

  it("gives every group after the first a heading", () => {
    expect(adminNavGroups[0]!.label).toBeNull();
    for (const group of adminNavGroups.slice(1)) {
      expect(group.label).toBeTruthy();
    }
  });
});
