"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { AdminPlace } from "@/modules/reference-data/admin-places";
import styles from "../admin.module.css";
import { createPlaceAction, updatePlaceAction } from "./actions";

function PlaceEditForm({
  place,
  onDone,
}: {
  place: AdminPlace;
  onDone: () => void;
}) {
  const router = useRouter();
  const [canonicalName, setCanonicalName] = useState(place.canonicalName);
  const [welshName, setWelshName] = useState(place.welshName ?? "");
  const [slug, setSlug] = useState(place.slug);
  const [placeType, setPlaceType] = useState(place.placeType);
  const [coverageStatus, setCoverageStatus] = useState(place.coverageStatus);
  const [editorialSummary, setEditorialSummary] = useState(
    place.editorialSummary,
  );
  const [status, setStatus] = useState(place.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await updatePlaceAction({
        id: place.id,
        canonicalName,
        welshName,
        slug,
        placeType,
        coverageStatus,
        editorialSummary,
        status,
      });
      if (result.status === "updated") {
        router.refresh();
        onDone();
      } else if (result.status === "duplicate_slug") {
        setError("That slug is already in use.");
      } else {
        setError("Could not save. Check the fields and try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor={`name-${place.id}`}>Canonical name</label>
      <input
        id={`name-${place.id}`}
        value={canonicalName}
        onChange={(event) => setCanonicalName(event.target.value)}
      />
      <label htmlFor={`welsh-${place.id}`}>Welsh name</label>
      <input
        id={`welsh-${place.id}`}
        value={welshName}
        onChange={(event) => setWelshName(event.target.value)}
      />
      <label htmlFor={`slug-${place.id}`}>Slug</label>
      <input
        id={`slug-${place.id}`}
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
      />
      <label htmlFor={`type-${place.id}`}>Place type</label>
      <input
        id={`type-${place.id}`}
        value={placeType}
        onChange={(event) => setPlaceType(event.target.value)}
      />
      <label htmlFor={`coverage-${place.id}`}>Coverage status</label>
      <select
        id={`coverage-${place.id}`}
        value={coverageStatus}
        onChange={(event) => setCoverageStatus(event.target.value)}
      >
        <option value="seeding">Seeding</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
      </select>
      <label htmlFor={`summary-${place.id}`}>Editorial summary</label>
      <textarea
        id={`summary-${place.id}`}
        value={editorialSummary}
        onChange={(event) => setEditorialSummary(event.target.value)}
      />
      <label htmlFor={`status-${place.id}`}>Status</label>
      <select
        id={`status-${place.id}`}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      <div className={styles.actionsRow}>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button className="button" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CreatePlaceForm() {
  const router = useRouter();
  const [canonicalName, setCanonicalName] = useState("");
  const [welshName, setWelshName] = useState("");
  const [slug, setSlug] = useState("");
  const [placeType, setPlaceType] = useState("town");
  const [editorialSummary, setEditorialSummary] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await createPlaceAction({
        canonicalName,
        welshName,
        slug,
        placeType,
        editorialSummary,
      });
      if (result.status === "created") {
        setCanonicalName("");
        setWelshName("");
        setSlug("");
        setEditorialSummary("");
        router.refresh();
      } else if (result.status === "duplicate_slug") {
        setError("That slug is already in use.");
      } else {
        setError("Could not create the place. Check the fields.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor="new-place-name">Canonical name</label>
      <input
        id="new-place-name"
        value={canonicalName}
        onChange={(event) => setCanonicalName(event.target.value)}
        required
      />
      <label htmlFor="new-place-welsh">Welsh name (optional)</label>
      <input
        id="new-place-welsh"
        value={welshName}
        onChange={(event) => setWelshName(event.target.value)}
      />
      <label htmlFor="new-place-slug">Slug</label>
      <input
        id="new-place-slug"
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        placeholder="e.g. pontypridd"
        required
      />
      <label htmlFor="new-place-type">Place type</label>
      <input
        id="new-place-type"
        value={placeType}
        onChange={(event) => setPlaceType(event.target.value)}
        required
      />
      <label htmlFor="new-place-summary">Editorial summary</label>
      <textarea
        id="new-place-summary"
        value={editorialSummary}
        onChange={(event) => setEditorialSummary(event.target.value)}
        required
      />
      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      <div className={styles.actionsRow}>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Add place"}
        </button>
      </div>
    </form>
  );
}

export function PlaceManager({ places }: { places: AdminPlace[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Coverage</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {places.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td colSpan={5}>
                    <PlaceEditForm
                      place={item}
                      onDone={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>{item.canonicalName}</td>
                  <td>{item.slug}</td>
                  <td>{item.coverageStatus}</td>
                  <td>{item.status}</td>
                  <td>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setEditingId(item.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className={`${styles.card} ${styles.spaced}`}>
        <h3>Add a place</h3>
        <CreatePlaceForm />
      </div>
    </>
  );
}
