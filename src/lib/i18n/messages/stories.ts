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

  "stories.archiveLink": "See every local story",
  "stories.archiveMetaTitle": "Local news archive",
  "stories.archiveMetaDescription":
    "Every local story published by OurValleys, newest first, with a filter by place.",
  "stories.archiveTitle": "Local news archive",
  "stories.archiveIntro":
    "Every story published by the OurValleys team, newest first. Filter by place to see what is happening near you.",
  "stories.feedLink": "Follow with a news reader (Atom feed)",
  "stories.filterLabel": "Filter stories by place",
  "stories.filterAll": "All places",
  "stories.archiveEmptyTitle": "No stories here yet",
  "stories.archiveEmptyBody":
    "Nothing has been published for this selection. Try all places, or check back soon.",
  "stories.archiveUnavailableTitle": "Stories could not be loaded",
  "stories.archiveUnavailableBody":
    "Something went wrong reading the archive. Please try again in a few minutes.",
  "stories.pagerLabel": "Pages of stories",
  "stories.pagerPrevious": "Newer stories",
  "stories.pagerNext": "Older stories",
  "stories.pagerStatus": "Page {page} of {pages}",
  "stories.placeBlockTitle": "Local news about {place}",
  "stories.homeEyebrow": "Local news",
  "stories.homeTitle": "Latest from the valleys",
  "stories.homeAll": "All local news",
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

  "stories.archiveLink": "Gweld pob stori leol",
  "stories.archiveMetaTitle": "Archif newyddion lleol",
  "stories.archiveMetaDescription":
    "Pob stori leol a gyhoeddwyd gan OurValleys, y diweddaraf yn gyntaf, gyda hidlydd yn ôl lle.",
  "stories.archiveTitle": "Archif newyddion lleol",
  "stories.archiveIntro":
    "Pob stori a gyhoeddwyd gan dîm OurValleys, y diweddaraf yn gyntaf. Hidlwch yn ôl lle i weld beth sy'n digwydd yn eich ardal.",
  "stories.feedLink": "Dilyn gyda darllenydd newyddion (ffrwd Atom)",
  "stories.filterLabel": "Hidlo straeon yn ôl lle",
  "stories.filterAll": "Pob lle",
  "stories.archiveEmptyTitle": "Dim straeon yma eto",
  "stories.archiveEmptyBody":
    "Nid oes dim wedi'i gyhoeddi ar gyfer y dewis hwn. Rhowch gynnig ar bob lle, neu dewch yn ôl yn fuan.",
  "stories.archiveUnavailableTitle": "Nid oedd modd llwytho'r straeon",
  "stories.archiveUnavailableBody":
    "Aeth rhywbeth o'i le wrth ddarllen yr archif. Rhowch gynnig arall arni ymhen ychydig funudau.",
  "stories.pagerLabel": "Tudalennau o straeon",
  "stories.pagerPrevious": "Straeon mwy newydd",
  "stories.pagerNext": "Straeon hŷn",
  "stories.pagerStatus": "Tudalen {page} o {pages}",
  "stories.placeBlockTitle": "Newyddion lleol am {place}",
  "stories.homeEyebrow": "Newyddion lleol",
  "stories.homeTitle": "Y diweddaraf o'r cymoedd",
  "stories.homeAll": "Holl newyddion lleol",
};
