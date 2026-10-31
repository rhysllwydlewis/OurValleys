"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  removeStoryPictureAction,
  revertStoryToDraftAction,
  scheduleStoryAction,
  setStoryPictureAction,
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

/** A `datetime-local` value (the browser's own time zone) for a stored instant. */
function toLocalInput(value: Date | null): string {
  if (!value) return "";
  const shifted = new Date(
    value.getTime() - value.getTimezoneOffset() * 60_000,
  );
  return shifted.toISOString().slice(0, 16);
}

const pictureMessages: Record<string, string> = {
  disabled: "Picture storage is not set up on this site yet.",
  not_found: "This story no longer exists, or has no picture.",
  unavailable: "Could not save the picture just now. Try again in a moment.",
  forbidden: "You do not have permission to do that.",
};

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
  // The latest saved version, readable straight after a save in the same click.
  const latestUpdatedAt = useRef(updatedAt);
  const [slugTouched, setSlugTouched] = useState(story !== null);
  const [tab, setTab] = useState<Tab>("english");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(notice ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState(() =>
    toLocalInput(story?.scheduledFor ?? null),
  );
  const [pictureAlt, setPictureAlt] = useState(story?.imageAlt ?? "");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const picturePreview = useMemo(
    () => (pictureFile ? URL.createObjectURL(pictureFile) : null),
    [pictureFile],
  );

  useEffect(() => {
    if (!picturePreview) return;
    return () => URL.revokeObjectURL(picturePreview);
  }, [picturePreview]);

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
            expectedUpdatedAt: latestUpdatedAt.current,
          })
        : await createStoryAction(payload());
      switch (result.status) {
        case "created":
          setSaved(form);
          router.replace(`/admin/stories/${result.id}?created=1`);
          return true;
        case "updated":
          setSaved(form);
          latestUpdatedAt.current = result.updatedAt;
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
    saveFirst = false,
  ) {
    if (!story) return;
    if (confirmText && !window.confirm(confirmText)) return;
    // Only publishing needs the pending edits saved first. Withdrawing a live
    // story must work even when its edits could not be saved while live; the
    // edits stay in the form so they can be saved as a draft afterwards.
    if (saveFirst && dirty && !(await onSave())) return;
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

  async function onSchedule() {
    if (!story) return;
    if (dirty && !(await onSave())) return;
    const at = new Date(scheduleAt);
    if (!scheduleAt || Number.isNaN(at.getTime())) {
      setErrors(["Choose a date and time for the story to go live."]);
      return;
    }
    setPending(true);
    setErrors([]);
    try {
      const result = await scheduleStoryAction({
        id: story.id,
        scheduledFor: at.toISOString(),
        expectedUpdatedAt: latestUpdatedAt.current ?? "",
      });
      if (result.status === "scheduled") {
        setMessage(
          `Scheduled for ${new Intl.DateTimeFormat("en-GB", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/London",
          }).format(at)} (UK time).`,
        );
        router.refresh();
      } else if (result.status === "invalid") {
        setErrors(result.issues);
      } else if (result.status === "not_ready") {
        setErrors([
          "Not ready to schedule: it needs two paragraphs and a summary that differs from the headline.",
        ]);
      } else if (result.status === "conflict") {
        setErrors([
          "The story changed while it was being checked. Reload the page, read the new text, then schedule it.",
        ]);
      } else if (result.status === "forbidden") {
        setErrors(["You do not have permission to do that."]);
      } else {
        setErrors(["Could not schedule the story. Try again."]);
      }
    } finally {
      setPending(false);
    }
  }

  async function onSavePicture() {
    if (!story) return;
    setPending(true);
    setErrors([]);
    setMessage("");
    try {
      const data = new FormData();
      data.set("id", story.id);
      data.set("imageAlt", pictureAlt);
      if (pictureFile) data.set("image", pictureFile);
      const result = await setStoryPictureAction(data);
      if (result.status === "saved") {
        setPictureFile(null);
        setMessage(pictureFile ? "Picture saved." : "Description saved.");
        router.refresh();
      } else if (result.status === "invalid") {
        setErrors([result.message]);
      } else {
        setErrors([
          pictureMessages[result.status] ?? pictureMessages.unavailable!,
        ]);
      }
    } finally {
      setPending(false);
    }
  }

  async function onRemovePicture() {
    if (!story || !window.confirm("Remove the picture from this story?"))
      return;
    setPending(true);
    setErrors([]);
    try {
      const result = await removeStoryPictureAction({ id: story.id });
      if (result.status === "removed") {
        setPictureAlt("");
        setPictureFile(null);
        setMessage("Picture removed.");
        router.refresh();
      } else {
        setErrors([
          pictureMessages[result.status] ?? pictureMessages.unavailable!,
        ]);
      }
    } finally {
      setPending(false);
    }
  }

  const shownPicture = picturePreview ?? story?.imageUrl ?? null;
  const previewStory = {
    image: shownPicture
      ? { url: shownPicture, alt: pictureAlt || "Picture description" }
      : null,
    slug: form.slug || "preview",
    title: form.title || "Headline",
    summary: form.summary || "Summary",
    body: form.body || "Story text",
    sponsorshipDisclosure: form.sponsorshipDisclosure || null,
    place: null,
  };
  const live = status === "published";
  const scheduled = status === "scheduled";
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
            <fieldset className={studio.fieldset}>
              <legend>Picture (optional)</legend>
              {story ? (
                <>
                  {shownPicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={studio.picture}
                      src={shownPicture}
                      alt={pictureAlt || "Picture description"}
                      width={640}
                      height={360}
                    />
                  ) : null}
                  <div className={studio.field}>
                    <label htmlFor="story-picture-file">
                      {story.imageUrl
                        ? "Replace the picture"
                        : "Choose a picture"}
                    </label>
                    <input
                      id="story-picture-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-describedby="story-picture-hint"
                      onChange={(event) =>
                        setPictureFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <p className={studio.hint} id="story-picture-hint">
                      JPEG, PNG or WebP, up to 5 MB. Wide pictures work best: it
                      is shown 16 to 9 and used when the story is shared.
                    </p>
                  </div>
                  <div className={studio.field}>
                    <label htmlFor="story-picture-alt">
                      Describe the picture
                    </label>
                    <input
                      id="story-picture-alt"
                      value={pictureAlt}
                      maxLength={300}
                      onChange={(event) => setPictureAlt(event.target.value)}
                      aria-describedby="story-picture-alt-hint"
                    />
                    <p className={studio.hint} id="story-picture-alt-hint">
                      For people using screen readers. Say what the picture
                      shows, not what it is called. Required.
                    </p>
                  </div>
                  <div className={studio.stack}>
                    <button
                      className="button"
                      type="button"
                      disabled={
                        pending ||
                        pictureAlt.trim().length < 3 ||
                        (!pictureFile && !story.imageUrl)
                      }
                      onClick={onSavePicture}
                    >
                      {pictureFile ? "Upload picture" : "Save description"}
                    </button>
                    {story.imageUrl ? (
                      <button
                        className={`button ${styles.buttonDanger}`}
                        type="button"
                        disabled={pending}
                        onClick={onRemovePicture}
                      >
                        Remove picture
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className={studio.hint}>
                  Save the story first; then you can add a picture.
                </p>
              )}
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
          {story && !live && status !== "archived" ? (
            <div className={`${studio.sideCard} ov-glass`}>
              <h3>Schedule</h3>
              <div className={studio.field}>
                <label htmlFor="story-schedule">Go live at</label>
                <input
                  id="story-schedule"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                  aria-describedby="story-schedule-hint"
                />
                <p className={studio.hint} id="story-schedule-hint">
                  In your device’s time zone, at least five minutes ahead and
                  within 180 days. The story goes live within a few minutes of
                  that time.
                </p>
              </div>
              {scheduled && story.scheduledFor ? (
                <p role="status">
                  Scheduled for{" "}
                  <strong>
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/London",
                    }).format(story.scheduledFor)}
                  </strong>{" "}
                  (UK time).
                </p>
              ) : null}
              <div className={studio.stack}>
                <button
                  className="button"
                  type="button"
                  disabled={pending || !assessment.canPublish || !scheduleAt}
                  onClick={onSchedule}
                >
                  {scheduled ? "Change time" : "Schedule"}
                </button>
                {scheduled ? (
                  <button
                    className="button"
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      changeStatus(
                        revertStoryToDraftAction,
                        "Schedule cancelled; the story is a draft.",
                      )
                    }
                  >
                    Cancel schedule
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
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
                  onClick={() =>
                    changeStatus(
                      publishStoryAction,
                      "Published.",
                      undefined,
                      true,
                    )
                  }
                >
                  {scheduled ? "Publish now" : "Publish"}
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
