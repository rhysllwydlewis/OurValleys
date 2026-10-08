"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "./gallery-order-editor.module.css";

export type GalleryOrderItem = {
  id: string;
  url: string;
  altText: string;
};

const subscribeNothing = () => () => {};

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/**
 * Drag-and-drop (mouse) and button (keyboard, touch, screen reader) reordering
 * of the gallery. It is an enhancement: without JavaScript nothing renders and
 * the per-image "Move earlier / Move later" forms below remain the way to
 * reorder. Saving posts the complete order, which the server validates.
 */
export function GalleryOrderEditor({
  businessId,
  items,
  action,
}: {
  businessId: string;
  items: GalleryOrderItem[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const [order, setOrder] = useState(items.map((item) => item.id));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Re-sync when the server list changes (an image was added or removed).
  const serverKey = items.map((item) => item.id).join(",");
  const [syncedKey, setSyncedKey] = useState(serverKey);
  if (syncedKey !== serverKey) {
    setSyncedKey(serverKey);
    setOrder(items.map((item) => item.id));
  }

  if (!hydrated || items.length < 2) return null;

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((item): item is GalleryOrderItem => item !== undefined);
  const changed = ordered.some((item, index) => item.id !== items[index]?.id);

  // Buttons use aria-disabled (not disabled) at either end so keyboard focus
  // is not dropped when a photo reaches the first or last position.
  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    setOrder((current) => moveItem(current, from, to));
    setAnnouncement(
      `Photo moved to position ${to + 1} of ${order.length}. Save the order to keep it.`,
    );
  }

  return (
    <form action={action} className={styles.editor}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="order" value={order.join(",")} />
      <h4>Arrange the gallery</h4>
      <p className={styles.help}>
        Drag a photo to a new place, or use the arrow buttons. The first photo
        appears first on your website. Nothing changes until you save.
      </p>
      <ol className={styles.list}>
        {ordered.map((item, index) => (
          <li
            key={item.id}
            className={`${styles.item} ${dragIndex === index ? styles.dragging : ""}`}
            draggable
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (dragIndex !== null && dragIndex !== index) {
                setOrder((current) => moveItem(current, dragIndex, index));
                setDragIndex(index);
              }
            }}
            onDrop={(event) => event.preventDefault()}
            onDragEnd={() => {
              if (dragIndex !== null) {
                setAnnouncement(
                  `Photo placed at position ${dragIndex + 1} of ${order.length}. Save the order to keep it.`,
                );
              }
              setDragIndex(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.altText || "Gallery photo"}
              draggable={false}
              className={styles.thumb}
            />
            <span className={styles.position}>{index + 1}</span>
            <span className={styles.controls}>
              <button
                type="button"
                className="button"
                onClick={() => move(index, index - 1)}
                aria-disabled={index === 0}
                aria-label={`Move photo ${index + 1} earlier`}
              >
                ←
              </button>
              <button
                type="button"
                className="button"
                onClick={() => move(index, index + 1)}
                aria-disabled={index === ordered.length - 1}
                aria-label={`Move photo ${index + 1} later`}
              >
                →
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className={styles.actions}>
        <button className="button primary" type="submit" disabled={!changed}>
          Save gallery order
        </button>
        <button
          className="button"
          type="button"
          disabled={!changed}
          onClick={() => {
            setOrder(items.map((item) => item.id));
            setAnnouncement("Gallery order reset to the saved order.");
          }}
        >
          Undo changes
        </button>
      </div>
    </form>
  );
}
