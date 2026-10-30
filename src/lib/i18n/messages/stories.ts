/**
 * Strings for local stories: the story page (`/news/[slug]`) and the
 * "From OurValleys" block on `/news`. Spread into the main catalogues. Welsh is
 * first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const storiesEn = {
  "stories.eyebrow": "Local news",
  "stories.by": "By {name}",
  "stories.published": "Published {date}",
  "stories.updated": "Updated {date}",
  "stories.readingTime": "{minutes} min read",
  "stories.sponsoredLabel": "Sponsored",
  "stories.englishOnly":
    "This story is only available in English for now. A Welsh version has not been published yet.",
  "stories.share": "Share this story",
  "stories.placeLink": "More about {place}",
  "stories.allNews": "All local news",
  "stories.moreTitle": "More local stories",
  "stories.notFoundTitle": "Story not found",
  "stories.notFoundDescription":
    "This story is not available. It may have been withdrawn.",
  "stories.metaSuffix": "Local news from OurValleys.",

  "stories.blockTitle": "From OurValleys",
  "stories.blockIntro":
    "Short local stories written by the OurValleys team, separate from the regional news feed below.",
  "stories.blockUnavailable":
    "Local stories could not be loaded just now. The regional feed below is unaffected.",
  "stories.readStory": "Read the story",
} as const;

export const storiesCy: Record<keyof typeof storiesEn, string> = {
  "stories.eyebrow": "Newyddion lleol",
  "stories.by": "Gan {name}",
  "stories.published": "Cyhoeddwyd {date}",
  "stories.updated": "Diweddarwyd {date}",
  "stories.readingTime": "{minutes} munud o ddarllen",
  "stories.sponsoredLabel": "Noddedig",
  "stories.englishOnly":
    "Dim ond yn Saesneg y mae'r stori hon ar gael am y tro. Nid yw fersiwn Gymraeg wedi'i chyhoeddi eto.",
  "stories.share": "Rhannu'r stori hon",
  "stories.placeLink": "Mwy am {place}",
  "stories.allNews": "Holl newyddion lleol",
  "stories.moreTitle": "Mwy o straeon lleol",
  "stories.notFoundTitle": "Heb ddod o hyd i'r stori",
  "stories.notFoundDescription":
    "Nid yw'r stori hon ar gael. Efallai ei bod wedi'i thynnu'n ôl.",
  "stories.metaSuffix": "Newyddion lleol gan OurValleys.",

  "stories.blockTitle": "Gan OurValleys",
  "stories.blockIntro":
    "Straeon lleol byr a ysgrifennwyd gan dîm OurValleys, ar wahân i'r ffrwd newyddion rhanbarthol isod.",
  "stories.blockUnavailable":
    "Nid oedd modd llwytho straeon lleol ar hyn o bryd. Nid yw'r ffrwd ranbarthol isod wedi'i heffeithio.",
  "stories.readStory": "Darllen y stori",
};
