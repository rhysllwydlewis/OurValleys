"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { isValidProfileImageUrl } from "@/lib/account-settings-validation";
import { getAvatarTone, getInitials } from "@/lib/initials";
import styles from "./account-settings.module.css";

type ProfileSettingsFormProps = {
  initialName: string;
  initialImage: string;
};

export function ProfileSettingsForm({
  initialName,
  initialImage,
}: ProfileSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const nameId = useId();
  const imageId = useId();

  const trimmedImage = image.trim();
  const hasInvalidImage = !isValidProfileImageUrl(trimmedImage);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeedback({
        message: "Enter a name so other people know who they're dealing with.",
        isError: true,
      });
      return;
    }
    if (hasInvalidImage) {
      setFeedback({
        message: "Profile photo links must be a full https:// address.",
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await authClient.updateUser({
        name: trimmedName,
        image: trimmedImage ? trimmedImage : null,
      });

      if (result.error) {
        setFeedback({
          message: "We could not save your profile. Please try again.",
          isError: true,
        });
        return;
      }

      setName(trimmedName);
      setImage(trimmedImage);
      setFeedback({ message: "Profile updated.", isError: false });
    } catch {
      setFeedback({
        message: "Profile changes could not be reached. Please try again.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <div className={styles.avatarPreviewRow}>
          <span
            className={`${styles.avatarPreview} ${styles[`tone${getAvatarTone(initialName)}`]}`}
            aria-hidden="true"
          >
            {trimmedImage && !hasInvalidImage ? (
              <img src={trimmedImage} alt="" />
            ) : (
              getInitials(name || initialName)
            )}
          </span>
          <p className={styles.fieldHint}>
            Your photo appears next to your name across OurValleys.
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor={nameId}>Name</label>
          <input
            id={nameId}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            disabled={isSubmitting}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={imageId}>Profile photo link</label>
          <input
            id={imageId}
            name="image"
            type="url"
            inputMode="url"
            placeholder="https://example.com/your-photo.jpg"
            maxLength={2048}
            disabled={isSubmitting}
            value={image}
            aria-invalid={hasInvalidImage}
            onChange={(event) => setImage(event.target.value)}
          />
          <p className={styles.fieldHint}>
            Optional. Paste a link to an image you host elsewhere. Leave this
            blank to use your initials instead.
          </p>
        </div>
      </div>

      {feedback ? (
        <p
          className={`${styles.feedback} ${feedback.isError ? styles.feedbackError : styles.feedbackSuccess}`}
          role={feedback.isError ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className={styles.actionsRow}>
        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
