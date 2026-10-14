import type { ReactNode } from "react";
import styles from "./browse.module.css";

/** The compact page header shared by the browse pages: title and lead on the left, shortcuts on the right. */
export function BrowseHeader({
  lang,
  eyebrow,
  title,
  lead,
  children,
}: {
  lang: string;
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header} lang={lang}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className={`lead ${styles.lead}`}>{lead}</p>
      </div>
      {children ? <div className="actions">{children}</div> : null}
    </header>
  );
}
