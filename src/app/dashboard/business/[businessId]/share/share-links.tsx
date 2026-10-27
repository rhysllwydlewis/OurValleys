"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import styles from "./share.module.css";

export type ShareLinkItem = {
  channel: string;
  name: string;
  hint: string;
  url: string;
  /** The message in each language, ready to copy. */
  message: { en: string; cy: string };
  /** Where "open the app" leads for each language, or null (copy only). */
  handOff: { en: string | null; cy: string | null };
  handOffLabel: string | null;
};

type Copied = { id: string; ok: boolean } | null;

export function ShareLinks({ items }: { items: ShareLinkItem[] }) {
  const t = useT();
  const [language, setLanguage] = useState<"en" | "cy">("en");
  const [copied, setCopied] = useState<Copied>(null);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ id, ok: true });
    } catch {
      setCopied({ id, ok: false });
    }
  }

  return (
    <div>
      <fieldset className={styles.languageChoice}>
        <legend>{t("share.message.language")}</legend>
        {(["en", "cy"] as const).map((code) => (
          <label key={code}>
            <input
              type="radio"
              name="message-language"
              value={code}
              checked={language === code}
              onChange={() => setLanguage(code)}
            />{" "}
            {t(code === "en" ? "share.lang.en" : "share.lang.cy")}
          </label>
        ))}
      </fieldset>
      <ul className={styles.linkList}>
        {items.map((item) => {
          const linkId = `share-link-${item.channel}`;
          const messageId = `share-message-${item.channel}`;
          const handOff = item.handOff[language];
          return (
            <li key={item.channel} className={styles.linkCard}>
              <h3>{item.name}</h3>
              <p className={styles.hint}>{item.hint}</p>
              <label className={styles.fieldLabel} htmlFor={linkId}>
                {t("share.link.label", { channel: item.name })}
              </label>
              <div className={styles.copyRow}>
                <input
                  id={linkId}
                  className={styles.linkInput}
                  readOnly
                  value={item.url}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  type="button"
                  className="button primary"
                  onClick={() => void copy(linkId, item.url)}
                  aria-label={t("share.copyNamed", { channel: item.name })}
                >
                  {t("share.copy")}
                </button>
              </div>
              <p
                className={styles.copyStatus}
                role="status"
                data-ok={copied?.id === linkId ? String(copied.ok) : undefined}
              >
                {copied?.id === linkId
                  ? t(copied.ok ? "share.link.copied" : "share.copyFailed")
                  : ""}
              </p>
              {item.channel !== "print" ? (
                <>
                  <label className={styles.fieldLabel} htmlFor={messageId}>
                    {t("share.message.label")}
                  </label>
                  <textarea
                    id={messageId}
                    className={styles.messageInput}
                    readOnly
                    rows={3}
                    lang={language === "cy" ? "cy" : "en-GB"}
                    value={item.message[language]}
                  />
                  <div className={styles.copyRow}>
                    <button
                      type="button"
                      className="button"
                      onClick={() =>
                        void copy(messageId, item.message[language])
                      }
                    >
                      {t("share.message.copy")}
                    </button>
                    {handOff && item.handOffLabel ? (
                      <a
                        className="button"
                        href={handOff}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.handOffLabel}
                      </a>
                    ) : null}
                  </div>
                  <p
                    className={styles.copyStatus}
                    role="status"
                    data-ok={
                      copied?.id === messageId ? String(copied.ok) : undefined
                    }
                  >
                    {copied?.id === messageId
                      ? t(
                          copied.ok
                            ? "share.message.copied"
                            : "share.copyFailed",
                        )
                      : ""}
                  </p>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={styles.hint}>{t("share.open.hint")}</p>
    </div>
  );
}
