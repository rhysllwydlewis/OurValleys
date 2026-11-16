import type { Route } from "next";
import Link from "next/link";
import styles from "./hub.module.css";

/**
 * A small, live view of the business's own page in the dashboard hero, so the
 * owner sees what visitors see before reading anything. It shows the private
 * preview (which may be framed by this site only, see security-headers.ts),
 * drawn at desktop width and scaled down. The frame is decoration: it is out
 * of the tab order and hidden from assistive technology, and the link beside
 * it is the way in.
 */
export function SitePeek({
  frameSrc,
  href,
  address,
  frameTitle,
  action,
}: {
  frameSrc: string;
  href: Route;
  /**
   * The label in the frame's address bar. It says "private preview" rather
   * than the public address, because what is shown is the latest saved
   * draft, which can be ahead of the page visitors see.
   */
  address: string;
  frameTitle: string;
  action: string;
}) {
  return (
    <div className={styles.peek}>
      <div className={styles.peekChrome} aria-hidden="true">
        <span className={styles.peekDots}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.peekAddress}>{address}</span>
      </div>
      <div className={styles.peekScreen}>
        <iframe
          src={frameSrc}
          title={frameTitle}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          inert
        />
      </div>
      <Link className={styles.peekLink} href={href}>
        {action}
        <span aria-hidden="true"> →</span>
      </Link>
    </div>
  );
}
