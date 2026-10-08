"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";

export function useSignOut() {
  const t = useT();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signOut() {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setErrorMessage(t("accountMenu.signOutFailed"));
        return;
      }

      window.location.assign("/");
    } catch {
      setErrorMessage(t("accountMenu.signOutUnreachable"));
    } finally {
      setIsSigningOut(false);
    }
  }

  return { signOut, isSigningOut, errorMessage };
}
