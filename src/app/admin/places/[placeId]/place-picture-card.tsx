"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLACE_PICTURE_ALT_MAX,
  PLACE_PICTURE_ALT_MIN,
  PLACE_PICTURE_CREDIT_MAX,
  type PlacePictureView,
} from "@/modules/reference-data/place-picture-model";
import { removePlacePictureAction, savePlacePictureAction } from "../actions";
import adminStyles from "../../admin.module.css";
import styles from "./place-profile-editor.module.css";

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  placeId: string;
  placeName: string;
  picture: PlacePictureView | null;
  /** A picture is saved even though media storage is not configured here. */
  storedButHidden: boolean;
  storageReady: boolean;
};

/**
 * Upload, replace, describe and remove a place's editorial picture (doc 98).
 * A live banner preview shows exactly how the picture will crop on the page.
 */
export function PlacePictureCard({
  placeId,
  placeName,
  picture,
  storedButHidden,
  storageReady,
}: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(picture?.alt ?? "");
  const [altCy, setAltCy] = useState(picture?.altCy ?? "");
  const [credit, setCredit] = useState(picture?.credit ?? "");
  const [chosen, setChosen] = useState<{ name: string; url: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  // Release the preview object URL when it is replaced or the card unmounts.
  useEffect(() => {
    const url = chosen?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [chosen]);

  const hasPicture = Boolean(picture) || storedButHidden;
  const altReady = alt.trim().length >= PLACE_PICTURE_ALT_MIN;
  const canSave = altReady && (Boolean(chosen) || hasPicture) && !pending;
  const previewUrl = chosen?.url ?? picture?.url ?? null;

  function onFile(file: File | undefined) {
    setFeedback(null);
    if (!file) {
      setChosen(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setChosen(null);
      if (fileInput.current) fileInput.current.value = "";
      setFeedback({ kind: "error", text: "Pictures must be 5MB or smaller." });
      return;
    }
    setChosen({ name: file.name, url: URL.createObjectURL(file) });
  }

  async function onSave() {
    const data = new FormData();
    data.set("placeId", placeId);
    data.set("alt", alt);
    data.set("altCy", altCy);
    data.set("credit", credit);
    const file = fileInput.current?.files?.[0];
    if (file) data.set("image", file);
    setPending(true);
    setFeedback(null);
    try {
      const result = await savePlacePictureAction(data);
      if (result.status === "saved") {
        setFeedback({
          kind: "ok",
          text: file ? "Picture saved." : "Description saved.",
        });
        setChosen(null);
        if (fileInput.current) fileInput.current.value = "";
        router.refresh();
      } else if (result.status === "invalid") {
        setFeedback({ kind: "error", text: result.message });
      } else if (result.status === "disabled") {
        setFeedback({
          kind: "error",
          text: "Picture storage is not set up on this site yet.",
        });
      } else if (result.status === "forbidden") {
        setFeedback({
          kind: "error",
          text: "You do not have permission to do that.",
        });
      } else if (result.status === "not_found") {
        setFeedback({ kind: "error", text: "This place no longer exists." });
      } else {
        setFeedback({
          kind: "error",
          text: "Could not save the picture. Try again.",
        });
      }
    } finally {
      setPending(false);
    }
  }

  async function onRemove() {
    if (!window.confirm(`Remove the picture of ${placeName}?`)) return;
    setPending(true);
    setFeedback(null);
    try {
      const result = await removePlacePictureAction({ placeId });
      if (result.status === "saved") {
        setFeedback({ kind: "ok", text: "Picture removed." });
        setAlt("");
        setAltCy("");
        setCredit("");
        setChosen(null);
        router.refresh();
      } else {
        setFeedback({
          kind: "error",
          text: "Could not remove the picture. Try again.",
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={styles.pictureCard}
      aria-labelledby="pp-picture-title"
      data-testid="place-picture-card"
    >
      <h3 id="pp-picture-title">Picture</h3>
      <p className={adminStyles.hint}>
        One wide picture shown under the place heading and as a small thumbnail
        in place lists. Use a photo you have the right to publish, and credit it
        below.
      </p>
      {!storageReady ? (
        <p className={adminStyles.hint} role="note">
          Picture storage is not set up on this site, so a picture cannot be
          uploaded yet.
        </p>
      ) : null}
      {previewUrl ? (
        <div className={styles.pictureFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of a stored or chosen file */}
          <img
            className={styles.pictureImage}
            src={previewUrl}
            alt={alt.trim() || "Preview of the chosen picture"}
          />
          <span className={styles.pictureFrameNote}>
            Preview of the banner crop
          </span>
        </div>
      ) : (
        <p className={adminStyles.hint}>
          {storedButHidden
            ? "A picture is saved, but picture storage is not set up on this site."
            : "No picture yet. Places without one look exactly as before."}
        </p>
      )}

      <label htmlFor="pp-picture-file">
        {hasPicture ? "Replace picture" : "Choose a picture"}
      </label>
      <input
        id="pp-picture-file"
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={!storageReady || pending}
        aria-describedby="pp-picture-file-hint"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <p className={styles.help} id="pp-picture-file-hint">
        JPEG, PNG or WebP, up to 5MB. A landscape photo works best.
        {chosen ? ` Chosen: ${chosen.name}.` : ""}
      </p>

      <label htmlFor="pp-picture-alt">Description (required)</label>
      <input
        id="pp-picture-alt"
        value={alt}
        maxLength={PLACE_PICTURE_ALT_MAX}
        required
        aria-required="true"
        aria-describedby="pp-picture-alt-hint"
        onChange={(event) => setAlt(event.target.value)}
      />
      <p className={styles.help} id="pp-picture-alt-hint">
        Say what the picture shows, in at least {PLACE_PICTURE_ALT_MIN}{" "}
        characters, for people using a screen reader.
      </p>

      <label htmlFor="pp-picture-alt-cy">Welsh description (optional)</label>
      <input
        id="pp-picture-alt-cy"
        lang="cy"
        value={altCy}
        maxLength={PLACE_PICTURE_ALT_MAX}
        onChange={(event) => setAltCy(event.target.value)}
      />

      <label htmlFor="pp-picture-credit">Credit (optional)</label>
      <input
        id="pp-picture-credit"
        value={credit}
        maxLength={PLACE_PICTURE_CREDIT_MAX}
        aria-describedby="pp-picture-credit-hint"
        onChange={(event) => setCredit(event.target.value)}
      />
      <p className={styles.help} id="pp-picture-credit-hint">
        Shown on the picture as “Photo: …”. Plain text only.
      </p>

      <div className={styles.pictureActions}>
        <button
          className="button primary"
          type="button"
          disabled={!canSave}
          onClick={onSave}
        >
          {chosen ? "Upload picture" : "Save description"}
        </button>
        {hasPicture ? (
          <button
            className={`button ${adminStyles.buttonDanger}`}
            type="button"
            disabled={pending}
            onClick={onRemove}
          >
            Remove picture
          </button>
        ) : null}
      </div>
      <p
        className={feedback?.kind === "ok" ? styles.feedbackOk : styles.status}
        role="status"
        aria-live="polite"
      >
        {feedback?.text ?? ""}
      </p>
    </section>
  );
}
