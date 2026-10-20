"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n/client";
import { assessAltText } from "@/modules/businesses/photo-studio-model";
import {
  DescriptionField,
  FocusPicker,
  FramePreviews,
  useHydrated,
} from "./photo-fields";
import styles from "./photos.module.css";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function UploadButton({ ready, label }: { ready: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button primary"
      type="submit"
      disabled={!ready || pending}
      aria-busy={pending}
    >
      {label}
    </button>
  );
}

/**
 * Choose a photo, see it framed, describe it, then upload. The file is only
 * previewed locally until the form is posted; the server inspects the real
 * file signature, size and dimensions again, so the checks here are courtesy.
 */
export function PhotoUploader({
  businessId,
  role,
  action,
  title,
  maxBytes,
  replaces,
}: {
  businessId: string;
  role: "logo" | "hero" | "gallery";
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  maxBytes: number;
  /** True when the upload replaces an existing logo or cover photo. */
  replaces: boolean;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [focal, setFocal] = useState({ x: 50, y: 50 });
  const [altText, setAltText] = useState("");
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(file: File | undefined) {
    setProblem(null);
    setPreview(null);
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      setProblem(t("photos.upload.wrongType"));
      if (input.current) input.current.value = "";
      return;
    }
    if (file.size > maxBytes) {
      setProblem(t("photos.upload.tooBig", { max: maxMb }));
      if (input.current) input.current.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFocal({ x: 50, y: 50 });
  }

  const describedEnough =
    role === "logo" || assessAltText(altText, role).level !== "needs-work";
  const hydrated = useHydrated();
  // Without JavaScript nothing can be previewed, so the server does the checking.
  const ready = !hydrated || (preview !== null && describedEnough);

  return (
    <form action={action} className={styles.uploader}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="role" value={role} />
      <h4 className={styles.editorTitle}>{title}</h4>
      <div className={styles.field}>
        <label htmlFor={`file-${role}`}>{t("photos.upload.file")}</label>
        <input
          ref={input}
          id={`file-${role}`}
          type="file"
          name="file"
          required
          accept={acceptedTypes.join(",")}
          aria-describedby={`file-${role}-help`}
          onChange={(event) => choose(event.target.files?.[0])}
        />
        <p className={styles.fieldHelp} id={`file-${role}-help`}>
          {t("photos.upload.help", { max: maxMb })}
          {replaces ? ` ${t("photos.upload.replaceNote")}` : ""}
        </p>
        {problem ? (
          <p className={styles.problem} role="alert">
            {problem}
          </p>
        ) : null}
      </div>
      {/* Always present, so the form still posts a description without JavaScript. */}
      <DescriptionField role={role} value={altText} onChange={setAltText} />
      {preview ? (
        <>
          {role !== "logo" ? (
            <>
              <FocusPicker src={preview} focal={focal} onChange={setFocal} />
              <FramePreviews src={preview} focal={focal} />
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.logoPreview}
                src={preview}
                alt={t("photos.upload.previewAlt")}
              />
              <input type="hidden" name="focalX" value={50} />
              <input type="hidden" name="focalY" value={50} />
            </>
          )}
          {!describedEnough ? (
            <p className={styles.problem}>{t("photos.upload.altRequired")}</p>
          ) : null}
        </>
      ) : (
        <>
          <input type="hidden" name="focalX" value={focal.x} />
          <input type="hidden" name="focalY" value={focal.y} />
        </>
      )}
      <div className={styles.saveRow}>
        <UploadButton ready={ready} label={t("photos.upload.submit")} />
      </div>
    </form>
  );
}
