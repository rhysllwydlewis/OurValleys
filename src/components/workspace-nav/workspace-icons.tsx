import type { ReactNode } from "react";

/**
 * A small, dependency-free line-icon set for the signed-in workspaces (the
 * business dashboard, the resident account and the admin area). Every
 * icon is decorative (`aria-hidden`): the visible label next to it always
 * carries the meaning, so nothing here needs translating.
 */
export type WorkspaceIconName =
  | "overview"
  | "profile"
  | "website"
  | "photos"
  | "welsh"
  | "preview"
  | "offers"
  | "events"
  | "updates"
  | "inbox"
  | "corrections"
  | "share"
  | "insights"
  | "listing"
  | "operations"
  | "menu"
  | "team"
  | "public"
  | "home"
  | "saved"
  | "following"
  | "notifications"
  | "privacy"
  | "settings"
  | "business"
  | "queue"
  | "tickets"
  | "reports"
  | "users"
  | "places"
  | "categories"
  | "stories"
  | "guides"
  | "flags"
  | "audit"
  | "import"
  | "demand"
  | "reviews";

const paths: Record<WorkspaceIconName, ReactNode> = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.8" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.8" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="1.8" />
    </>
  ),
  profile: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10.5" r="2.25" />
      <path d="M5.75 16.5c.7-1.7 1.9-2.6 3.25-2.6s2.55.9 3.25 2.6" />
      <path d="M14.5 9.5h3.5M14.5 13h3.5" />
    </>
  ),
  website: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 9h18" />
      <path d="M6 6.75h.01M8.5 6.75h.01" />
      <path d="M7 12.5h6M7 15.5h10" />
    </>
  ),
  photos: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="9.75" r="1.75" />
      <path d="m4 17.5 4.75-4.5 3.5 3 3-2.5 4.75 4" />
    </>
  ),
  welsh: (
    <>
      <path d="M4 6.5h8M8 4.5v2M10.5 6.5c-.6 3.4-2.9 6.2-6 7.6" />
      <path d="M6.5 9.75c1.1 1.6 2.6 2.9 4.5 3.8" />
      <path d="m12.5 19.5 3.75-9 3.75 9M14 16.5h4.5" />
    </>
  ),
  preview: (
    <>
      <path d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  offers: (
    <>
      <path d="M3.75 12.6V5.25c0-.83.67-1.5 1.5-1.5h7.35c.4 0 .78.16 1.06.44l6.6 6.6c.59.59.59 1.54 0 2.12l-7.35 7.35c-.58.59-1.53.59-2.12 0l-6.6-6.6a1.5 1.5 0 0 1-.44-1.06Z" />
      <circle cx="8.25" cy="8.25" r="1.5" />
    </>
  ),
  events: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  updates: (
    <>
      <path d="M4 10.5v3c0 .55.45 1 1 1h2l6.5 4V5.5L7 9.5H5c-.55 0-1 .45-1 1Z" />
      <path d="M17 8.75a4.5 4.5 0 0 1 0 6.5M19.5 6.25a8 8 0 0 1 0 11.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5.75c.2-.6.75-1 1.4-1h9.2c.65 0 1.2.4 1.4 1l2.5 7.75" />
      <path d="M3.5 13.5V18c0 .83.67 1.5 1.5 1.5h14c.83 0 1.5-.67 1.5-1.5v-4.5h-5l-1.25 2.25h-4.5L8.5 13.5h-5Z" />
    </>
  ),
  corrections: (
    <>
      <path d="M4.5 19.5h4l10-10a2.83 2.83 0 0 0-4-4l-10 10v4Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  share: (
    <>
      <circle cx="17.5" cy="5.75" r="2.25" />
      <circle cx="6.5" cy="12" r="2.25" />
      <circle cx="17.5" cy="18.25" r="2.25" />
      <path d="m8.5 10.9 7-4M8.5 13.1l7 4" />
    </>
  ),
  insights: (
    <>
      <path d="M4 19.5h16" />
      <rect x="5.5" y="12" width="3" height="5.5" rx="1" />
      <rect x="10.5" y="8" width="3" height="9.5" rx="1" />
      <rect x="15.5" y="4.5" width="3" height="13" rx="1" />
    </>
  ),
  listing: (
    <>
      <path d="M12 21s-6.75-5.6-6.75-11.25a6.75 6.75 0 0 1 13.5 0C18.75 15.4 12 21 12 21Z" />
      <circle cx="12" cy="9.75" r="2.5" />
    </>
  ),
  operations: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
      <path d="M4 12h4M12 12h8" />
      <circle cx="10" cy="12" r="2" />
    </>
  ),
  menu: (
    <>
      <path d="M7 3.5v6.5M5 3.5v4a2 2 0 0 0 4 0v-4M7 10v10.5" />
      <path d="M17 20.5V3.5c-2 .9-3 3-3 6v4h3" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.8-3 2.9-4.75 5.5-4.75S13.7 16 14.5 19" />
      <path d="M15.5 5.75a3 3 0 0 1 0 5.5M17.5 14.5c1.4.7 2.4 2.2 3 4.5" />
    </>
  ),
  public: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5Z" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M5.5 9.5V19c0 .55.45 1 1 1h3.5v-5h4v5h3.5c.55 0 1-.45 1-1V9.5" />
    </>
  ),
  saved: (
    <path d="M12 20s-7.5-4.6-7.5-10.1A4.15 4.15 0 0 1 12 7.4a4.15 4.15 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
  ),
  following: (
    <>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
      <path d="M10 20.5a2.1 2.1 0 0 0 4 0" />
    </>
  ),
  privacy: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.8 7 9 4.1-1.2 7-4.7 7-9V6l-7-2.5Z" />
      <path d="m9.25 12 2 2 3.5-3.75" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
    </>
  ),
  business: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" />
    </>
  ),
  queue: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
      <circle cx="18.5" cy="17.5" r="1.5" />
    </>
  ),
  tickets: (
    <>
      <path d="M4 7.5c0-.83.67-1.5 1.5-1.5h13c.83 0 1.5.67 1.5 1.5V10a2 2 0 0 0 0 4v2.5c0 .83-.67 1.5-1.5 1.5h-13c-.83 0-1.5-.67-1.5-1.5V14a2 2 0 0 0 0-4V7.5Z" />
      <path d="M14.5 6v12" strokeDasharray="1.5 2" />
    </>
  ),
  reports: (
    <>
      <path d="M5.5 20.5v-16" />
      <path d="M5.5 5h11l-2 3.5 2 3.5h-11" />
    </>
  ),
  users: (
    <>
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M5.5 19.5c.9-3.3 3.4-5.25 6.5-5.25s5.6 1.95 6.5 5.25" />
    </>
  ),
  places: (
    <>
      <path d="m3 18 5.5-9.5 3.5 6 2.5-3.5L21 18H3Z" />
      <circle cx="16.5" cy="6.5" r="1.5" />
    </>
  ),
  categories: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <circle cx="16.75" cy="16.75" r="3.25" />
    </>
  ),
  stories: (
    <>
      <path d="M5 4.5h10.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2V4.5Z" />
      <path d="M17.5 9h1.5v8.5a2 2 0 0 1-2 2M8.5 8.5h5.5M8.5 12h5.5M8.5 15.5h3" />
    </>
  ),
  guides: (
    <>
      <path d="M12 6.5c-1.8-1.3-4.3-2-7.5-2v13c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-13c-3.2 0-5.7.7-7.5 2Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  flags: (
    <>
      <rect x="3.5" y="8" width="17" height="8" rx="4" />
      <circle cx="16.5" cy="12" r="2.25" />
    </>
  ),
  audit: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  import: (
    <>
      <path d="M12 4v10.5M7.75 10.25 12 14.5l4.25-4.25" />
      <path d="M4.5 15.5v2.5c0 .83.67 1.5 1.5 1.5h12c.83 0 1.5-.67 1.5-1.5v-2.5" />
    </>
  ),
  demand: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  reviews: (
    <>
      <path d="M4.5 18.5V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H8.5l-4 2Z" />
      <path d="M8.5 9.5h7M8.5 12.5h4.5" />
    </>
  ),
};

export function WorkspaceIcon({
  name,
  className,
}: {
  name: WorkspaceIconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
