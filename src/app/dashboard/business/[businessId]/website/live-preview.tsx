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
}: {
  formId: string;
  previewPath: string;
  sectionIds: string[];
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
      const params = new URLSearchParams({
        frame: "1",
        template: String(data.get("templateKey") ?? ""),
        accent: String(data.get("accentKey") ?? ""),
        hide: hidden.join(","),
        order: order.join(","),
        layouts,
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
    return () => {
      form.removeEventListener("change", schedule);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [formId, previewPath, sectionIds]);

  return (
    <aside className={styles.preview} aria-label="Live preview">
      <div className={styles.previewBar}>
        <div>
          <p className={styles.previewTitle}>Live preview</p>
          <p className={styles.previewNote}>
            Shows your choices before you save them.
          </p>
        </div>
        <div
          className={styles.widthToggle}
          role="group"
          aria-label="Preview width"
        >
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="button"
              aria-pressed={width === option}
              onClick={() => setWidth(option)}
            >
              {option === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.frameWrap} data-width={width} aria-busy={loading}>
        {loading ? (
          <p className={styles.frameLoading} role="status">
            Updating preview…
          </p>
        ) : null}
        <iframe
          className={styles.frame}
          title="Preview of your website with the current choices"
          src={src}
          onLoad={() => setLoading(false)}
        />
      </div>
    </aside>
  );
}
