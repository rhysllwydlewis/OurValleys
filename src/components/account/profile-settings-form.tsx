"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
  const nameId = useId();
  const imageId = useId();

  const trimmedImage = image.trim();
  const hasInvalidImage = !isValidProfileImageUrl(trimmedImage);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeedback({
        message: t("profileForm.nameRequired"),
        isError: true,
      });
      return;
    }
    if (hasInvalidImage) {
      setFeedback({
        message: t("profileForm.imageInvalid"),
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
          message: t("profileForm.saveFailed"),
          isError: true,
        });
        return;
      }

      setName(trimmedName);
      setImage(trimmedImage);
      setFeedback({ message: t("profileForm.updated"), isError: false });
    } catch {
      setFeedback({
        message: t("profileForm.unreachable"),
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
          <p className={styles.fieldHint}>{t("profileForm.photoAppears")}</p>
        </div>

        <div className={styles.field}>
          <label htmlFor={nameId}>{t("settings.profile.name")}</label>
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
          <label htmlFor={imageId}>{t("settings.profile.imageLabel")}</label>
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
          <p className={styles.fieldHint}>{t("profileForm.imageHint")}</p>
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
          {isSubmitting ? t("profileForm.saving") : t("settings.profile.save")}
        </button>
      </div>
    </form>
  );
}
