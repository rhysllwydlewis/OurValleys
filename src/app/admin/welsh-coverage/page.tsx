import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readAdminSession } from "@/modules/identity/admin-access";
import { getWelshCoverage } from "@/modules/platform/welsh-coverage";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welsh coverage",
};

const ROW_LIMIT = 100;

export default async function AdminWelshCoveragePage() {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const coverage = await getWelshCoverage();
  const shown = coverage.rows.slice(0, ROW_LIMIT);

  return (
    <section>
      <h2>Welsh coverage</h2>
      <p>
        How much of the live directory has Welsh text. Businesses with the most
        gaps come first. Where Welsh is missing, visitors see the English text.
      </p>
      <div className={styles.statRow}>
        {coverage.figures.map((figure) => (
          <div key={figure.label} className={styles.statTile}>
            <strong>{figure.percent}%</strong>
            <span>
              {figure.label} ({figure.covered} of {figure.total})
            </span>
          </div>
        ))}
      </div>
      {coverage.rows.length === 0 ? (
        <p>
          {coverage.businessesTotal === 0
            ? "No published businesses yet."
            : "Every published business has Welsh text."}
        </p>
      ) : (
        <>
          <p>
            {coverage.businessesWithGaps} of {coverage.businessesTotal}{" "}
            published businesses have at least one gap
            {coverage.rows.length > shown.length
              ? ` (showing the first ${shown.length})`
              : ""}
            .
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="sr-only">
                Businesses missing Welsh text
              </caption>
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Name</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Description</th>
                  <th scope="col">Services missing</th>
                  <th scope="col">Photos missing</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      <Link href={`/admin/businesses/${row.id}` as Route}>
                        {row.tradingName}
                      </Link>
                    </th>
                    <td>{row.gaps.name ? "Missing" : "Done"}</td>
                    <td>{row.gaps.summary ? "Missing" : "Done"}</td>
                    <td>{row.gaps.description ? "Missing" : "Done"}</td>
                    <td>{row.gaps.services}</td>
                    <td>{row.gaps.photos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
