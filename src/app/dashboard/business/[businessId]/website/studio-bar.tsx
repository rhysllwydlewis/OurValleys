"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import styles from "./designer.module.css";
import { EyeIcon, UndoIcon } from "./designer-icons";
import { PREVIEW_OPEN_EVENT } from "./studio-events";

type AccentColours = { primary: string; strong: string; soft: string };

function snapshot(form: HTMLFormElement) {
  const pairs: string[] = [];
  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string") pairs.push(`${name}=${value}`);
  }
  return pairs.sort().join("\n");
}

/**
 * The designer's action bar. It stays in reach at the bottom of the controls
 * and says whether there are choices that have not been saved yet. Saving is
 * the form's own submit button, so it works without scripts; the status text
 * and the preview sheet are enhancements.
 */
export function StudioBar({
  formId,
  previewHref,
  accents,
  canEdit,
  renderToken,
  text,
}: {
  formId: string;
  previewHref: string;
  /** Approved accent colours, so the pickers can follow the chosen one. */
  accents: Record<string, AccentColours>;
  canEdit: boolean;
  /**
   * New on every server render. A save ends with the page rendering again,
   * which is how the bar knows the save it was waiting for has finished.
   */
  renderToken: string;
  text: {
    save: string;
    saving: string;
    preview: string;
    unsaved: string;
    saved: string;
    discard: string;
    viewOnly: string;
  };
}) {
  const [dirty, setDirty] = useState(false);
  const [savingToken, setSavingToken] = useState<string | null>(null);
  const saving = savingToken === renderToken;
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    // Taken once per mount: the bar is remounted whenever the saved design
    // changes, so this is always the saved state.
    baseline.current ??= snapshot(form);

    function sync() {
      const owner = form as HTMLFormElement;
      setDirty(snapshot(owner) !== baseline.current);
      // The template miniatures and selected states follow the chosen colour.
      const accent = accents[String(new FormData(owner).get("accentKey"))];
      if (accent) {
        owner.style.setProperty("--picker-accent", accent.primary);
        owner.style.setProperty("--picker-strong", accent.strong);
        owner.style.setProperty("--picker-soft", accent.soft);
      }
    }
    function submitting() {
      setSavingToken(renderToken);
    }
    // Once at the start too: the form element outlives a reset, so colours
    // set for an earlier unsaved choice must be put back in step.
    sync();
    form.addEventListener("change", sync);
    form.addEventListener("input", sync);
    form.addEventListener("submit", submitting);
    return () => {
      form.removeEventListener("change", sync);
      form.removeEventListener("input", sync);
      form.removeEventListener("submit", submitting);
    };
  }, [formId, accents, renderToken]);

  // Leaving with unsaved choices asks first; saving never does.
  useEffect(() => {
    if (!dirty || saving) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  function discard() {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    // Back to the saved design: the browser restores every field, and the
    // section rows put their order back on the same event. Then the preview
    // and this bar are told, since a reset fires no change event.
    form.reset();
    form.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openPreview(event: MouseEvent<HTMLAnchorElement>) {
    // With scripts the preview opens as a sheet over this page, keeping any
    // unsaved choices; without them the link opens the saved preview.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    document.dispatchEvent(
      new CustomEvent(PREVIEW_OPEN_EVENT, { detail: event.currentTarget }),
    );
  }

  return (
    <div className={styles.bar} data-dirty={dirty || undefined}>
      <p className={styles.barStatus} role="status">
        <span className={styles.barDot} aria-hidden="true" />
        {!canEdit ? text.viewOnly : dirty ? text.unsaved : text.saved}
      </p>
      {canEdit && dirty && !saving ? (
        <button
          type="button"
          className={styles.barDiscard}
          onClick={discard}
          aria-label={text.discard}
          title={text.discard}
        >
          <UndoIcon />
        </button>
      ) : null}
      <a
        className={`button ${styles.barPreview}`}
        href={previewHref}
        onClick={openPreview}
      >
        <EyeIcon />
        {text.preview}
      </a>
      {canEdit ? (
        <button
          className="button primary"
          type="submit"
          form={formId}
          aria-disabled={saving || undefined}
        >
          {saving ? text.saving : text.save}
        </button>
      ) : null}
    </div>
  );
}
