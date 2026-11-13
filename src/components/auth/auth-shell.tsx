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
  /** Short reasons to have an account, shown over the photograph on wide screens. */
  highlights?: { label: string; items: readonly AuthHighlight[] };
  /** A heading above the form, inside the form panel. */
  panelTitle?: string;
  panelLead?: string;
  busy?: boolean;
};

export type AuthHighlight = {
  icon: "save" | "follow" | "business";
  title: string;
  text: string;
};

function HighlightIcon({ name }: { name: AuthHighlight["icon"] }) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {name === "save" ? (
        <path
          d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1Z"
          {...common}
        />
      ) : null}
      {name === "follow" ? (
        <>
          <path
            d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"
            {...common}
          />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" {...common} />
        </>
      ) : null}
      {name === "business" ? (
        <>
          <path d="M4 10.5 5.5 5h13L20 10.5" {...common} />
          <path
            d="M5.5 10.5V19.5h13V10.5M4 10.5h16M10 19.5v-5h4v5"
            {...common}
          />
        </>
      ) : null}
    </svg>
  );
}

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
  highlights,
  panelTitle,
  panelLead,
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
          {highlights ? (
            <ul className={styles.highlights} aria-label={highlights.label}>
              {highlights.items.map((item) => (
                <li key={item.title}>
                  <span className={styles.highlightIcon} aria-hidden="true">
                    <HighlightIcon name={item.icon} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={styles.panel}>
          {panelTitle ? (
            <div className={styles.panelHead}>
              <h2>{panelTitle}</h2>
              {panelLead ? <p>{panelLead}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
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
