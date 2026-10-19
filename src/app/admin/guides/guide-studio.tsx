"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  GuideArticle,
  fillLabel,
  type GuideArticleLabels,
} from "@/components/guides/guide-article";
import type { AdminGuide } from "@/modules/guides/admin";
import {
  assessGuideReadiness,
  estimateReadingMinutes,
  newSectionId,
  readingTimeLabel,
} from "@/modules/guides/guide-model";
import type { GuideSectionKind, GuideStatus } from "@/modules/guides/shared";
import styles from "../admin.module.css";
import {
  archiveGuideAction,
  createGuideAction,
  publishGuideAction,
  revertGuideToDraftAction,
  updateGuideAction,
} from "./actions";
import studio from "./guide-studio.module.css";
import { readinessMessage } from "./readiness-copy";
import { SectionEditor, type EditableSection } from "./section-editor";

type PlaceOption = { id: string; canonicalName: string };

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
  sections: EditableSection[];
};

function blankSection(kind: GuideSectionKind = "text"): EditableSection {
  return {
    id: newSectionId(),
    kind,
    heading: "",
    body: "",
    href: "",
    linkLabel: "",
  };
}

function toFormState(guide: AdminGuide | null): FormState {
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
    sections: guide?.sections.length
      ? guide.sections.map((section) => ({ ...section }))
      : [blankSection()],
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

type Feedback = { tone: "ok" | "error"; message: string; issues?: string[] };

const tabs = [
  { id: "edit", label: "Write" },
  { id: "preview", label: "Preview" },
] as const;

export function GuideStudio({
  guide,
  places,
  labels,
  byTemplate,
  notice,
}: {
  guide: AdminGuide | null;
  /** Shown on arrival, such as after the guide was created. */
  notice?: string;
  places: PlaceOption[];
  labels: GuideArticleLabels;
  byTemplate: string;
}) {
  const router = useRouter();
  const [initial] = useState<FormState>(() => toFormState(guide));
  const [form, setForm] = useState<FormState>(initial);
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial));
  const [guideId, setGuideId] = useState<string | null>(guide?.id ?? null);
  const [status, setStatus] = useState<GuideStatus>(guide?.status ?? "draft");
  const [loadedAt, setLoadedAt] = useState<string | null>(
    guide ? guide.updatedAt.toISOString() : null,
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(guide));
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("edit");
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(
    notice ? { tone: "ok", message: notice } : null,
  );
  const [announcement, setAnnouncement] = useState("");
  const [conflict, setConflict] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(form) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const readiness = useMemo(
    () =>
      assessGuideReadiness({
        summary: form.summary,
        readingTime: form.readingTime,
        placeId: form.placeId || null,
        reviewDueAt: form.reviewDueAt || null,
        sections: form.sections,
      }),
    [form],
  );
  const suggestedMinutes = estimateReadingMinutes({
    summary: form.summary,
    sections: form.sections,
  });
  const blockersLeft = readiness.checks.filter(
    (check) => check.level === "blocker" && !check.ok,
  ).length;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function show(next: Feedback) {
    setFeedback(next);
    queueMicrotask(() => feedbackRef.current?.focus());
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setPending("save");
    setFeedback(null);
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
      const result = guideId
        ? await updateGuideAction({
            ...payload,
            id: guideId,
            expectedUpdatedAt: loadedAt ?? undefined,
          })
        : await createGuideAction(payload);

      if (result.status === "created" || result.status === "updated") {
        setSaved(JSON.stringify(form));
        setLoadedAt(result.updatedAt);
        show({ tone: "ok", message: "Saved." });
        if (result.status === "created") {
          setGuideId(result.id);
          router.replace(`/admin/guides/${result.id}?created=1`);
        } else {
          router.refresh();
        }
      } else if (result.status === "invalid") {
        show({
          tone: "error",
          message: "Not saved. Fix these and try again:",
          issues: result.issues,
        });
      } else if (result.status === "duplicate_slug") {
        show({
          tone: "error",
          message: "Not saved: another guide already uses that web address.",
        });
      } else if (result.status === "conflict") {
        setConflict(true);
        show({
          tone: "error",
          message:
            "Not saved: someone else saved this guide after you opened it. Reload to see their version, then re-apply your edits.",
        });
      } else if (result.status === "not_found") {
        show({ tone: "error", message: "This guide no longer exists." });
      } else if (result.status === "forbidden") {
        show({
          tone: "error",
          message: "You do not have permission to edit guides.",
        });
      } else {
        show({
          tone: "error",
          message:
            "Could not save just now. Your edits are still here: try again.",
        });
      }
    } finally {
      setPending(null);
    }
  }

  async function changeStatus(
    kind: "publish" | "draft" | "archive",
  ): Promise<void> {
    if (!guideId) return;
    setPending(kind);
    setFeedback(null);
    try {
      const action =
        kind === "publish"
          ? publishGuideAction
          : kind === "archive"
            ? archiveGuideAction
            : revertGuideToDraftAction;
      const result = await action({ id: guideId });
      if (result === "updated") {
        setStatus(
          kind === "publish"
            ? "published"
            : kind === "archive"
              ? "archived"
              : "draft",
        );
        show({
          tone: "ok",
          message:
            kind === "publish"
              ? "Published. Readers can see it now."
              : kind === "archive"
                ? "Archived. It is no longer public."
                : "Moved to draft. It is no longer public.",
        });
        router.refresh();
      } else if (result === "not_ready") {
        show({
          tone: "error",
          message:
            "Not published: the saved version does not pass the publishing checks. Save your edits, then check the list.",
        });
      } else if (result === "forbidden") {
        show({
          tone: "error",
          message: "You do not have permission to do that.",
        });
      } else {
        show({ tone: "error", message: "That did not work. Try again." });
      }
    } finally {
      setPending(null);
    }
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
      tabs.length;
    const target = tabs[next];
    if (!target) return;
    setTab(target.id);
    document.getElementById(`guide-tab-${target.id}`)?.focus();
  }

  const previewGuide = {
    slug: form.slug || "preview",
    title: form.title || "Untitled guide",
    summary: form.summary,
    area: form.areaLabel,
    readingTime: form.readingTime,
    authorName: form.authorName,
    sponsorshipDisclosure: form.sponsorshipDisclosure || null,
    sections: form.sections.map((section) => ({
      ...section,
      heading: section.heading || "Untitled section",
    })),
    place: null,
  };
  const previewLabels: GuideArticleLabels = {
    ...labels,
    by: fillLabel(byTemplate, { name: form.authorName || "the author" }),
  };

  const blockers = readiness.checks.filter(
    (check) => check.level === "blocker",
  );
  const advice = readiness.checks.filter((check) => check.level === "advice");

  return (
    <div className={studio.studio}>
      <div className={studio.topBar}>
        <div>
          <p className={styles.eyebrow}>
            <Link href="/admin/guides">Guides</Link> /{" "}
            {guideId ? "Edit" : "New guide"}
          </p>
          <h2 className={studio.heading}>{form.title || "New guide"}</h2>
        </div>
        <div className={studio.statusRow}>
          <span
            className={`${styles.pill} ${
              status === "published" ? styles.toneSuccess : styles.toneNeutral
            }`}
          >
            {status === "published"
              ? "Published"
              : status === "archived"
                ? "Archived"
                : "Draft"}
          </span>
          {dirty ? (
            <span className={studio.dirty} role="status">
              Unsaved changes
            </span>
          ) : null}
        </div>
      </div>

      <div className={studio.layout}>
        <form onSubmit={save} className={studio.main} noValidate>
          <div role="tablist" aria-label="Guide editor" className={studio.tabs}>
            {tabs.map((item, index) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                id={`guide-tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`guide-panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                className={studio.tab}
                onClick={() => setTab(item.id)}
                onKeyDown={(event) => onTabKey(event, index)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id="guide-panel-edit"
            aria-labelledby="guide-tab-edit"
            hidden={tab !== "edit"}
            className={studio.panel}
          >
            <fieldset className={studio.fieldset}>
              <legend>About the guide</legend>
              <div className={studio.field}>
                <label htmlFor="guide-title">Title</label>
                <input
                  id="guide-title"
                  value={form.title}
                  maxLength={160}
                  onChange={(event) => {
                    const title = event.target.value;
                    setForm((current) => ({
                      ...current,
                      title,
                      slug: slugTouched ? current.slug : slugify(title),
                    }));
                  }}
                />
              </div>
              <div className={studio.field}>
                <label htmlFor="guide-slug">Web address</label>
                <div className={studio.slugRow}>
                  <span aria-hidden="true">/guides/</span>
                  <input
                    id="guide-slug"
                    value={form.slug}
                    maxLength={120}
                    spellCheck={false}
                    aria-describedby="guide-slug-hint"
                    onChange={(event) => {
                      setSlugTouched(true);
                      set("slug", event.target.value);
                    }}
                  />
                </div>
                <p className={studio.hint} id="guide-slug-hint">
                  Lowercase letters, numbers and hyphens.
                  {status === "published"
                    ? " Changing it breaks links to the published guide."
                    : ""}
                </p>
              </div>
              <div className={studio.field}>
                <label htmlFor="guide-summary">Summary</label>
                <textarea
                  id="guide-summary"
                  value={form.summary}
                  rows={3}
                  maxLength={500}
                  aria-describedby="guide-summary-hint"
                  onChange={(event) => set("summary", event.target.value)}
                />
                <p className={studio.hint} id="guide-summary-hint">
                  Shown under the title and in search results.{" "}
                  {form.summary.length}/500
                </p>
              </div>
              <div className={studio.twoUp}>
                <div className={studio.field}>
                  <label htmlFor="guide-area">Area</label>
                  <input
                    id="guide-area"
                    value={form.areaLabel}
                    maxLength={120}
                    placeholder="Across Rhondda Cynon Taf"
                    onChange={(event) => set("areaLabel", event.target.value)}
                  />
                </div>
                <div className={studio.field}>
                  <label htmlFor="guide-place">Linked place (optional)</label>
                  <select
                    id="guide-place"
                    value={form.placeId}
                    onChange={(event) => set("placeId", event.target.value)}
                  >
                    <option value="">No specific place</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.canonicalName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={studio.twoUp}>
                <div className={studio.field}>
                  <label htmlFor="guide-author">Author</label>
                  <input
                    id="guide-author"
                    value={form.authorName}
                    maxLength={120}
                    onChange={(event) => set("authorName", event.target.value)}
                  />
                </div>
                <div className={studio.field}>
                  <label htmlFor="guide-reading">Reading time</label>
                  <input
                    id="guide-reading"
                    value={form.readingTime}
                    maxLength={60}
                    placeholder={readingTimeLabel(suggestedMinutes)}
                    aria-describedby="guide-reading-hint"
                    onChange={(event) => set("readingTime", event.target.value)}
                  />
                  <p className={studio.hint} id="guide-reading-hint">
                    About {suggestedMinutes}{" "}
                    {suggestedMinutes === 1 ? "minute" : "minutes"} at this
                    length.{" "}
                    <button
                      type="button"
                      className={studio.linkButton}
                      onClick={() =>
                        set("readingTime", readingTimeLabel(suggestedMinutes))
                      }
                    >
                      Use “{readingTimeLabel(suggestedMinutes)}”
                    </button>
                  </p>
                </div>
              </div>
              <div className={studio.twoUp}>
                <div className={studio.field}>
                  <label htmlFor="guide-review">Review by</label>
                  <input
                    id="guide-review"
                    type="date"
                    value={form.reviewDueAt}
                    onChange={(event) => set("reviewDueAt", event.target.value)}
                  />
                </div>
                <div className={studio.field}>
                  <label htmlFor="guide-sponsorship">
                    Sponsorship disclosure (optional)
                  </label>
                  <textarea
                    id="guide-sponsorship"
                    value={form.sponsorshipDisclosure}
                    rows={2}
                    maxLength={300}
                    placeholder="Shown to readers when a paid feature is included."
                    onChange={(event) =>
                      set("sponsorshipDisclosure", event.target.value)
                    }
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className={studio.fieldset}>
              <legend>Sections</legend>
              <SectionEditor
                sections={form.sections}
                onChange={(next) => set("sections", next)}
                onAnnounce={setAnnouncement}
                onAdd={(kind) => {
                  const added = blankSection(kind);
                  set("sections", [...form.sections, added]);
                  setAnnouncement(`Added section ${form.sections.length + 1}.`);
                  queueMicrotask(() =>
                    document
                      .getElementById(`section-${added.id}-heading`)
                      ?.focus(),
                  );
                }}
              />
            </fieldset>
          </div>

          <div
            role="tabpanel"
            id="guide-panel-preview"
            aria-labelledby="guide-tab-preview"
            hidden={tab !== "preview"}
            className={`${studio.panel} ${studio.preview}`}
          >
            <p className={studio.hint}>
              This is how the guide reads on the public site, with your unsaved
              edits. Links do not open from here.
            </p>
            <GuideArticle
              guide={previewGuide}
              labels={previewLabels}
              lang="en-GB"
              preview
            />
          </div>

          <div ref={feedbackRef} tabIndex={-1} className={studio.feedbackSlot}>
            {feedback ? (
              <div
                className={
                  feedback.tone === "ok"
                    ? styles.feedback
                    : styles.feedbackError
                }
                role={feedback.tone === "ok" ? "status" : "alert"}
              >
                <p>{feedback.message}</p>
                {feedback.issues ? (
                  <ul>
                    {feedback.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                {conflict ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => window.location.reload()}
                  >
                    Reload this guide
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={studio.saveBar}>
            <button
              className="button primary"
              type="submit"
              disabled={pending !== null || (!dirty && Boolean(guideId))}
            >
              {pending === "save"
                ? "Saving…"
                : guideId
                  ? "Save changes"
                  : "Create guide"}
            </button>
            {dirty && guideId ? (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setForm(JSON.parse(saved) as FormState);
                  setFeedback(null);
                }}
              >
                Discard edits
              </button>
            ) : null}
          </div>
        </form>

        <aside className={studio.side} aria-label="Publishing">
          <section className={`${studio.sideCard} ov-glass`}>
            <h3>Before publishing</h3>
            <p className={studio.sideLead}>
              {blockersLeft === 0
                ? "Every required check passes."
                : `${blockersLeft} required ${blockersLeft === 1 ? "check needs" : "checks need"} attention.`}
            </p>
            <ul className={studio.checks}>
              {blockers.map((check) => {
                const message = readinessMessage(check);
                return (
                  <li
                    key={check.key}
                    className={check.ok ? studio.checkOk : studio.checkTodo}
                  >
                    <span aria-hidden="true">{check.ok ? "✓" : "○"}</span>
                    <span>
                      <span className={studio.srOnly}>
                        {check.ok ? "Done: " : "To do: "}
                      </span>
                      {check.ok ? message.done : message.todo}
                    </span>
                  </li>
                );
              })}
            </ul>
            <h4>Worth doing</h4>
            <ul className={studio.checks}>
              {advice.map((check) => {
                const message = readinessMessage(check);
                return (
                  <li
                    key={check.key}
                    className={check.ok ? studio.checkOk : studio.checkAdvice}
                  >
                    <span aria-hidden="true">{check.ok ? "✓" : "–"}</span>
                    <span>
                      <span className={studio.srOnly}>
                        {check.ok ? "Done: " : "Suggestion: "}
                      </span>
                      {check.ok ? message.done : message.todo}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {guideId ? (
            <section className={`${studio.sideCard} ov-glass`}>
              <h3>Publication</h3>
              {dirty ? (
                <p className={studio.hint}>
                  Save your edits first: publishing uses the saved version.
                </p>
              ) : null}
              <div className={studio.stack}>
                {status === "published" ? (
                  <>
                    <Link
                      className="button primary"
                      href={`/guides/${form.slug}`}
                      target="_blank"
                      rel="noopener"
                    >
                      View on the site
                    </Link>
                    <button
                      className="button"
                      type="button"
                      disabled={pending !== null}
                      onClick={() => changeStatus("draft")}
                    >
                      Move to draft
                    </button>
                  </>
                ) : (
                  <button
                    className="button primary"
                    type="button"
                    disabled={
                      pending !== null || dirty || !readiness.canPublish
                    }
                    onClick={() => changeStatus("publish")}
                  >
                    {pending === "publish" ? "Publishing…" : "Publish"}
                  </button>
                )}
                {status === "archived" ? (
                  <button
                    className="button"
                    type="button"
                    disabled={pending !== null}
                    onClick={() => changeStatus("draft")}
                  >
                    Restore to draft
                  </button>
                ) : (
                  <button
                    className={`button ${studio.danger}`}
                    type="button"
                    disabled={pending !== null}
                    onClick={() => changeStatus("archive")}
                  >
                    Archive
                  </button>
                )}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
      <p className={studio.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
