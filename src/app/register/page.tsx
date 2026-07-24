import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuth } from "@/lib/auth";
import { isRegistrationOpen } from "@/lib/email";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Register for a free OurValleys account to build your business website and local listing across Rhondda Cynon Taf.",
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function RegisterPage() {
  const session = await readSession();
  if (session) redirect("/account");

  const registrationOpen = isRegistrationOpen();

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="register-title">
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Free business website and listing</p>
        <h1 id="register-title">Create your free account.</h1>
        {registrationOpen ? (
          <>
            <p className={styles.lead}>
              Register with your email address, verify it, and you can start
              building your free business website and local listing.
            </p>
            <RegisterForm idPrefix="register-page" />
            <p className={styles.notice} role="note">
              We will send a verification link to your email address. You need
              to verify before you can sign in and use account tools.
            </p>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              New account registration is not open just yet because verification
              emails cannot be delivered from this environment. Please check
              back soon.
            </p>
            <p className={styles.notice} role="note">
              Public discovery does not require an account.
            </p>
          </>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/login">
            Sign in instead
          </Link>
          <Link className={styles.secondary} href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
