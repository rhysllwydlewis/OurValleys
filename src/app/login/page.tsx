import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="page-shell compact">
      <section className="hero">
        <p className="eyebrow">Authentication route fallback</p>
        <h1>Account access is ready for the identity workstream.</h1>
        <p className="lead">
          Better Auth and database-backed sessions are wired into the scaffold.
          Public sign-in methods remain disabled until their complete verified
          journey is implemented.
        </p>
        <Link className="button primary" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
