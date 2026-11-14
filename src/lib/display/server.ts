import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  DISPLAY_COOKIE,
  parseDisplayCookie,
  type DisplayPreferences,
} from "./preferences";

export const getDisplayPreferences = cache(
  async (): Promise<DisplayPreferences> =>
    parseDisplayCookie((await cookies()).get(DISPLAY_COOKIE)?.value),
);
