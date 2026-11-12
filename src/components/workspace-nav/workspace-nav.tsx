import type { Route } from "next";
import Link from "next/link";
import { ActiveItemIntoView } from "./active-item-into-view";
import { WorkspaceIcon, type WorkspaceIconName } from "./workspace-icons";
import styles from "./workspace-nav.module.css";

export type WorkspaceNavItem = {
  key: string;
  href: string;
  label: string;
  icon: WorkspaceIconName;
  current: boolean;
  /** A count shown as a badge, with words for screen readers. */
  badge?: { count: number; label: string } | null;
};

export type WorkspaceNavGroup = {
  key: string;
  /** Visible group heading; `null` for an unheaded first group. */
  label: string | null;
  items: readonly WorkspaceNavItem[];
};

/**
 * The navigation for a signed-in workspace: a sticky glass sidebar beside the
 * page on wide screens and a sideways-scrolling strip on narrow ones. It must
 * be rendered as a direct child of the page's `<main>`, which `globals.css`
 * turns into the two-column layout. It only links: every page still runs its
 * own authorisation, so showing a link grants nothing.
 */
export function WorkspaceNav({
  ariaLabel,
  title,
  idPrefix,
  groups,
}: {
  ariaLabel: string;
  /** Shown above the groups in the sidebar; hidden from assistive tech. */
  title: string;
  /** Keeps the group heading ids unique to this navigation. */
  idPrefix: string;
  groups: readonly WorkspaceNavGroup[];
}) {
  const visible = groups.filter((group) => group.items.length > 0);
  return (
    <nav
      className={`${styles.tabs} dashboard-nav`}
      aria-label={ariaLabel}
      data-workspace-nav=""
      data-print="hide"
    >
      <p className={styles.navTitle} aria-hidden="true">
        {title}
      </p>
      <div className={styles.navGroups} data-workspace-nav-scroll="">
        {visible.map((group) => {
          const headingId = `${idPrefix}-${group.key}`;
          return (
            <div className={styles.navGroup} key={group.key}>
              {group.label ? (
                <p className={styles.navGroupLabel} id={headingId}>
                  {group.label}
                </p>
              ) : null}
              <ul
                className={styles.tabList}
                aria-labelledby={group.label ? headingId : undefined}
              >
                {group.items.map((item) => (
                  <li key={item.key}>
                    <Link
                      className={styles.tab}
                      href={item.href as Route}
                      aria-current={item.current ? "page" : undefined}
                    >
                      <WorkspaceIcon
                        name={item.icon}
                        className={styles.tabIcon}
                      />
                      <span className={styles.tabLabel}>{item.label}</span>
                      {item.badge && item.badge.count > 0 ? (
                        <>
                          <span className={styles.tabBadge} aria-hidden="true">
                            {item.badge.count > 99 ? "99+" : item.badge.count}
                          </span>
                          <span className="sr-only"> {item.badge.label}</span>
                        </>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <ActiveItemIntoView />
    </nav>
  );
}
