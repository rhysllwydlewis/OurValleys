import type { Metadata } from "next";
import { listAllPlacesForAdmin } from "@/modules/reference-data/admin-places";
import styles from "../admin.module.css";
import { PlaceManager } from "./place-manager";
import { readAdminSession } from "@/modules/identity/admin-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Places",
};

export default async function AdminPlacesPage() {
  // The layout above is not a security boundary: the page itself must refuse
  // before it reads any data, or that data is still sent in the response.
  if (!(await readAdminSession())) return null;

  const result = await listAllPlacesForAdmin();

  return (
    <section>
      <h2>Places</h2>
      <p className={styles.hint}>
        Places power the location filter and each business&apos;s primary
        service area. Deactivate a place instead of deleting it if it&apos;s in
        use.
      </p>
      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Place data is temporarily unavailable. Please try again shortly.
        </div>
      ) : (
        <PlaceManager places={result.places} />
      )}
    </section>
  );
}
