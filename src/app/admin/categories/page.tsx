import type { Metadata } from "next";
import { listAllCategoriesForAdmin } from "@/modules/reference-data/admin-categories";
import styles from "../admin.module.css";
import { CategoryManager } from "./category-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
};

export default async function AdminCategoriesPage() {
  const result = await listAllCategoriesForAdmin();

  return (
    <section>
      <h2>Categories</h2>
      <p className={styles.hint}>
        Categories power search and directory filters across the site.
        Deactivate a category instead of deleting it if it&apos;s in use.
      </p>
      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Category data is temporarily unavailable. Please try again shortly.
        </div>
      ) : (
        <CategoryManager categories={result.categories} />
      )}
    </section>
  );
}
