import {
  publicAdminDemoEmail,
  publicBusinessDemoEmail,
  publicViewerDemoEmail,
} from "@/lib/public-demo-policy";

export { isPublicDemoEmail } from "@/lib/public-demo-policy";

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
  email: publicViewerDemoEmail,
  password: "PUBLIC-DEMO-ONLY",
  returnTo: "/account",
} as const satisfies PublicDemoAccount;

export const publicBusinessDemoAccount = {
  key: "business",
  label: "Business owner",
  title: "Edit the fictional business as its owner",
  notice:
    "This intentionally public development account can view, edit and publish only the fictional Cwm & Coil Heating record. Account settings, member management and other business operations are disabled. It must be removed before public launch.",
  buttonLabel: "Fill business demo details",
  businessId: "00000000-0000-4000-8000-000000000401",
  name: "Demo Business Owner",
  email: publicBusinessDemoEmail,
  password: "PUBLIC-BUSINESS-DEMO",
  returnTo: "/dashboard/business/00000000-0000-4000-8000-000000000401",
} as const satisfies PublicDemoAccount;

export const publicAdminDemoAccount = {
  key: "admin",
  label: "Platform admin",
  title: "View the development admin dashboard",
  notice:
    "This intentionally public development account can inspect a sanitised administration overview while OurValleys is not live. Private records, administrative mutations and account settings are disabled. It must be removed before public launch.",
  buttonLabel: "Fill admin demo details",
  name: "Demo Platform Admin",
  email: publicAdminDemoEmail,
  password: "PUBLIC-ADMIN-DEMO",
  returnTo: "/admin",
} as const satisfies PublicDemoAccount;

export const publicDemoAccounts = [
  publicDemoAccount,
  publicBusinessDemoAccount,
  publicAdminDemoAccount,
] as const;

const publicDemoAccountByEmail: ReadonlyMap<string, PublicDemoAccount> =
  new Map(publicDemoAccounts.map((account) => [account.email, account]));

export function getPublicDemoAccountByEmail(
  email: string | null | undefined,
): PublicDemoAccount | null {
  if (!email) return null;
  return publicDemoAccountByEmail.get(email.trim().toLowerCase()) ?? null;
}

export const publicDemoNotice = publicDemoAccount.notice;
