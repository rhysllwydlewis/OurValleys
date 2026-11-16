"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  GUIDE_PICTURE_ALT_MAX,
  GUIDE_PICTURE_ALT_MIN,
  GUIDE_PICTURE_CREDIT_MAX,
  GUIDE_PICTURE_MAX_BYTES,
  type GuidePictureView,
} from "@/modules/guides/guide-picture-model";
import { removeGuidePictureAction, saveGuidePictureAction } from "./actions";
import studio from "./guide-studio.module.css";

export type GuidePictureState = {
  picture: GuidePictureView | null;
  /** A picture is saved even though media storage is not configured here. */
  stored: boolean;
  storageReady: boolean;
};

type Feedback = { kind: "ok" | "error"; text: string };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload, replace, describe and remove a guide's own picture (doc 118). It
 * saves on its own, separately from the guide's words, so adding a picture
 * never needs the text to be saved first and never disturbs unsaved edits.
 * The preview shows the wide crop used on the article and the card crop.
 */
export function GuidePictureCard({
  guideId,
  guideTitle,
  state,
}: {
  /** `null` while the guide has not been created yet. */
  guideId: string | null;
  guideTitle: string;
  state: GuidePictureState;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const { picture, storageReady } = state;
  const storedButHidden = state.stored && !picture;
  const [alt, setAlt] = useState(picture?.alt ?? "");
  const [altCy, setAltCy] = useState(picture?.altCy ?? "");
  const [credit, setCredit] = useState(picture?.credit ?? "");
  const [chosen, setChosen] = useState<{ name: string; url: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Release the preview object URL when it is replaced or the card unmounts.
  useEffect(() => {
    const url = chosen?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [chosen]);

  if (!guideId) {
    return (
      <fieldset className={studio.fieldset} data-testid="guide-picture-card">
        <legend>Picture</legend>
        <p className={studio.hint}>
          Create the guide first. You can then give it its own picture here;
          until you do, cards show a stock photo matched to its subject.
        </p>
      </fieldset>
    );
  }

  const hasPicture = Boolean(picture) || storedButHidden;
  const altReady = alt.trim().length >= GUIDE_PICTURE_ALT_MIN;
  const textChanged =
    alt.trim() !== (picture?.alt ?? "") ||
    altCy.trim() !== (picture?.altCy ?? "") ||
    credit.trim() !== (picture?.credit ?? "");
  const canSave =
    altReady &&
    !pending &&
    (Boolean(chosen) || (hasPicture && (textChanged || storedButHidden)));
  const previewUrl = chosen?.url ?? picture?.url ?? null;

  function clearFile() {
    setChosen(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function onFile(file: File | undefined) {
    setFeedback(null);
    if (!file) {
      setChosen(null);
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      clearFile();
      setFeedback({
        kind: "error",
        text: "Choose a JPEG, PNG or WebP picture.",
      });
      return;
    }
    if (file.size > GUIDE_PICTURE_MAX_BYTES) {
      clearFile();
      setFeedback({ kind: "error", text: "Pictures must be 5MB or smaller." });
      return;
    }
    setChosen({ name: file.name, url: URL.createObjectURL(file) });
  }

  async function onSave() {
    if (!guideId || !canSave) return;
    const data = new FormData();
    data.set("guideId", guideId);
    data.set("alt", alt);
    data.set("altCy", altCy);
    data.set("credit", credit);
    const file = fileInput.current?.files?.[0];
    if (file) data.set("image", file);
    setPending(true);
    setFeedback(null);
    try {
      const result = await saveGuidePictureAction(data);
      if (result.status === "saved") {
        setFeedback({
          kind: "ok",
          text: file
            ? "Picture saved. It is on the guide now."
            : "Description saved.",
        });
        clearFile();
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
          text: "You do not have permission to do that. Sign in again.",
        });
      } else if (result.status === "not_found") {
        setFeedback({
          kind: "error",
          text: "This guide or its picture no longer exists. Reload the page.",
        });
      } else {
        setFeedback({
          kind: "error",
          text: "Could not save the picture. Someone else may have changed it; reload and try again.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        text: "Could not reach the site. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function onRemove() {
    if (!guideId) return;
    setPending(true);
    setFeedback(null);
    try {
      const result = await removeGuidePictureAction({ guideId });
      if (result.status === "saved") {
        setFeedback({
          kind: "ok",
          text: "Picture removed. Cards show a stock photo again.",
        });
        setAlt("");
        setAltCy("");
        setCredit("");
        clearFile();
        router.refresh();
      } else {
        setFeedback({
          kind: "error",
          text: "Could not remove the picture. Reload and try again.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        text: "Could not reach the site. Check your connection and try again.",
      });
    } finally {
      setPending(false);
      setConfirmingRemove(false);
    }
  }

  // The card sits inside the guide's form: Enter in one of its fields saves
  // the picture, not the guide.
  function onFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void onSave();
  }

  return (
    <fieldset className={studio.fieldset} data-testid="guide-picture-card">
      <legend>Picture</legend>
      <p className={studio.hint}>
        One landscape picture, shown wide at the top of the guide and on its
        cards across the site. It saves on its own, separately from the words.
        Use a photo you have the right to publish, and credit it below.
      </p>
      {!storageReady ? (
        <p className={studio.pictureNote} role="note">
          Picture storage is not set up on this site, so a picture cannot be
          uploaded yet.
        </p>
      ) : null}

      {previewUrl ? (
        <div className={studio.picturePreviews}>
          <figure className={studio.pictureFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of a stored or chosen file */}
            <img
              className={studio.pictureWide}
              src={previewUrl}
              alt={alt.trim() || "Preview of the chosen picture"}
            />
            <figcaption className={studio.pictureFrameNote}>
              On the guide{credit.trim() ? ` · Photo: ${credit.trim()}` : ""}
            </figcaption>
          </figure>
          <figure className={studio.pictureFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of a stored or chosen file */}
            <img className={studio.pictureCardCrop} src={previewUrl} alt="" />
            <figcaption className={studio.pictureFrameNote}>
              On cards
            </figcaption>
          </figure>
        </div>
      ) : (
        <p className={studio.pictureEmpty}>
          {storedButHidden
            ? "A picture is saved, but picture storage is not set up on this site, so it cannot be shown."
            : "No picture yet. Cards show a stock photo matched to the guide’s subject, and the article has none."}
        </p>
      )}

      <div className={studio.field}>
        <label htmlFor="guide-picture-file">
          {hasPicture ? "Replace picture" : "Choose a picture"}
        </label>
        <input
          id="guide-picture-file"
          ref={fileInput}
          className={studio.pictureFile}
          type="file"
          accept={ACCEPTED.join(",")}
          disabled={!storageReady || pending}
          aria-describedby="guide-picture-file-hint"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <p className={studio.hint} id="guide-picture-file-hint">
          JPEG, PNG or WebP, up to 5MB. A landscape photo at least 1600 pixels
          wide stays sharp; the middle of the picture is kept when it is
          cropped.
          {chosen ? ` Chosen: ${chosen.name}.` : ""}
        </p>
      </div>

      <div className={studio.field}>
        <label htmlFor="guide-picture-alt">Description (required)</label>
        <input
          id="guide-picture-alt"
          value={alt}
          maxLength={GUIDE_PICTURE_ALT_MAX}
          aria-required="true"
          aria-describedby="guide-picture-alt-hint"
          onChange={(event) => setAlt(event.target.value)}
          onKeyDown={onFieldKeyDown}
        />
        <p className={studio.hint} id="guide-picture-alt-hint">
          Say what the picture shows, in at least {GUIDE_PICTURE_ALT_MIN}{" "}
          characters, for people using a screen reader.
        </p>
      </div>

      <div className={studio.twoUp}>
        <div className={studio.field}>
          <label htmlFor="guide-picture-alt-cy">
            Welsh description (optional)
          </label>
          <input
            id="guide-picture-alt-cy"
            lang="cy"
            value={altCy}
            maxLength={GUIDE_PICTURE_ALT_MAX}
            aria-describedby="guide-picture-alt-cy-hint"
            onChange={(event) => setAltCy(event.target.value)}
            onKeyDown={onFieldKeyDown}
          />
          <p className={studio.hint} id="guide-picture-alt-cy-hint">
            Welsh readers hear this instead; without it they get the English.
          </p>
        </div>
        <div className={studio.field}>
          <label htmlFor="guide-picture-credit">Credit (optional)</label>
          <input
            id="guide-picture-credit"
            value={credit}
            maxLength={GUIDE_PICTURE_CREDIT_MAX}
            aria-describedby="guide-picture-credit-hint"
            onChange={(event) => setCredit(event.target.value)}
            onKeyDown={onFieldKeyDown}
          />
          <p className={studio.hint} id="guide-picture-credit-hint">
            Shown on the picture as “Photo: …”. Plain text only.
          </p>
        </div>
      </div>

      <div className={studio.pictureActions}>
        <button
          className="button primary"
          type="button"
          disabled={!canSave}
          onClick={onSave}
        >
          {pending && !confirmingRemove
            ? "Saving…"
            : chosen
              ? "Upload picture"
              : "Save description"}
        </button>
        {chosen ? (
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => {
              clearFile();
              setFeedback(null);
            }}
          >
            Keep the current picture
          </button>
        ) : null}
        {hasPicture && !confirmingRemove ? (
          <button
            className={`button ${studio.danger}`}
            type="button"
            disabled={pending}
            onClick={() => setConfirmingRemove(true)}
          >
            Remove picture
          </button>
        ) : null}
      </div>
      {confirmingRemove ? (
        <div
          className={studio.pictureConfirm}
          role="group"
          aria-label="Confirm removal"
        >
          <p className={studio.hint}>
            Remove the picture of “{guideTitle || "this guide"}”? Readers will
            see a stock photo on cards and no picture on the article.
          </p>
          <div className={studio.pictureActions}>
            <button
              className={`button ${studio.danger}`}
              type="button"
              disabled={pending}
              onClick={onRemove}
            >
              {pending ? "Removing…" : "Yes, remove it"}
            </button>
            <button
              className="button"
              type="button"
              disabled={pending}
              onClick={() => setConfirmingRemove(false)}
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}
      <p
        className={
          feedback?.kind === "ok"
            ? studio.pictureFeedbackOk
            : studio.pictureFeedbackError
        }
        role="status"
        aria-live="polite"
      >
        {feedback?.text ?? ""}
      </p>
    </fieldset>
  );
}
