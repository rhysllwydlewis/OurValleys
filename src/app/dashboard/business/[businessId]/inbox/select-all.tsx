"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./inbox.module.css";

/**
 * Ticks or clears every enquiry checkbox in the bulk form. Progressive
 * enhancement only: each row can still be ticked on its own without it.
 */
export function SelectAll({
  formId,
  label,
}: {
  formId: string;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"none" | "some" | "all">("none");

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const boxes = () =>
      Array.from(form.querySelectorAll<HTMLInputElement>('input[name="ids"]'));
    const sync = () => {
      const all = boxes();
      const checked = all.filter((box) => box.checked).length;
      setState(
        checked === 0 ? "none" : checked === all.length ? "all" : "some",
      );
    };
    form.addEventListener("change", sync);
    sync();
    return () => form.removeEventListener("change", sync);
  }, [formId]);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);

  return (
    <label className={styles.selectAll}>
      <input
        ref={ref}
        type="checkbox"
        checked={state === "all"}
        onChange={(event) => {
          const form = document.getElementById(formId);
          form
            ?.querySelectorAll<HTMLInputElement>('input[name="ids"]')
            .forEach((box) => {
              box.checked = event.target.checked;
            });
          setState(event.target.checked ? "all" : "none");
        }}
      />
      <span>{label}</span>
    </label>
  );
}
