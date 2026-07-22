import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";
import styles from "../account.module.css";
import { NewBusinessForm } from "./new-business-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your business",
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function NewBusinessPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account/new-business");

  const isDemoAccount = isPublicDemoEmail(session.user.email);
  const [categories, places] = await Promise.all([
    listActiveCategories(),
    listActivePlaces(),
  ]);
  const referenceDataReady = categories.length > 0 && places.length > 0;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <div>
          <p className={styles.eyebrow}>Free business website</p>
          <h1>Create your free business website.</h1>
          <p className={styles.lead}>
            Tell us the essentials — the business name, what it does and where
            it is — and we will generate a starter website you can preview
            straight away, then complete and publish in your own time.
          </p>
        </div>

        {isDemoAccount ? (
          <section className={styles.stateCard} role="note">
            <p className={styles.eyebrow}>Demonstration account</p>
            <h2>Public demo accounts cannot create businesses.</h2>
            <p>
              Register your own free account to create a real business website.
            </p>
            <p>
              <Link href="/register">Create your free account</Link>
            </p>
          </section>
        ) : referenceDataReady ? (
          <NewBusinessForm categories={categories} places={places} />
        ) : (
          <section className={styles.stateCard} role="note">
            <p className={styles.eyebrow}>Temporarily unavailable</p>
            <h2>Business creation is temporarily unavailable.</h2>
            <p>
              The category and location lists could not be loaded. Please try
              again shortly.
            </p>
            <p>
              <Link href="/account">Return to your account</Link>
            </p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
