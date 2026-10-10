"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./designer.module.css";

type Width = "desktop" | "mobile";

/**
 * Shows the real private preview with the choices currently set in the
 * appearance form, before anything is saved. The form is read through its id,
 * and the frame's address carries the choices, which the preview checks
 * against the approved lists. Nothing here saves or publishes anything.
 */
export function LivePreview({
  formId,
  previewPath,
  sectionIds,
  locale,
  text,
}: {
  formId: string;
  previewPath: string;
  sectionIds: string[];
  /** The reader's language: the preview only needs the text it will show. */
  locale: "en" | "cy";
  text: {
    title: string;
    note: string;
    frame: string;
    width: string;
    desktop: string;
    mobile: string;
    updating: string;
  };
}) {
  const [src, setSrc] = useState(`${previewPath}?frame=1`);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState<Width>("desktop");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    function read() {
      const data = new FormData(form as HTMLFormElement);
      const hidden = sectionIds.filter(
        (id) => data.get(`visible-${id}`) !== "on",
      );
      const order = [...sectionIds].sort(
        (a, b) =>
          Number(data.get(`position-${a}`) ?? 0) -
          Number(data.get(`position-${b}`) ?? 0),
      );
      const layouts = sectionIds
        .map((id) => `${id}:${String(data.get(`layout-${id}`) ?? "")}`)
        .join(",");
      // Only the text the frame will show travels in the address: the
      // reader's language, or the other language where that is all there is.
      const other = locale === "cy" ? "en" : "cy";
      const copy: Record<string, Record<string, Record<string, string>>> = {};
      for (const id of sectionIds) {
        for (const field of ["heading", "intro"] as const) {
          const own = String(data.get(`${field}-${id}-${locale}`) ?? "");
          const fallback = String(data.get(`${field}-${id}-${other}`) ?? "");
          const language = own ? locale : fallback ? other : null;
          if (!language) continue;
          const entry = (copy[id] ??= {});
          entry[field] = { [language]: own || fallback };
        }
      }
      const params = new URLSearchParams({
        frame: "1",
        template: String(data.get("templateKey") ?? ""),
        accent: String(data.get("accentKey") ?? ""),
        hide: hidden.join(","),
        order: order.join(","),
        layouts,
        copy: JSON.stringify(copy),
      });
      return `${previewPath}?${params.toString()}`;
    }

    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const next = read();
        setSrc((current) => {
          if (current === next) return current;
          setLoading(true);
          return next;
        });
      }, 350);
    }

    form.addEventListener("change", schedule);
    form.addEventListener("input", schedule);
    return () => {
      form.removeEventListener("change", schedule);
      form.removeEventListener("input", schedule);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [formId, previewPath, sectionIds, locale]);

  return (
    <aside className={styles.preview} aria-label={text.title}>
      <div className={styles.previewBar}>
        <div>
          <p className={styles.previewTitle}>{text.title}</p>
          <p className={styles.previewNote}>{text.note}</p>
        </div>
        <div
          className={styles.widthToggle}
          role="group"
          aria-label={text.width}
        >
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="button"
              aria-pressed={width === option}
              onClick={() => setWidth(option)}
            >
              {option === "desktop" ? text.desktop : text.mobile}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.frameWrap} data-width={width} aria-busy={loading}>
        {loading ? (
          <p className={styles.frameLoading} role="status">
            {text.updating}
          </p>
        ) : null}
        <iframe
          className={styles.frame}
          title={text.frame}
          src={src}
          onLoad={() => setLoading(false)}
        />
      </div>
    </aside>
  );
}
