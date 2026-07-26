"use client";

import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import styles from "./scroll-discovery-hero.module.css";

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

type ScrollDiscoveryHeroProps = {
  cards: HeroCard[];
  places: PlaceOption[];
  photoCredit?: PhotoCredit;
};

type GsapModule = typeof import("gsap");
type Gsap = GsapModule["default"];

const CARD_WINDOWS = [
  { start: 0.325, end: 0.42 },
  { start: 0.475, end: 0.57 },
  { start: 0.625, end: 0.72 },
  { start: 0.775, end: 0.89 },
] as const;

const CARD_TIMING = [
  { enter: 30, leave: 42 },
  { enter: 45, leave: 57 },
  { enter: 60, leave: 72 },
  { enter: 75, leave: 90 },
] as const;

function StoryLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("#")) {
    return <a href={href}>{children}</a>;
  }

  return <Link href={href as Route}>{children}</Link>;
}

function setInteractiveState(element: HTMLElement | null, enabled: boolean) {
  if (!element) return;

  if (enabled) {
    element.removeAttribute("inert");
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("inert", "");
    element.setAttribute("aria-hidden", "true");
  }
}

export function ScrollDiscoveryHero({
  cards,
  places,
  photoCredit,
}: ScrollDiscoveryHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    let cancelled = false;
    let media: ReturnType<Gsap["matchMedia"]> | null = null;
    let context: ReturnType<Gsap["context"]> | null = null;

    async function setup() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !root || !stage) return;

      gsap.registerPlugin(ScrollTrigger);
      media = gsap.matchMedia();

      context = gsap.context(() => {
        media?.add(
          {
            desktop: "(min-width: 900px)",
            mobile: "(max-width: 899px)",
            reduce: "(prefers-reduced-motion: reduce)",
          },
          (scope) => {
            const conditions = scope.conditions as {
              desktop?: boolean;
              mobile?: boolean;
              reduce?: boolean;
            };

            const cardElements = gsap.utils.toArray<HTMLElement>(
              "[data-story-card]",
              root,
            );
            const search =
              root.querySelector<HTMLElement>("[data-hero-search]");
            const actions = root.querySelector<HTMLElement>(
              "[data-hero-actions]",
            );
            const copy = root.querySelector<HTMLElement>("[data-hero-copy]");
            const shade = root.querySelector<HTMLElement>("[data-hero-shade]");
            const photo = root.querySelector<HTMLElement>("[data-hero-photo]");
            const progressBar = root.querySelector<HTMLElement>(
              "[data-hero-progress]",
            );

            const setActiveCard = (activeIndex: number | null) => {
              cardElements.forEach((card, index) => {
                const active = index === activeIndex;
                card.setAttribute("aria-hidden", active ? "false" : "true");
                card.toggleAttribute("inert", !active);
                card.dataset.active = active ? "true" : "false";
              });

              if (activeIndex === null) {
                delete root.dataset.activeCard;
              } else {
                root.dataset.activeCard = cards[activeIndex]?.id ?? "";
              }
            };

            const syncAccessibility = (progress: number) => {
              root.dataset.scrollProgress = progress.toFixed(3);

              const searchIsActive = progress < 0.255;
              setInteractiveState(search, searchIsActive);
              setInteractiveState(actions, searchIsActive);

              const windowIndex = CARD_WINDOWS.findIndex(
                ({ start, end }) => progress >= start && progress <= end,
              );
              const activeIndex =
                windowIndex >= 0 && windowIndex < cardElements.length
                  ? windowIndex
                  : null;
              setActiveCard(activeIndex);

              if (progressBar) {
                progressBar.style.transform = `scaleY(${progress})`;
              }
            };

            gsap.set(cardElements, {
              autoAlpha: 0,
              y: 26,
              scale: 0.988,
              pointerEvents: "none",
            });
            setActiveCard(null);
            syncAccessibility(0);

            if (conditions.reduce) {
              root.dataset.motion = "reduced";
              gsap.set([search, actions, copy, shade, photo], {
                clearProps: "all",
              });
              return;
            }

            root.dataset.motion = "scroll";

            const timeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: root,
                start: "top top",
                end: conditions.desktop ? "+=320%" : "+=220%",
                pin: stage,
                pinSpacing: true,
                scrub: conditions.desktop ? 0.8 : 0.45,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => syncAccessibility(self.progress),
                onRefresh: (self) => syncAccessibility(self.progress),
              },
            });

            timeline
              .to(
                photo,
                {
                  scale: conditions.desktop ? 1.075 : 1.035,
                  xPercent: conditions.desktop ? -1.2 : 0,
                  duration: 100,
                },
                0,
              )
              .to(
                copy,
                {
                  y: conditions.desktop ? -38 : -18,
                  duration: 72,
                },
                18,
              )
              .to(
                actions,
                {
                  autoAlpha: 0,
                  y: 12,
                  duration: 8,
                  pointerEvents: "none",
                },
                18,
              )
              .to(
                search,
                {
                  autoAlpha: 0,
                  y: -10,
                  scale: 0.987,
                  duration: 10,
                  pointerEvents: "none",
                },
                20,
              );

            cardElements.forEach((card, index) => {
              const timing = CARD_TIMING[index];
              if (!timing) return;

              timeline
                .to(
                  card,
                  {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 3,
                    pointerEvents: "auto",
                  },
                  timing.enter,
                )
                .to(
                  card,
                  {
                    autoAlpha: 0,
                    y: index === cardElements.length - 1 ? 42 : -18,
                    scale: 0.988,
                    duration: 3,
                    pointerEvents: "none",
                  },
                  timing.leave,
                );
            });

            timeline
              .to(
                copy,
                {
                  autoAlpha: 0,
                  y: conditions.desktop ? -72 : -38,
                  duration: 10,
                },
                90,
              )
              .to(
                shade,
                {
                  opacity: 0.22,
                  duration: 10,
                },
                90,
              );
          },
        );
      }, root);
    }

    setup();

    return () => {
      cancelled = true;
      media?.revert();
      context?.revert();
      delete root.dataset.activeCard;
      delete root.dataset.scrollProgress;
      delete root.dataset.motion;
    };
  }, [cards]);

  return (
    <section
      className={styles.story}
      ref={rootRef}
      data-home-scroll-story
      aria-labelledby="home-title"
    >
      <div className={styles.stage} ref={stageRef} data-hero-stage>
        <div className={styles.scene} data-hero-scene aria-hidden="true">
          <picture>
            <source
              media="(max-width: 699px)"
              srcSet="/home/hero/rhondda-mobile-720.avif 720w, /home/hero/rhondda-mobile.avif 1080w"
              sizes="100vw"
              type="image/avif"
            />
            <source
              media="(max-width: 699px)"
              srcSet="/home/hero/rhondda-mobile-720.webp 720w, /home/hero/rhondda-mobile.webp 1080w"
              sizes="100vw"
              type="image/webp"
            />
            <source
              srcSet="/home/hero/rhondda-master-1600.avif 1600w, /home/hero/rhondda-master.avif 2400w"
              sizes="100vw"
              type="image/avif"
            />
            {/* Art-directed crops require a real <picture>; the files are already optimised. */}
            <img
              className={styles.photo}
              data-hero-photo
              src="/home/hero/rhondda-master.webp"
              srcSet="/home/hero/rhondda-master-1600.webp 1600w, /home/hero/rhondda-master.webp 2400w"
              sizes="100vw"
              alt=""
              width={2400}
              height={1350}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className={styles.scrim} />
          <div className={styles.exitShade} data-hero-shade />
        </div>

        <div className={styles.content}>
          <div className={styles.copy} data-hero-copy>
            <h1 id="home-title">
              Local to
              <br />
              our Valleys.
            </h1>
            <p>One place for everything that matters.</p>
          </div>

          <div className={styles.slot}>
            <form
              className={styles.search}
              data-hero-search
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

            <nav
              className={styles.actions}
              data-hero-actions
              aria-label="Quick actions"
            >
              <Link href="/businesses">Find a business</Link>
              <Link href="/events">See what’s on</Link>
              <Link href="/places">Explore places</Link>
            </nav>

            <div className={styles.cards} aria-label="Homepage previews">
              {cards.map((card, index) => (
                <article
                  className={styles.card}
                  data-story-card
                  data-card-kind={card.id}
                  data-card-index={index}
                  aria-hidden="true"
                  inert
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
              ))}
            </div>
          </div>
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span data-hero-progress />
        </div>

        {photoCredit ? (
          <p className={styles.credit}>
            Photo: <a href={photoCredit.sourceHref}>{photoCredit.label}</a>
            {" · "}
            <a href={photoCredit.licenceHref}>{photoCredit.licenceLabel}</a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
