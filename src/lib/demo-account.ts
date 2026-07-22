export type PublicDemoAccount = {
  key: "viewer" | "business" | "admin";
  label: string;
  title: string;
  notice: string;
  buttonLabel: string;
  name: string;
  email: string;
  password: string;
  returnTo: string;
  userId?: string;
  membershipId?: string;
  businessId?: string;
};

export const publicDemoAccount = {
  key: "viewer",
  label: "Viewer",
  title: "View the fictional business dashboard",
  notice:
    "This is intentionally public demonstration access to one fictional business. It is view-only and must never be reused as a private password.",
  buttonLabel: "Fill demo details",
  userId: "00000000-0000-4000-8000-000000000102",
  membershipId: "00000000-0000-4000-8000-000000000502",
  businessId: "00000000-0000-4000-8000-000000000401",
  name: "Demo Viewer",
  email: "demo.viewer@ourvalleys.example",
  password: "PUBLIC-DEMO-ONLY",
  returnTo: "/account",
} as const satisfies PublicDemoAccount;

export const publicBusinessDemoAccount = {
  key: "business",
  label: "Business owner",
  title: "Edit the fictional business as its owner",
  notice:
    "This intentionally public development account can edit and publish only the fictional Cwm & Coil Heating record. It must be removed before public launch.",
  buttonLabel: "Fill business demo details",
  userId: "00000000-0000-4000-8000-000000000101",
  membershipId: "00000000-0000-4000-8000-000000000501",
  businessId: "00000000-0000-4000-8000-000000000401",
  name: "Demo Business Owner",
  email: "owner@cwm-coil.example",
  password: "PUBLIC-BUSINESS-DEMO",
  returnTo: "/dashboard/business/00000000-0000-4000-8000-000000000401",
} as const satisfies PublicDemoAccount;

export const publicAdminDemoAccount = {
  key: "admin",
  label: "Platform admin",
  title: "Open the development admin dashboard",
  notice:
    "This intentionally public development account can use the platform administration tools while OurValleys is not live. It must be removed before public launch.",
  buttonLabel: "Fill admin demo details",
  name: "Demo Platform Admin",
  email: "demo.admin@ourvalleys.example",
  password: "PUBLIC-ADMIN-DEMO",
  returnTo: "/admin",
} as const satisfies PublicDemoAccount;

export const publicDemoAccounts = [
  publicDemoAccount,
  publicBusinessDemoAccount,
  publicAdminDemoAccount,
] as const;

const publicDemoEmailSet: ReadonlySet<string> = new Set(
  publicDemoAccounts.map(({ email }) => email),
);

export function isPublicDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return publicDemoEmailSet.has(email.trim().toLowerCase());
}

export const publicDemoNotice = publicDemoAccount.notice;
