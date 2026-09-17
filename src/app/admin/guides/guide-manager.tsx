"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { AdminGuide } from "@/modules/guides/admin";
import type { GuideSection } from "@/modules/guides/shared";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import {
  archiveGuideAction,
  createGuideAction,
  publishGuideAction,
  revertGuideToDraftAction,
  updateGuideAction,
} from "./actions";

type PlaceOption = { id: string; canonicalName: string };

const emptySection: GuideSection = {
  heading: "",
  body: "",
  href: "",
  linkLabel: "",
};

type FormState = {
  title: string;
  slug: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  authorName: string;
  placeId: string;
  sponsorshipDisclosure: string;
  reviewDueAt: string;
  sections: GuideSection[];
};

function toFormState(guide?: AdminGuide): FormState {
  return {
    title: guide?.title ?? "",
    slug: guide?.slug ?? "",
    summary: guide?.summary ?? "",
    areaLabel: guide?.areaLabel ?? "",
    readingTime: guide?.readingTime ?? "",
    authorName: guide?.authorName ?? "",
    placeId: guide?.placeId ?? "",
    sponsorshipDisclosure: guide?.sponsorshipDisclosure ?? "",
    reviewDueAt: guide?.reviewDueAt
      ? guide.reviewDueAt.toISOString().slice(0, 10)
      : "",
    sections: guide?.sections.length ? guide.sections : [{ ...emptySection }],
  };
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

function GuideForm({
  guide,
  places,
  onDone,
}: {
  guide?: AdminGuide;
  places: PlaceOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(guide));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSection(
    index: number,
    field: keyof GuideSection,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section,
      ),
    }));
  }

  function addSection() {
    setForm((current) => ({
      ...current,
      sections: [...current.sections, { ...emptySection }],
    }));
  }

  function removeSection(index: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter(
        (_, sectionIndex) => sectionIndex !== index,
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        areaLabel: form.areaLabel,
        readingTime: form.readingTime,
        authorName: form.authorName,
        placeId: form.placeId || undefined,
        sponsorshipDisclosure: form.sponsorshipDisclosure || undefined,
        reviewDueAt: form.reviewDueAt || undefined,
        sections: form.sections,
      };
      const result = guide
        ? await updateGuideAction({ ...payload, id: guide.id })
        : await createGuideAction(payload);

      if (result.status === "created" || result.status === "updated") {
        router.refresh();
        onDone();
      } else if (result.status === "duplicate_slug") {
        setError("That slug is already in use.");
      } else if (result.status === "forbidden") {
        setError("You do not have permission to do that.");
      } else {
        setError("Could not save. Check the fields and try again.");
      }
    } finally {
      setPending(false);
    }
  }

  const idPrefix = guide?.id ?? "new";

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <label htmlFor={`${idPrefix}-title`}>Title</label>
      <input
        id={`${idPrefix}-title`}
        value={form.title}
        onChange={(event) =>
          setForm((current) => ({ ...current, title: event.target.value }))
        }
        required
      />
      <label htmlFor={`${idPrefix}-slug`}>Slug</label>
      <input
        id={`${idPrefix}-slug`}
        value={form.slug}
        onChange={(event) =>
          setForm((current) => ({ ...current, slug: event.target.value }))
        }
        placeholder="e.g. independent-coffee-across-the-valleys"
        required
      />
      <label htmlFor={`${idPrefix}-summary`}>Summary</label>
      <textarea
        id={`${idPrefix}-summary`}
        value={form.summary}
        onChange={(event) =>
          setForm((current) => ({ ...current, summary: event.target.value }))
        }
        required
      />
      <label htmlFor={`${idPrefix}-area`}>Area label</label>
      <input
        id={`${idPrefix}-area`}
        value={form.areaLabel}
        onChange={(event) =>
          setForm((current) => ({ ...current, areaLabel: event.target.value }))
        }
        placeholder="e.g. Across Rhondda Cynon Taf"
        required
      />
      <label htmlFor={`${idPrefix}-place`}>Linked place (optional)</label>
      <select
        id={`${idPrefix}-place`}
        value={form.placeId}
        onChange={(event) =>
          setForm((current) => ({ ...current, placeId: event.target.value }))
        }
      >
        <option value="">No specific place</option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.canonicalName}
          </option>
        ))}
      </select>
      <label htmlFor={`${idPrefix}-reading-time`}>Reading time</label>
      <input
        id={`${idPrefix}-reading-time`}
        value={form.readingTime}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            readingTime: event.target.value,
          }))
        }
        placeholder="e.g. 4 minute read"
        required
      />
      <label htmlFor={`${idPrefix}-author`}>Author</label>
      <input
        id={`${idPrefix}-author`}
        value={form.authorName}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            authorName: event.target.value,
          }))
        }
        required
      />
      <label htmlFor={`${idPrefix}-sponsorship`}>
        Sponsorship disclosure (optional)
      </label>
      <textarea
        id={`${idPrefix}-sponsorship`}
        value={form.sponsorshipDisclosure}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            sponsorshipDisclosure: event.target.value,
          }))
        }
        placeholder="Shown to readers if this guide includes a paid feature."
      />
      <label htmlFor={`${idPrefix}-review-due`}>Review due (optional)</label>
      <input
        id={`${idPrefix}-review-due`}
        type="date"
        value={form.reviewDueAt}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            reviewDueAt: event.target.value,
          }))
        }
      />

      <div className={styles.card}>
        <h3>Sections</h3>
        {form.sections.map((section, index) => (
          <div key={index} className={`${styles.card} ${styles.spaced}`}>
            <label htmlFor={`${idPrefix}-section-${index}-heading`}>
              Heading
            </label>
            <input
              id={`${idPrefix}-section-${index}-heading`}
              value={section.heading}
              onChange={(event) =>
                updateSection(index, "heading", event.target.value)
              }
              required
            />
            <label htmlFor={`${idPrefix}-section-${index}-body`}>Body</label>
            <textarea
              id={`${idPrefix}-section-${index}-body`}
              value={section.body}
              onChange={(event) =>
                updateSection(index, "body", event.target.value)
              }
              required
            />
            <label htmlFor={`${idPrefix}-section-${index}-href`}>
              Link (path starting with /)
            </label>
            <input
              id={`${idPrefix}-section-${index}-href`}
              value={section.href}
              onChange={(event) =>
                updateSection(index, "href", event.target.value)
              }
              placeholder="/businesses?q=coffee"
              required
            />
            <label htmlFor={`${idPrefix}-section-${index}-link-label`}>
              Link label
            </label>
            <input
              id={`${idPrefix}-section-${index}-link-label`}
              value={section.linkLabel}
              onChange={(event) =>
                updateSection(index, "linkLabel", event.target.value)
              }
              required
            />
            {form.sections.length > 1 ? (
              <div className={styles.actionsRow}>
                <button
                  className={`button ${styles.buttonDanger}`}
                  type="button"
                  onClick={() => removeSection(index)}
                >
                  Remove section
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {form.sections.length < 8 ? (
          <div className={styles.actionsRow}>
            <button className="button" type="button" onClick={addSection}>
              Add section
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      <div className={styles.actionsRow}>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : guide ? "Save changes" : "Create guide"}
        </button>
        {guide ? (
          <button className="button" type="button" onClick={onDone}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function GuideRowActions({
  guide,
  onChanged,
}: {
  guide: AdminGuide;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: (input: unknown) => Promise<string>, id: string) {
    setPending(true);
    try {
      const result = await action({ id });
      if (result === "updated") {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.actionsRow}>
      <button className="button" type="button" onClick={onChanged}>
        Edit
      </button>
      {guide.status !== "published" ? (
        <button
          className="button primary"
          type="button"
          disabled={pending}
          onClick={() => run(publishGuideAction, guide.id)}
        >
          Publish
        </button>
      ) : (
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => run(revertGuideToDraftAction, guide.id)}
        >
          Move to draft
        </button>
      )}
      {guide.status !== "archived" ? (
        <button
          className={`button ${styles.buttonDanger}`}
          type="button"
          disabled={pending}
          onClick={() => run(archiveGuideAction, guide.id)}
        >
          Archive
        </button>
      ) : (
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => run(revertGuideToDraftAction, guide.id)}
        >
          Restore to draft
        </button>
      )}
    </div>
  );
}

export function GuideManager({
  guides,
  places,
  overdueGuideIds,
}: {
  guides: AdminGuide[];
  places: PlaceOption[];
  overdueGuideIds: Set<string>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Area</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {guides.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td colSpan={5}>
                    <GuideForm
                      guide={item}
                      places={places}
                      onDone={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.areaLabel}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(item.status)]}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                    {overdueGuideIds.has(item.id) ? (
                      <span
                        className={`${styles.pill} ${styles.pillInline} ${styles.toneWarning}`}
                      >
                        Review overdue
                      </span>
                    ) : null}
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td>
                    <GuideRowActions
                      guide={item}
                      onChanged={() => setEditingId(item.id)}
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className={`${styles.card} ${styles.spaced}`}>
        {creating ? (
          <>
            <h3>New guide</h3>
            <GuideForm places={places} onDone={() => setCreating(false)} />
          </>
        ) : (
          <div className={styles.actionsRow}>
            <button
              className="button primary"
              type="button"
              onClick={() => setCreating(true)}
            >
              Add guide
            </button>
          </div>
        )}
      </div>
    </>
  );
}
