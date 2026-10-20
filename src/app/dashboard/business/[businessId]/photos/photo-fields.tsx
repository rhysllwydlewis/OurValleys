"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import {
  altTextLimits,
  assessAltText,
  cropFrames,
  focalFromPointer,
  nudgeFocal,
  objectPositionFor,
} from "@/modules/businesses/photo-studio-model";
import styles from "./photos.module.css";

export type Focal = { x: number; y: number };

const subscribeNothing = () => () => {};

/**
 * False on the server and until the page hydrates. Buttons that are disabled
 * "until something changes" use it so that, without JavaScript, the form is
 * still submittable and the server does the validating.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

/**
 * Click, drag or arrow-key a photo to choose the part that must stay in view.
 * The two range inputs are the real controls: they post with the form, work
 * without JavaScript, and give keyboard and screen-reader users the same
 * precision. The pointer layer is an enhancement on top of them.
 */
export function FocusPicker({
  src,
  focal,
  onChange,
}: {
  src: string;
  focal: Focal;
  onChange: (next: Focal) => void;
}) {
  const t = useT();
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function fromPointer(clientX: number, clientY: number) {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    onChange(
      focalFromPointer({
        x: clientX,
        y: clientY,
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }),
    );
  }

  return (
    <div className={styles.picker}>
      <div
        ref={stage}
        className={styles.pickerStage}
        aria-hidden="true"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (dragging.current) fromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className={styles.pickerImage}
        />
        <span
          className={styles.pickerMark}
          style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
        />
      </div>
      <p className={styles.pickerHelp} id={`${id}-help`}>
        {t("photos.editor.focusHelp")}
      </p>
      <div className={styles.sliders}>
        <label htmlFor={`${id}-x`}>
          {t("photos.editor.horizontal")}
          <input
            id={`${id}-x`}
            type="range"
            name="focalX"
            min={0}
            max={100}
            step={1}
            value={focal.x}
            aria-describedby={`${id}-help`}
            aria-valuetext={`${focal.x}%`}
            onChange={(event) =>
              onChange(
                nudgeFocal(focal, Number(event.target.value) - focal.x, 0),
              )
            }
          />
        </label>
        <label htmlFor={`${id}-y`}>
          {t("photos.editor.vertical")}
          <input
            id={`${id}-y`}
            type="range"
            name="focalY"
            min={0}
            max={100}
            step={1}
            value={focal.y}
            aria-describedby={`${id}-help`}
            aria-valuetext={`${focal.y}%`}
            onChange={(event) =>
              onChange(
                nudgeFocal(focal, 0, Number(event.target.value) - focal.y),
              )
            }
          />
        </label>
        <button
          type="button"
          className="button"
          onClick={() => onChange({ x: 50, y: 50 })}
        >
          {t("photos.editor.centre")}
        </button>
      </div>
    </div>
  );
}

/** The photo at each real crop, so the owner sees the result before saving. */
export function FramePreviews({ src, focal }: { src: string; focal: Focal }) {
  const t = useT();
  return (
    <section className={styles.frames} aria-label={t("photos.frames.title")}>
      <h4 className={styles.framesTitle}>{t("photos.frames.title")}</h4>
      <ul className={styles.frameList}>
        {cropFrames.map((frame) => (
          <li key={frame.id} className={styles.frameItem} data-frame={frame.id}>
            <div
              className={styles.frame}
              style={{ aspectRatio: `${frame.ratio[0]} / ${frame.ratio[1]}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                draggable={false}
                style={{ objectPosition: objectPositionFor(focal) }}
              />
            </div>
            <span className={styles.frameLabel}>
              {t(`photos.frames.${frame.id}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A description box that explains, in plain words, what would improve it. */
export function DescriptionField({
  role,
  value,
  onChange,
}: {
  role: "logo" | "hero" | "gallery";
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useT();
  const id = useId();
  const assessment = assessAltText(value, role);
  return (
    <div className={styles.field}>
      <label htmlFor={`${id}-alt`}>{t("photos.alt.label")}</label>
      <p className={styles.fieldHelp} id={`${id}-help`}>
        {t("photos.alt.help")}
      </p>
      <textarea
        id={`${id}-alt`}
        name="altText"
        rows={2}
        maxLength={altTextLimits.max}
        lang={authoredTextLang || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-help ${id}-hints`}
        aria-invalid={assessment.level === "needs-work" && value.length > 0}
      />
      <div id={`${id}-hints`} className={styles.hints}>
        <span className={styles.count}>
          {t("photos.alt.count", {
            count: assessment.length,
            max: altTextLimits.max,
          })}
        </span>
        {assessment.level === "good" ? (
          <span className={styles.hintGood}>{t("photos.alt.good")}</span>
        ) : (
          <ul>
            {assessment.hints.map((hint) => (
              <li key={hint} data-level={assessment.level}>
                {t(`photos.alt.hint.${hint}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
