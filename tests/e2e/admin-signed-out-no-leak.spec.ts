import { expect, test } from "@playwright/test";
import postgres from "postgres";

const accountEmail = process.env.E2E_ACCOUNT_EMAIL;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const databaseUrl = process.env.DATABASE_URL;

test.skip(
  !accountEmail || !adminEmail || !databaseUrl,
  "provisioned E2E accounts or database are not configured",
);

/**
 * The admin layout redirects a signed-out visitor to /login, but the page under
 * it renders at the same time, and whatever it has rendered is still sent in the
 * body of the redirect. A browser follows the redirect and shows nothing, so
 * this has to be checked on the raw response. Every admin page must check for
 * the administrator before it reads data (`readAdminSession()`, enforced in
 * source by `src/app/admin/admin-guards.test.ts`; this checks the response).
 */
const adminPaths = [
  "/admin",
  "/admin/queue",
  "/admin/businesses",
  "/admin/users",
  "/admin/audit-log",
  "/admin/reports",
  "/admin/reviews",
  "/admin/suggestions",
  "/admin/categories",
  "/admin/demand",
  "/admin/feature-flags",
  "/admin/guides",
  "/admin/import",
  "/admin/insights",
  "/admin/place-suggestions",
  "/admin/places",
  "/admin/tickets",
  "/admin/stories",
];

test("a signed-out request to an admin page is redirected and carries none of the page's data", async ({
  request,
}) => {
  const sql = postgres(databaseUrl!, { max: 1 });
  let paths = adminPaths;
  // Data that the admin pages list, so a leak has something to show.
  const markers = [accountEmail!, adminEmail!];
  try {
    const [user] =
      await sql`select id from auth_user where email = ${accountEmail!}`;
    const [business] =
      await sql`select id, trading_name from business order by created_at limit 1`;
    expect(user, "the provisioned account exists").toBeTruthy();
    paths = [...paths, `/admin/users/${user!.id}`];
    if (business) {
      paths = [...paths, `/admin/businesses/${business.id}`];
      markers.push(String(business.trading_name));
    }
  } finally {
    await sql.end();
  }

  for (const path of paths) {
    const response = await request.get(path, { maxRedirects: 0 });

    expect([302, 303, 307, 308], `${path} is redirected`).toContain(
      response.status(),
    );
    expect(response.headers()["location"], `${path} goes to sign-in`).toContain(
      "/login",
    );

    const body = await response.text();
    for (const marker of markers) {
      expect(
        body,
        `${path} sent "${marker}" to a signed-out visitor`,
      ).not.toContain(marker);
    }
  }
});
