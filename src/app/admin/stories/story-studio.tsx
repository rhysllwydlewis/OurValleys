"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  StoryArticle,
  type StoryArticleLabels,
} from "@/components/stories/story-article";
import type { AdminStory } from "@/modules/stories/admin";
import {
  STORY_BODY_MAX,
  STORY_SUMMARY_MAX,
  STORY_TITLE_MAX,
  assessStory,
  readingMinutes,
  slugFromTitle,
} from "@/modules/stories/model";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import {
  archiveStoryAction,
  createStoryAction,
  publishStoryAction,
  revertStoryToDraftAction,
  updateStoryAction,
} from "./actions";
import studio from "./story-studio.module.css";

type PlaceOption = { id: string; canonicalName: string };

type FormState = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  titleCy: string;
  summaryCy: string;
  bodyCy: string;
  authorName: string;
  placeId: string;
  sponsorshipDisclosure: string;
};

function toFormState(story: AdminStory | null): FormState {
  return {
    title: story?.title ?? "",
    slug: story?.slug ?? "",
    summary: story?.summary ?? "",
    body: story?.body ?? "",
    titleCy: story?.titleCy ?? "",
    summaryCy: story?.summaryCy ?? "",
    bodyCy: story?.bodyCy ?? "",
    authorName: story?.authorName ?? "OurValleys team",
    placeId: story?.placeId ?? "",
    sponsorshipDisclosure: story?.sponsorshipDisclosure ?? "",
  };
}

type Tab = "english" | "welsh" | "preview";

export function StoryStudio({
  story,
  places,
  labels,
  notice,
}: {
  story: AdminStory | null;
  places: PlaceOption[];
  /** Preview labels in English, resolved on the server. */
  labels: StoryArticleLabels;
  notice?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(story));
  const [saved, setSaved] = useState<FormState>(() => toFormState(story));
  const [updatedAt, setUpdatedAt] = useState(
    story ? story.updatedAt.toISOString() : null,
  );
  const [slugTouched, setSlugTouched] = useState(story !== null);
  const [tab, setTab] = useState<Tab>("english");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(notice ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const status = story?.status ?? "draft";
  const assessment = useMemo(
    () => assessStory({ ...form, placeId: form.placeId || null }),
    [form],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function payload() {
    return {
      ...form,
      placeId: form.placeId || null,
      sponsorshipDisclosure: form.sponsorshipDisclosure || null,
    };
  }

  async function onSave(event?: FormEvent): Promise<boolean> {
    event?.preventDefault();
    setPending(true);
    setErrors([]);
    setMessage("");
    try {
      const result = story
        ? await updateStoryAction({
            ...payload(),
            id: story.id,
            expectedUpdatedAt: updatedAt,
          })
        : await createStoryAction(payload());
      switch (result.status) {
        case "created":
          setSaved(form);
          router.replace(`/admin/stories/${result.id}?created=1`);
          return true;
        case "updated":
          setSaved(form);
          setUpdatedAt(result.updatedAt);
          setMessage("Saved.");
          router.refresh();
          return true;
        case "invalid":
          setErrors(result.issues);
          return false;
        case "duplicate_slug":
          setErrors(["Another story already uses that web address."]);
          return false;
        case "conflict":
          setErrors([
            "Someone else saved this story since you opened it. Reload the page to see their changes before saving again.",
          ]);
          return false;
        case "not_found":
          setErrors(["This story no longer exists."]);
          return false;
        case "forbidden":
          setErrors(["You do not have permission to do that."]);
          return false;
        default:
          setErrors(["Could not save just now. Try again in a moment."]);
          return false;
      }
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(
    action: (input: unknown) => Promise<string>,
    done: string,
    confirmText?: string,
  ) {
    if (!story) return;
    if (confirmText && !window.confirm(confirmText)) return;
    if (dirty && !(await onSave())) return;
    setPending(true);
    setErrors([]);
    try {
      const result = await action({ id: story.id });
      if (result === "updated") {
        setMessage(done);
        router.refresh();
      } else if (result === "not_ready") {
        setErrors([
          "Not ready to publish: it needs two paragraphs and a summary that differs from the headline.",
        ]);
      } else if (result === "conflict") {
        setErrors([
          "The story changed while it was being checked. Reload the page, read the new text, then publish.",
        ]);
      } else if (result === "forbidden") {
        setErrors(["You do not have permission to do that."]);
      } else {
        setErrors(["Could not update the story. Try again."]);
      }
    } finally {
      setPending(false);
    }
  }

  const previewStory = {
    slug: form.slug || "preview",
    title: form.title || "Headline",
    summary: form.summary || "Summary",
    body: form.body || "Story text",
    sponsorshipDisclosure: form.sponsorshipDisclosure || null,
    place: null,
  };
  const live = status === "published";
  const takeDown =
    "This takes the story off the public site straight away. Continue?";

  return (
    <form className={studio.studio} onSubmit={onSave} noValidate>
      <div className={studio.topBar}>
        <h2 className={studio.heading}>
          {story ? "Edit story" : "Write a story"}
        </h2>
        <p>
          <span className={`${styles.pill} ${styles[statusTone(status)]}`}>
            {statusLabel(status)}
          </span>{" "}
          {dirty ? <span className={studio.dirty}>Unsaved changes</span> : null}
        </p>
      </div>
      <p>
        <Link href="/admin/stories">← All stories</Link>
      </p>

      <div role="status" className={message ? styles.feedback : undefined}>
        {message}
      </div>
      {errors.length > 0 ? (
        <div role="alert" className={styles.feedbackError}>
          <ul className={studio.errors}>
            {errors.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={studio.layout}>
        <div className={studio.main}>
          <div className={studio.tabs} role="tablist" aria-label="Story view">
            {(
              [
                ["english", "English"],
                ["welsh", "Welsh"],
                ["preview", "Preview"],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`story-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`story-panel-${id}`}
                className={studio.tab}
                onClick={() => setTab(id)}
              >
                {text}
              </button>
            ))}
          </div>

          <div
            className={studio.panel}
            role="tabpanel"
            id="story-panel-english"
            aria-labelledby="story-tab-english"
            hidden={tab !== "english"}
          >
            <fieldset className={studio.fieldset}>
              <legend>The story</legend>
              <div className={studio.field}>
                <label htmlFor="story-title">Headline</label>
                <input
                  id="story-title"
                  value={form.title}
                  maxLength={STORY_TITLE_MAX}
                  onChange={(event) => {
                    set("title", event.target.value);
                    if (!slugTouched) {
                      set("slug", slugFromTitle(event.target.value));
                    }
                  }}
                />
              </div>
              <div className={studio.field}>
                <label htmlFor="story-slug">Web address</label>
                <input
                  id="story-slug"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    set("slug", event.target.value);
                  }}
                  aria-describedby="story-slug-hint"
                />
                <p className={studio.hint} id="story-slug-hint">
                  /news/{form.slug || "your-headline"}. Lowercase letters,
                  numbers and hyphens. Changing it later breaks links already
                  shared.
                </p>
              </div>
              <div className={studio.field}>
                <label htmlFor="story-summary">Summary</label>
                <textarea
                  id="story-summary"
                  value={form.summary}
                  maxLength={STORY_SUMMARY_MAX}
                  onChange={(event) => set("summary", event.target.value)}
                  aria-describedby="story-summary-hint"
                />
                <p className={studio.counter} id="story-summary-hint">
                  {form.summary.length} of {STORY_SUMMARY_MAX}. Shown in lists
                  and when the story is shared.
                </p>
              </div>
              <div className={studio.field}>
                <label htmlFor="story-body">Story text</label>
                <textarea
                  id="story-body"
                  className={studio.bodyArea}
                  value={form.body}
                  maxLength={STORY_BODY_MAX}
                  onChange={(event) => set("body", event.target.value)}
                  aria-describedby="story-body-hint"
                />
                <p className={studio.hint} id="story-body-hint">
                  Plain text. Leave a blank line between paragraphs and start a
                  line with “## ” for a sub-heading. About{" "}
                  {readingMinutes(form.body)} minute
                  {readingMinutes(form.body) === 1 ? "" : "s"} to read.
                </p>
              </div>
            </fieldset>
            <fieldset className={studio.fieldset}>
              <legend>Details</legend>
              <div className={studio.twoUp}>
                <div className={studio.field}>
                  <label htmlFor="story-author">Author</label>
                  <input
                    id="story-author"
                    value={form.authorName}
                    maxLength={120}
                    onChange={(event) => set("authorName", event.target.value)}
                  />
                </div>
                <div className={studio.field}>
                  <label htmlFor="story-place">Place</label>
                  <select
                    id="story-place"
                    value={form.placeId}
                    onChange={(event) => set("placeId", event.target.value)}
                  >
                    <option value="">No particular place</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.canonicalName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={studio.field}>
                <label htmlFor="story-sponsored">
                  Sponsorship note (optional)
                </label>
                <input
                  id="story-sponsored"
                  value={form.sponsorshipDisclosure}
                  maxLength={300}
                  onChange={(event) =>
                    set("sponsorshipDisclosure", event.target.value)
                  }
                  aria-describedby="story-sponsored-hint"
                />
                <p className={studio.hint} id="story-sponsored-hint">
                  If anyone paid for or supplied this story, say so here. It is
                  shown above the text with a “Sponsored” label.
                </p>
              </div>
            </fieldset>
          </div>

          <div
            className={studio.panel}
            role="tabpanel"
            id="story-panel-welsh"
            aria-labelledby="story-tab-welsh"
            hidden={tab !== "welsh"}
          >
            <fieldset className={studio.fieldset}>
              <legend>Welsh version</legend>
              <p className={studio.hint}>
                Welsh readers see this version only when the headline, summary
                and text are all written. Until then they see the English story
                with a note. The sponsorship note and place are shared with the
                English version.
              </p>
              <div className={studio.field}>
                <label htmlFor="story-title-cy">Welsh headline</label>
                <input
                  id="story-title-cy"
                  lang="cy"
                  value={form.titleCy}
                  maxLength={STORY_TITLE_MAX}
                  onChange={(event) => set("titleCy", event.target.value)}
                />
              </div>
              <div className={studio.field}>
                <label htmlFor="story-summary-cy">Welsh summary</label>
                <textarea
                  id="story-summary-cy"
                  lang="cy"
                  value={form.summaryCy}
                  maxLength={STORY_SUMMARY_MAX}
                  onChange={(event) => set("summaryCy", event.target.value)}
                />
              </div>
              <div className={studio.field}>
                <label htmlFor="story-body-cy">Welsh story text</label>
                <textarea
                  id="story-body-cy"
                  lang="cy"
                  className={studio.bodyArea}
                  value={form.bodyCy}
                  maxLength={STORY_BODY_MAX}
                  onChange={(event) => set("bodyCy", event.target.value)}
                />
              </div>
              <details>
                <summary>English text for reference</summary>
                <p lang="en">
                  <strong>{form.title}</strong>
                </p>
                <p lang="en">{form.summary}</p>
                <p lang="en" style={{ whiteSpace: "pre-wrap" }}>
                  {form.body}
                </p>
              </details>
            </fieldset>
          </div>

          <div
            className={studio.panel}
            role="tabpanel"
            id="story-panel-preview"
            aria-labelledby="story-tab-preview"
            hidden={tab !== "preview"}
          >
            <div className={studio.preview}>
              <StoryArticle
                story={previewStory}
                labels={{
                  ...labels,
                  by: `By ${form.authorName || "…"}`,
                  readingTime: `${readingMinutes(form.body)} min read`,
                }}
                preview
              />
            </div>
          </div>
        </div>

        <aside className={studio.side} aria-label="Publishing">
          <div className={`${studio.sideCard} ov-glass`}>
            <h3>Before publishing</h3>
            <ul className={studio.checks}>
              {assessment.checks.map((check) => (
                <li
                  key={check.id}
                  className={check.ok ? studio.checkOk : studio.checkTodo}
                >
                  <span aria-hidden="true">{check.ok ? "✓" : "○"}</span>
                  <span>
                    {check.label}
                    <span className="sr-only">
                      {check.ok ? " — done" : " — still to do"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className={studio.hint}>
              The first two are required. A place and a Welsh version are
              recommended.
            </p>
          </div>
          <div className={`${studio.sideCard} ov-glass`}>
            <div className={studio.stack}>
              <button
                className="button primary"
                type="submit"
                disabled={pending}
              >
                {pending ? "Working…" : "Save"}
              </button>
              {story && !live ? (
                <button
                  className="button"
                  type="button"
                  disabled={pending || !assessment.canPublish}
                  onClick={() => changeStatus(publishStoryAction, "Published.")}
                >
                  Publish
                </button>
              ) : null}
              {story && live ? (
                <button
                  className="button"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    changeStatus(
                      revertStoryToDraftAction,
                      "Moved to draft.",
                      takeDown,
                    )
                  }
                >
                  Move to draft
                </button>
              ) : null}
              {story && status !== "archived" ? (
                <button
                  className={`button ${styles.buttonDanger}`}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    changeStatus(
                      archiveStoryAction,
                      "Archived.",
                      live ? takeDown : undefined,
                    )
                  }
                >
                  Archive
                </button>
              ) : null}
              {live ? (
                <Link className="button" href={`/news/${story?.slug}`}>
                  View on the site
                </Link>
              ) : null}
            </div>
            {!story ? (
              <p className={studio.hint}>
                Save the story first; then you can preview it and publish.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </form>
  );
}
