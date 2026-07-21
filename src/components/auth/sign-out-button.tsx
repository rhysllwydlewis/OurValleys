"use client";

import { useSignOut } from "./use-sign-out";

export function SignOutButton() {
  const { signOut, isSigningOut, errorMessage } = useSignOut();

  return (
    <>
      <button
        className="button"
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
      {errorMessage ? (
        <p role="alert" className="body-copy">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
