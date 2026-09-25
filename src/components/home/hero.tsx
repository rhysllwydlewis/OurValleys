"use client";

import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./hero.module.css";

export type HeroCard = {
  id: "business" | "event" | "place" | "needs";
  eyebrow: string;
  title: string;
  meta: string;
  href: string;
  cta: string;
};

type PlaceOption = {
  slug: string;
  name: string;
};

type PhotoCredit = {
  label: string;
  sourceHref: string;
  licenceLabel: string;
  licenceHref: string;
};

type HeroProps = {
  cards: HeroCard[];
  places: PlaceOption[];
  photoCredit?: PhotoCredit;
};

const CYCLE_MS = 5200;
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function wrappedDelta(from: number, to: number, length: number): 1 | -1 {
  if (to === (from + 1) % length) return 1;
  if (to === (from - 1 + length) % length) return -1;
  return to > from ? 1 : -1;
}

function subscribeReduceMotion(callback: () => void) {
  const query = window.matchMedia(REDUCE_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReduceMotionSnapshot() {
  return window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

function getReduceMotionServerSnapshot() {
  return false;
}

// Each candidate is a complete, correctly-formed phrase, not a word split
// from its connector — "Croeso to" isn't valid Welsh ("Croeso i" is), and
// flipping the word and connector as two independently-aligned stages left
// visible gaps between them as their widths differed. Flipping one full
// phrase at a time keeps everything in one static, left-aligned position.
const GREETINGS = ["Welcome to", "Croeso i", "Local to"] as const;
const GREETING_STEP_MS = 650;
// Must be >= the full sequenced outgoing+incoming transition time on
// .greetingWord (260ms delay + 260ms transition = 520ms), so the stacked
// layout isn't dropped mid-flip.
const GREETING_SETTLE_MS = 560;

/**
 * A one-time, load-only flip through a welcome/Croeso greeting before
 * settling on "Local to", echoing a split-flap display. Runs once per
 * mount; skipped entirely under reduced motion so it lands straight on
 * "Local to".
 *
 * While animating, all three candidate phrases are stacked in the same
 * CSS grid cell, so the container's intrinsic size is the widest of them
 * and the line never reflows mid-flip. Once the flip finishes, that
 * stacked markup is dropped in favour of plain text sized to "Local to"
 * alone — the resting heading must look identical to the original static
 * text, not carry the widest candidate's width as permanent extra
 * whitespace.
 */
function HeroGreeting({ reduceMotion }: { reduceMotion: boolean }) {
  const finalIndex = GREETINGS.length - 1;
  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(false);

  // reduceMotion is read via useSyncExternalStore, which — to stay
  // hydration-safe — always reports false on the very first client render
  // (matching the server, which cannot know the user's preference) and
  // only resolves to its real value on a render shortly after. Branching
  // on it here, rather than only inside the effect, means that once it
  // does resolve to true this component lands on plain text immediately
  // rather than getting stuck mid-animation.
  useEffect(() => {
    if (reduceMotion || settled) return;
    if (index < finalIndex) {
      const timer = setTimeout(
        () => setIndex((current) => current + 1),
        GREETING_STEP_MS,
      );
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setSettled(true), GREETING_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [index, reduceMotion, settled, finalIndex]);

  // finalIndex is GREETINGS.length - 1, always in bounds.
  const final = GREETINGS[finalIndex]!;

  if (reduceMotion || settled) {
    return <>{final}</>;
  }

  return (
    <>
      <span className={styles.greetingStage} aria-hidden="true">
        {GREETINGS.map((candidate, candidateIndex) => (
          <span
            key={candidate}
            className={styles.greetingWord}
            data-state={
              candidateIndex === index
                ? "active"
                : candidateIndex < index
                  ? "prev"
                  : "next"
            }
          >
            {candidate}
          </span>
        ))}
      </span>
      <span className={styles.srOnly}>{final}</span>
    </>
  );
}

function PauseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 4.5v15l14-7.5-14-7.5Z" fill="currentColor" />
    </svg>
  );
}

function ScrollCueIcon() {
  return (
    <span className={styles.scrollChevrons} aria-hidden="true">
      <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
        <path
          d="M1.5 1.5 10 9.5l8.5-8"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
        <path
          d="M1.5 1.5 10 9.5l8.5-8"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ChevronIcon({ direction }: { direction: "prev" | "next" }) {
  const d = direction === "prev" ? "M14.5 5 8 12l6.5 7" : "M9.5 5 16 12l-6.5 7";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StoryLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("#")) {
    return <a href={href}>{children}</a>;
  }

  return <Link href={href as Route}>{children}</Link>;
}

export function Hero({ cards, places, photoCredit }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionSnapshot,
    getReduceMotionServerSnapshot,
  );
  const cardsRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = (index: number) => {
    setDirection(wrappedDelta(activeIndex, index, cards.length));
    setExitingIndex(activeIndex);
    setActiveIndex(index);
  };

  const goToOffset = (offset: 1 | -1) => {
    setDirection(offset);
    setExitingIndex(activeIndex);
    setActiveIndex((index) => (index + offset + cards.length) % cards.length);
  };

  const canAutoplay = cards.length > 1 && !reduceMotion;

  useEffect(() => {
    if (!canAutoplay || !isPlaying) return;

    const region = cardsRef.current;
    let hoverPaused = false;

    const pause = () => {
      hoverPaused = true;
    };
    const resume = () => {
      hoverPaused = false;
    };

    region?.addEventListener("pointerenter", pause);
    region?.addEventListener("pointerleave", resume);
    region?.addEventListener("focusin", pause);
    region?.addEventListener("focusout", resume);

    const id = window.setInterval(() => {
      if (hoverPaused || document.hidden) return;
      setDirection(1);
      setExitingIndex(activeIndexRef.current);
      setActiveIndex((index) => (index + 1) % cards.length);
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
      region?.removeEventListener("pointerenter", pause);
      region?.removeEventListener("pointerleave", resume);
      region?.removeEventListener("focusin", pause);
      region?.removeEventListener("focusout", resume);
    };
  }, [cards.length, canAutoplay, isPlaying]);

  return (
    <section
      className={styles.hero}
      aria-labelledby="home-title"
      data-home-hero
      data-motion={reduceMotion ? "reduced" : "auto"}
    >
      <div className={styles.scene} aria-hidden="true">
        <picture>
          <source
            media="(max-width: 699px)"
            srcSet="/home/hero/valley-mobile-720.avif 720w, /home/hero/valley-mobile.avif 1080w"
            sizes="100vw"
            type="image/avif"
          />
          <source
            media="(max-width: 699px)"
            srcSet="/home/hero/valley-mobile-720.webp 720w, /home/hero/valley-mobile.webp 1080w"
            sizes="100vw"
            type="image/webp"
          />
          <source
            srcSet="/home/hero/valley-master-1600.avif 1600w, /home/hero/valley-master.avif 2400w"
            sizes="100vw"
            type="image/avif"
          />
          {/* Art-directed crops require a real <picture>; the files are already optimised. */}
          <img
            className={styles.photo}
            src="/home/hero/valley-master.webp"
            srcSet="/home/hero/valley-master-1600.webp 1600w, /home/hero/valley-master.webp 2400w"
            sizes="100vw"
            alt=""
            width={2400}
            height={1350}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className={styles.liquid} />
        <div className={styles.scrim} />
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <h1 id="home-title" className={styles.enter}>
            <HeroGreeting reduceMotion={reduceMotion} />
            <br />
            our Valleys.
          </h1>
          <p className={styles.enter}>One place for everything that matters.</p>
        </div>

        <div className={styles.slot}>
          <form
            className={`${styles.search} ${styles.glass}`}
            action="/businesses"
            method="get"
            role="search"
            aria-label="Search local businesses"
          >
            <label className={styles.query}>
              <span className={styles.srOnly}>What are you looking for?</span>
              <input
                name="q"
                type="search"
                placeholder="What are you looking for?"
                maxLength={80}
              />
            </label>

            <label className={styles.place}>
              <span className={styles.srOnly}>Where?</span>
              <select name="place" defaultValue="">
                <option value="">All covered areas</option>
                {places.map((place) => (
                  <option key={place.slug} value={place.slug}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">Search</button>
          </form>

          <nav className={styles.actions} aria-label="Quick actions">
            <Link className={styles.glass} href="/businesses">
              Find a business
            </Link>
            <Link className={styles.glass} href="/events">
              See what’s on
            </Link>
            <Link className={styles.glass} href="/places">
              Explore places
            </Link>
          </nav>

          <div className={styles.cycler} aria-label="Homepage previews">
            <div
              className={styles.cards}
              ref={cardsRef}
              data-direction={direction === 1 ? "forward" : "backward"}
            >
              {cards.map((card, index) => {
                const active = index === activeIndex;
                const exiting = !active && index === exitingIndex;
                return (
                  <article
                    className={`${styles.card} ${styles.glass}`}
                    data-hero-card
                    data-card-kind={card.id}
                    data-active={active ? "true" : "false"}
                    data-exiting={exiting ? "true" : "false"}
                    aria-hidden={active ? "false" : "true"}
                    inert={active ? undefined : true}
                    key={card.id}
                  >
                    <div className={styles.cardMark} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className={styles.cardCopy}>
                      <p>{card.eyebrow}</p>
                      <h2>{card.title}</h2>
                      <span>{card.meta}</span>
                    </div>
                    <StoryLink href={card.href}>
                      <span className={styles.srOnly}>{card.cta}</span>
                      <CardArrowIcon />
                    </StoryLink>
                  </article>
                );
              })}
            </div>

            {cards.length > 1 ? (
              <div className={styles.controls}>
                <button
                  type="button"
                  className={`${styles.arrow} ${styles.glass}`}
                  data-hero-prev
                  aria-label="Show previous preview"
                  onClick={() => goToOffset(-1)}
                >
                  <ChevronIcon direction="prev" />
                </button>

                <div className={styles.dots} data-hero-dots>
                  {cards.map((card, index) => (
                    <button
                      key={card.id}
                      type="button"
                      className={styles.dot}
                      data-hero-dot
                      data-current={index === activeIndex ? "true" : "false"}
                      aria-label={`Show ${card.eyebrow.toLowerCase()}`}
                      aria-current={index === activeIndex}
                      onClick={() => goTo(index)}
                    />
                  ))}
                </div>

                {canAutoplay ? (
                  <button
                    type="button"
                    className={`${styles.playToggle} ${styles.glass}`}
                    aria-label={
                      isPlaying
                        ? "Pause automatic preview cycling"
                        : "Resume automatic preview cycling"
                    }
                    onClick={() => setIsPlaying((playing) => !playing)}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                ) : null}

                <button
                  type="button"
                  className={`${styles.arrow} ${styles.glass}`}
                  data-hero-next
                  aria-label="Show next preview"
                  onClick={() => goToOffset(1)}
                >
                  <ChevronIcon direction="next" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <a
          className={styles.scrollCue}
          href="#discover"
          aria-label="Scroll to explore"
        >
          <ScrollCueIcon />
          <span className={styles.scrollCueLabel} aria-hidden="true">
            Scroll to explore
          </span>
        </a>
      </div>

      {photoCredit ? (
        <p className={styles.credit}>
          Photo: <a href={photoCredit.sourceHref}>{photoCredit.label}</a>
          {" · "}
          <a href={photoCredit.licenceHref}>{photoCredit.licenceLabel}</a>
        </p>
      ) : null}
    </section>
  );
}
