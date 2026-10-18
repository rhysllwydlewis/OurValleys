import type { Metadata } from "next";
import { maxImportRows } from "@/modules/businesses/csv-import";
import styles from "../admin.module.css";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import businesses",
};

export default function AdminImportPage() {
  return (
    <section>
      <h2>Import businesses</h2>
      <p className={styles.hint}>
        Seed founding businesses from a CSV file. Each row becomes an unclaimed{" "}
        <strong>draft</strong> for review; nothing is published. Columns:{" "}
        <code>trading_name</code>, <code>category</code> (category slug),{" "}
        <code>place</code> (place slug), optional <code>welsh_name</code> and{" "}
        <code>business_type</code> (<code>premises</code>,{" "}
        <code>service_area</code> or <code>online</code>). Up to {maxImportRows}{" "}
        rows. Businesses already listed with the same name in the same place are
        skipped. Use fictional data unless the business has agreed to be listed.
      </p>
      <ImportForm />
    </section>
  );
}
