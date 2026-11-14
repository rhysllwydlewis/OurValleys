"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DISPLAY_COOKIE,
  DISPLAY_COOKIE_MAX_AGE,
  isDefaultDisplay,
  normaliseDisplay,
  serialiseDisplay,
} from "./preferences";

/**
 * Saves (or, with the reset button, clears) the visitor's display choices.
 * Works as a plain form post. The cookie is not a secret and holds no
 * personal data, so it is readable by the browser and needs no account.
 */
export async function saveDisplayAction(formData: FormData): Promise<void> {
  const cookieStore = await cookies();
  const prefs =
    formData.get("intent") === "reset"
      ? null
      : normaliseDisplay((group) => formData.get(group));

  if (!prefs || isDefaultDisplay(prefs)) {
    cookieStore.delete(DISPLAY_COOKIE);
  } else {
    cookieStore.set(DISPLAY_COOKIE, serialiseDisplay(prefs), {
      path: "/",
      maxAge: DISPLAY_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  redirect(prefs ? "/display?saved=1" : "/display?reset=1");
}
