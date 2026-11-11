import type { MessageKey } from "@/lib/i18n/translate";

/**
 * The business dashboard's sections and how the navigation groups them.
 * Pure data, so the grouping can be tested without a request.
 */
export type DashboardTab =
  | "overview"
  | "profile"
  | "website"
  | "photos"
  | "offers"
  | "events"
  | "updates"
  | "share"
  | "welsh"
  | "preview"
  | "inbox"
  | "corrections"
  | "insights"
  | "listing"
  | "operations";

export const tabs: readonly {
  key: DashboardTab;
  path: string;
  label: MessageKey;
  /** Which kind of access the tab needs; `null` is open to every member. */
  needs: "design" | "operate" | "content" | null;
}[] = [
  { key: "overview", path: "", label: "hub.tab.overview", needs: null },
  {
    key: "profile",
    path: "/profile",
    label: "hub.tab.profile",
    needs: null,
  },
  {
    key: "website",
    path: "/website",
    label: "hub.tab.website",
    needs: "design",
  },
  {
    key: "photos",
    path: "/photos",
    label: "hub.tab.photos",
    needs: "design",
  },
  {
    key: "offers",
    path: "/offers",
    label: "hub.tab.offers",
    needs: "content",
  },
  {
    key: "events",
    path: "/events",
    label: "hub.tab.events",
    needs: "content",
  },
  {
    key: "updates",
    path: "/updates",
    label: "hub.tab.updates",
    needs: "content",
  },
  {
    // Links and printable sheets for the public page; every member may open
    // it, and the page itself decides whether results are shown.
    key: "share",
    path: "/share",
    label: "hub.tab.share",
    needs: null,
  },
  {
    key: "welsh",
    path: "/welsh",
    label: "hub.tab.welsh",
    needs: "design",
  },
  {
    key: "preview",
    path: "/preview",
    label: "hub.tab.preview",
    needs: null,
  },
  {
    key: "inbox",
    path: "/inbox",
    label: "hub.tab.inbox",
    needs: "operate",
  },
  {
    // Visitor suggestions. The page itself needs the profile permission,
    // which every role with the content permission also has.
    key: "corrections",
    path: "/corrections",
    label: "hub.tab.corrections",
    needs: "content",
  },
  {
    // Every member may open it; the page itself decides whether their role
    // includes analytics and says so plainly if not.
    key: "insights",
    path: "/insights",
    label: "hub.tab.insights",
    needs: null,
  },
  {
    // Every member may open it to see the listing's state; the page shows
    // the actions only to roles that can use them.
    key: "listing",
    path: "/listing",
    label: "hub.tab.listing",
    needs: null,
  },
  {
    key: "operations",
    path: "/operations",
    label: "hub.tab.operations",
    needs: "operate",
  },
];

export type NavGroup = {
  key: "start" | "page" | "content" | "customers" | "business";
  /** Visible group heading; the first group (Overview) has none. */
  label: MessageKey | null;
  tabs: readonly DashboardTab[];
};

/**
 * How the tabs are grouped. Fifteen flat tabs overflowed every width, so the
 * same links are arranged into the jobs an owner comes here to do. Grouping
 * only changes presentation: every permitted link is still rendered, and
 * each page still runs its own authorisation.
 */
export const groups: readonly NavGroup[] = [
  { key: "start", label: null, tabs: ["overview"] },
  {
    key: "page",
    label: "hub.navGroup.page",
    tabs: ["profile", "website", "photos", "welsh", "preview"],
  },
  {
    key: "content",
    label: "hub.navGroup.content",
    tabs: ["offers", "events", "updates", "operations"],
  },
  {
    key: "customers",
    label: "hub.navGroup.customers",
    tabs: ["inbox", "corrections", "share"],
  },
  {
    key: "business",
    label: "hub.navGroup.business",
    tabs: ["insights", "listing"],
  },
];
