import type { MessageKey, Translator } from "@/lib/i18n/translate";
import styles from "./hub.module.css";

const sections = [
  { id: "inbox", label: "hub.jump.inbox" },
  { id: "analytics", label: "hub.jump.analytics" },
  { id: "contacts", label: "hub.jump.contacts" },
  { id: "offers", label: "hub.jump.offers" },
  { id: "events", label: "hub.jump.events" },
  { id: "menu", label: "hub.jump.menu" },
  { id: "hours", label: "hub.jump.hours" },
  { id: "address", label: "hub.jump.address" },
  { id: "team", label: "hub.jump.team" },
  { id: "lifecycle", label: "hub.jump.lifecycle" },
] as const satisfies readonly { id: string; label: MessageKey }[];

/**
 * In-page links to the sections of the long content and insights page. Plain
 * anchors, so it works without scripts.
 */
export function SectionJump({ t }: { t: Translator }) {
  return (
    <nav className={styles.jump} aria-label={t("hub.sections.jumpAria")}>
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>{t(section.label)}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
