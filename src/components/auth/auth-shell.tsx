import Link from "next/link";
import type { ReactNode } from "react";
import { ValleyMark } from "@/components/site-header";
import styles from "./auth-shell.module.css";

type AuthShellProps = {
  /** Used to build the heading id the section is labelled by. */
  idPrefix: string;
  htmlLang: string;
  brandLabel: string;
  eyebrow: string;
  title: string;
  /** Shown over the photograph, under the heading. */
  lead?: ReactNode;
  /** The form and any notes; omitted while loading shows a skeleton. */
  children?: ReactNode;
  /** The links to carry on elsewhere (primary and secondary buttons). */
  actions?: ReactNode;
  busy?: boolean;
};

/**
 * The two-panel frame shared by the sign-in, registration and password
 * recovery pages: a welcome over the valley photograph beside the form.
 * Presentation only; each page keeps its own session check and forms.
 */
export function AuthShell({
  idPrefix,
  htmlLang,
  brandLabel,
  eyebrow,
  title,
  lead,
  children,
  actions,
  busy = false,
}: AuthShellProps) {
  const titleId = `${idPrefix}-title`;
  return (
    <main className={styles.shell} lang={htmlLang}>
      <section
        className={styles.layout}
        aria-labelledby={titleId}
        {...(busy ? { "aria-busy": true, "aria-live": "polite" as const } : {})}
      >
        <div className={styles.photo} aria-hidden="true" />
        <div className={styles.intro}>
          <Link className={styles.brand} href="/" aria-label={brandLabel}>
            <ValleyMark />
            <span>OurValleys</span>
          </Link>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id={titleId}>{title}</h1>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
        </div>
        <div className={styles.panel}>{children}</div>
        {actions ? (
          <div className={styles.extras}>
            <div className={styles.actions}>{actions}</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export { styles as authShellStyles };
