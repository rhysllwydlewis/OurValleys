"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./config";
import { returnPathFromReferer } from "./return-path";

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
  }
  const headerStore = await headers();
  redirect(
    returnPathFromReferer(
      headerStore.get("referer"),
      headerStore.get("host"),
    ) as Route,
  );
}
