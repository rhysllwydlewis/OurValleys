import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <main className="page-shell compact">
      <section className="hero">
        <p className="eyebrow">Protected server route</p>
        <h1>Welcome, {session.user.name}.</h1>
        <p className="lead">
          This content is authorised on the server using a database-backed
          Better Auth session.
        </p>
      </section>
    </main>
  );
}
