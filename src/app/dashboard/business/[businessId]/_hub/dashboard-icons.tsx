import type { ReactNode } from "react";

/**
 * A small, dependency-free line-icon set for the business dashboard. Every
 * icon is decorative (`aria-hidden`): the visible label next to it always
 * carries the meaning, so nothing here needs translating.
 */
export type DashboardIconName =
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
  | "public";

const paths: Record<DashboardIconName, ReactNode> = {
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
};

export function DashboardIcon({
  name,
  className,
}: {
  name: DashboardIconName;
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
