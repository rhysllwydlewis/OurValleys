import type { Route } from "next";
import Link from "next/link";
import { ShareControl } from "@/components/share-control";
import { parseStoryBody } from "@/modules/stories/model";
import styles from "./story-article.module.css";

/** Reader-facing text resolved to the reader's language by the page or studio. */
export type StoryArticleLabels = {
  eyebrow: string;
  by: string;
  published: string | null;
  updated: string | null;
  readingTime: string;
  sponsoredLabel: string;
  englishOnly: string | null;
  share: string;
  shareMessages: {
    shared: string;
    copied: string;
    cancelled: string;
    unavailable: string;
  };
  placeLink: string | null;
  allNews: string;
};

export type StoryArticleStory = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  sponsorshipDisclosure: string | null;
  place: { slug: string; name: string } | null;
};

/**
 * One local story. Text only: blocks are rendered as React text nodes, so
 * nothing the author types can become markup. `preview` drops the links and the
 * share control so the studio preview stays inert.
 */
export function StoryArticle({
  story,
  labels,
  contentLang,
  shareUrl,
  preview = false,
}: {
  story: StoryArticleStory;
  labels: StoryArticleLabels;
  /** The language of the story text, when it differs from the page. */
  contentLang?: string;
  shareUrl?: string;
  preview?: boolean;
}) {
  const blocks = parseStoryBody(story.body);
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{labels.eyebrow}</p>
        <h1 className={styles.title} lang={contentLang}>
          {story.title}
        </h1>
        <p className={styles.summary} lang={contentLang}>
          {story.summary}
        </p>
        <p className={styles.meta}>
          <span>{labels.by}</span>
          {labels.published ? <span>{labels.published}</span> : null}
          {labels.updated ? <span>{labels.updated}</span> : null}
          <span>{labels.readingTime}</span>
        </p>
        {story.sponsorshipDisclosure ? (
          <p className={styles.sponsored}>
            <strong>{labels.sponsoredLabel}:</strong>{" "}
            {story.sponsorshipDisclosure}
          </p>
        ) : null}
        {labels.englishOnly ? (
          <p className={styles.notice} role="note">
            {labels.englishOnly}
          </p>
        ) : null}
      </header>
      <div className={styles.body} lang={contentLang}>
        {blocks.map((block, index) =>
          block.kind === "heading" ? (
            <h2 key={index}>{block.text}</h2>
          ) : (
            <p key={index}>{block.text}</p>
          ),
        )}
      </div>
      {!preview ? (
        <footer className={styles.footer}>
          {story.place && labels.placeLink ? (
            <Link
              className="button"
              href={`/places/${story.place.slug}` as Route}
            >
              {labels.placeLink}
            </Link>
          ) : null}
          <Link className="button" href="/news">
            {labels.allNews}
          </Link>
          {shareUrl ? (
            <ShareControl
              title={story.title}
              url={shareUrl}
              label={labels.share}
              messages={labels.shareMessages}
            />
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
