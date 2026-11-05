"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  galleryPhotoAnchor,
  swipeStep,
  wrapGalleryIndex,
} from "@/modules/businesses/gallery-model";
import styles from "./business-gallery.module.css";

export type GalleryPhotoView = {
  id: string;
  url: string;
  /** Accessible name and lightbox caption (the owner's alt text or a fallback). */
  label: string;
  /** Language of `label` when it is the owner's own words; absent for generated text. */
  labelLang?: string | undefined;
  /** The owner's short visible caption; empty when none was written. */
  caption: string;
  captionLang: string;
  focalX: number;
  focalY: number;
};

export type GalleryLayoutKey = "grid" | "feature" | "mosaic" | "strip";

export type GalleryLabels = {
  /** `{label}` is the photo's name: "Enlarge photo: {label}". */
  open: string;
  dialog: string;
  close: string;
  previous: string;
  next: string;
  /** `{position}` and `{total}` placeholders. */
  counter: string;
};

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * A photo gallery that is complete without scripts (each photo is a link to
 * the picture itself) and, with scripts, opens a keyboard-, touch- and
 * screen-reader-friendly lightbox built on the native modal `<dialog>`.
 */
export function BusinessGallery({
  photos,
  layout,
  labels,
}: {
  photos: ReadonlyArray<GalleryPhotoView>;
  layout: GalleryLayoutKey;
  labels: GalleryLabels;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  // A swipe or drag must not also count as a click on the backdrop.
  const suppressClick = useRef(false);
  const [index, setIndex] = useState(0);
  const total = photos.length;

  const step = useCallback(
    (by: number) =>
      setIndex((current) => wrapGalleryIndex(current + by, total)),
    [total],
  );

  const open = useCallback((at: number) => {
    setIndex(at);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // The page behind a full-screen viewer should not scroll.
      document.documentElement.style.overflow = "hidden";
    }
  }, []);

  // Never leave the page locked if the gallery unmounts while open.
  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
    },
    [],
  );

  // Warm the neighbours so stepping through feels instant.
  useEffect(() => {
    if (!dialogRef.current?.open || total < 2) return;
    for (const offset of [-1, 1]) {
      const neighbour = photos[wrapGalleryIndex(index + offset, total)];
      if (neighbour) new window.Image().src = neighbour.url;
    }
  }, [index, photos, total]);

  const current = photos[wrapGalleryIndex(index, total)];
  if (total === 0 || !current) return null;

  function onKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setIndex(total - 1);
    }
  }

  const layoutClass =
    layout === "feature"
      ? styles.feature
      : layout === "mosaic"
        ? styles.mosaic
        : layout === "strip"
          ? styles.strip
          : styles.grid;

  return (
    <>
      <ul
        className={`${styles.gallery} ${layoutClass}`}
        data-gallery-layout={layout}
      >
        {photos.map((photo, position) => (
          <li className={styles.item} key={photo.id}>
            <a
              className={styles.thumb}
              href={photo.url}
              id={galleryPhotoAnchor(photo.id, position)}
              aria-label={fill(labels.open, {
                // The caption can say something the description does not, so
                // it joins the link's name; with no description it names the
                // photo on its own.
                label:
                  photo.labelLang && photo.caption
                    ? `${photo.label}. ${photo.caption}`
                    : photo.labelLang
                      ? photo.label
                      : photo.caption || photo.label,
              })}
              onClick={(event) => {
                // Let modified clicks (new tab) behave as plain links.
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.button !== 0
                )
                  return;
                event.preventDefault();
                open(position);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                loading={position < 3 ? "eager" : "lazy"}
                decoding="async"
                style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
              />
              {photo.caption ? (
                // The link's accessible name already includes the caption.
                <span
                  className={styles.thumbCaption}
                  lang={photo.captionLang}
                  aria-hidden="true"
                >
                  {photo.caption}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={labels.dialog}
        onKeyDown={onKeyDown}
        onClose={() => {
          document.documentElement.style.overflow = "";
        }}
        onClick={(event) => {
          // A click on the empty space around the photo closes the viewer.
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          const target = event.target as HTMLElement;
          if (
            target === event.currentTarget ||
            target.dataset.backdrop === "true"
          )
            dialogRef.current?.close();
        }}
        onPointerDown={(event) => {
          suppressClick.current = false;
          // Swipes are for touch and pen; a mouse drag must not step photos.
          pointerStart.current =
            event.pointerType === "mouse"
              ? null
              : { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start || total < 2) return;
          const by = swipeStep(
            event.clientX - start.x,
            event.clientY - start.y,
          );
          if (by !== 0) step(by);
        }}
      >
        <div className={styles.stage} data-backdrop="true">
          <button
            type="button"
            className={styles.close}
            onClick={() => dialogRef.current?.close()}
            aria-label={labels.close}
          >
            <span aria-hidden="true">×</span>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.full}
            src={current.url}
            alt={current.label}
            lang={current.labelLang}
            draggable={false}
          />
          {/* The caption is visible text, so it is announced once, here. */}
          <p
            className={styles.caption}
            lang={current.caption ? current.captionLang : current.labelLang}
            aria-hidden={current.caption ? undefined : "true"}
          >
            {current.caption || current.label}
          </p>
          <p className={styles.counter} role="status" aria-live="polite">
            {fill(labels.counter, {
              position: wrapGalleryIndex(index, total) + 1,
              total,
            })}
          </p>
          {total > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                onClick={() => step(-1)}
                aria-label={labels.previous}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                onClick={() => step(1)}
                aria-label={labels.next}
              >
                <span aria-hidden="true">›</span>
              </button>
            </>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
