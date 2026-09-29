"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  inferAdditionalFields,
  twoFactorClient,
} from "better-auth/client/plugins";
import type { Auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [adminClient(), twoFactorClient(), inferAdditionalFields<Auth>()],
});
