import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
