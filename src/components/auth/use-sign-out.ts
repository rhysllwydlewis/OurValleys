"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signOut() {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setErrorMessage("We could not sign you out. Please try again.");
        return;
      }

      window.location.assign("/");
    } catch {
      setErrorMessage("Sign-out could not be reached. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return { signOut, isSigningOut, errorMessage };
}
