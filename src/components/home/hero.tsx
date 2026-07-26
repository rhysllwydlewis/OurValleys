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

function StoryLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("#")) {
    return <a href={href}>{children}</a>;
  }

  return <Link href={href as Route}>{children}</Link>;
}

export function Hero({ cards, places, photoCredit }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionSnapshot,
    getReduceMotionServerSnapshot,
  );
  const cyclerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cards.length <= 1 || reduceMotion) return;

    const region = cyclerRef.current;
    let paused = false;

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };

    region?.addEventListener("pointerenter", pause);
    region?.addEventListener("pointerleave", resume);
    region?.addEventListener("focusin", pause);
    region?.addEventListener("focusout", resume);

    const id = window.setInterval(() => {
      if (paused || document.hidden) return;
      setActiveIndex((index) => (index + 1) % cards.length);
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
      region?.removeEventListener("pointerenter", pause);
      region?.removeEventListener("pointerleave", resume);
      region?.removeEventListener("focusin", pause);
      region?.removeEventListener("focusout", resume);
    };
  }, [cards.length, reduceMotion]);

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
          <h1 id="home-title">
            Local to
            <br />
            our Valleys.
          </h1>
          <p>One place for everything that matters.</p>
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
                <option value="">All of RCT</option>
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

          <div
            className={styles.cycler}
            ref={cyclerRef}
            aria-label="Homepage previews"
          >
            <div className={styles.cards}>
              {cards.map((card, index) => {
                const active = index === activeIndex;
                return (
                  <article
                    className={`${styles.card} ${styles.glass}`}
                    data-hero-card
                    data-card-kind={card.id}
                    data-active={active ? "true" : "false"}
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
                    <StoryLink href={card.href}>{card.cta} →</StoryLink>
                  </article>
                );
              })}
            </div>

            {cards.length > 1 ? (
              <div className={styles.dots}>
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    className={styles.dot}
                    data-current={index === activeIndex ? "true" : "false"}
                    aria-label={`Show ${card.eyebrow.toLowerCase()}`}
                    aria-current={index === activeIndex}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
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
