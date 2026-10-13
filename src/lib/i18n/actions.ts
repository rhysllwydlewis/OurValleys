"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  isLocale,
  type Locale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_UI_COOKIE,
} from "./config";
import { returnPathFromForm } from "./return-path";
import { getAuth } from "@/lib/auth";
import { saveLocale } from "@/modules/residents/locale-preference";

export async function setLocaleAction(formData: FormData): Promise<void> {
  const requested = formData.get("locale");
  if (isLocale(requested)) {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, requested, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    // Not a secret: only lets the global error page speak the right language.
    cookieStore.set(LOCALE_UI_COOKIE, requested, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await rememberForSignedInResident(requested);
  }
  const headerStore = await headers();
  const returnTo = formData.get("returnTo");
  redirect(
    returnPathFromForm(
      typeof returnTo === "string" ? returnTo : null,
      headerStore.get("referer"),
      headerStore.get("host"),
    ) as Route,
  );
}

/**
 * Signed-in residents keep their language across devices. The cookie already
 * works, so a failure here (no session, database hiccup) must never block it.
 */
async function rememberForSignedInResident(locale: Locale): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (session?.user.id) await saveLocale(session.user.id, locale);
  } catch {
    // Cookie-only fallback.
  }
}
