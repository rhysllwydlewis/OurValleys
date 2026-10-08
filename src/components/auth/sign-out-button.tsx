"use client";

import { useT } from "@/lib/i18n/client";
import { useSignOut } from "./use-sign-out";

export function SignOutButton() {
  const t = useT();
  const { signOut, isSigningOut, errorMessage } = useSignOut();

  return (
    <>
      <button
        className="button"
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? t("accountMenu.signingOut") : t("accountMenu.signOut")}
      </button>
      {errorMessage ? (
        <p role="alert" className="body-copy">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
