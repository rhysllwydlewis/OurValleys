"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n/client";
import {
  DescriptionField,
  FocusPicker,
  FramePreviews,
  useHydrated,
} from "./photo-fields";
import styles from "./photos.module.css";

export type EditablePhoto = {
  id: string;
  role: "logo" | "hero" | "gallery";
  url: string;
  altText: string;
  focalX: number;
  focalY: number;
};

function SaveButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button primary"
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {label}
    </button>
  );
}

/**
 * The focus, crop preview and description for one saved photo. It posts
 * `mediaId`, `focalX`, `focalY` and `altText`; the server re-validates all of
 * them, so nothing here is trusted.
 */
export function PhotoEditor({
  businessId,
  photo,
  action,
  canEdit,
}: {
  businessId: string;
  photo: EditablePhoto;
  action: (formData: FormData) => void | Promise<void>;
  canEdit: boolean;
}) {
  const t = useT();
  const [focal, setFocal] = useState({ x: photo.focalX, y: photo.focalY });
  const [altText, setAltText] = useState(photo.altText);
  const dirty =
    focal.x !== photo.focalX ||
    focal.y !== photo.focalY ||
    altText !== photo.altText;
  const framed = photo.role !== "logo";
  const hydrated = useHydrated();

  // Closing the tab or following a link would silently drop the edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form action={action} className={styles.editor}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="mediaId" value={photo.id} />
      <fieldset className={styles.editorSet} disabled={!canEdit}>
        {framed ? (
          <>
            <h4 className={styles.editorTitle}>
              {t("photos.editor.focusTitle")}
            </h4>
            <FocusPicker src={photo.url} focal={focal} onChange={setFocal} />
            <FramePreviews src={photo.url} focal={focal} />
          </>
        ) : (
          <>
            <input type="hidden" name="focalX" value={focal.x} />
            <input type="hidden" name="focalY" value={focal.y} />
          </>
        )}
        <DescriptionField
          role={photo.role}
          value={altText}
          onChange={setAltText}
        />
        <div className={styles.saveRow}>
          <SaveButton
            disabled={hydrated && !dirty}
            label={t("photos.editor.save")}
          />
          <span className={styles.dirty} role="status" data-dirty={dirty}>
            {dirty ? t("photos.editor.dirty") : t("photos.editor.clean")}
          </span>
        </div>
      </fieldset>
    </form>
  );
}
