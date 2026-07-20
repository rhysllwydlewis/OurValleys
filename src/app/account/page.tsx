import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function AccountPage() {
  const session = await readSession();

  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <main className="page-shell compact">
      <section className="hero">
        <p className="eyebrow">Your account</p>
        <h1>Welcome, {session.user.name}.</h1>
        <p className="lead">
          This content is authorised on the server using a database-backed
          Better Auth session.
        </p>
        <div className="actions">
          <Link className="button primary" href="/businesses">
            Browse local businesses
          </Link>
          <Link className="button" href="/">
            Return home
          </Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
