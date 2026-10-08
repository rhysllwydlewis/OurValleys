/**
 * English source catalogue. Keys are flat and dotted; every key must also exist
 * in cy.ts (enforced by the catalogue parity test). Add new strings here first.
 */
export const en = {
  "common.skipToContent": "Skip to main content",
  "common.language": "Language",
  "common.switchLanguage": "Switch to {language}",

  "meta.description":
    "Discover local businesses, places and useful information across the South Wales Valleys.",

  "brand.home": "OurValleys home",

  "nav.primary": "Primary navigation",
  "nav.mobile": "Mobile navigation",
  "nav.siteMenu": "Site menu",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.openNavigationMenu": "Open navigation menu",
  "nav.explore": "Explore",
  "nav.businesses": "Businesses",
  "nav.news": "News",
  "nav.events": "Events",
  "nav.offers": "Offers",
  "nav.guides": "Guides",
  "nav.forBusiness": "For business",
  "nav.myAccount": "My account",
  "nav.admin": "Admin",

  "header.signIn": "Sign in",
  "header.listBusiness": "List your business",

  "dialog.eyebrow": "Your local account",
  "dialog.title": "Sign in to OurValleys",
  "dialog.lead":
    "Access your account and protected business tools. Browsing and public search remain available without signing in.",
  "dialog.close": "Close sign-in dialog",
  "dialog.fullPage": "Open full sign-in page",
  "dialog.continueBrowsing": "Continue browsing",
  "dialog.note":
    "The quick dialog keeps the view-only demonstration. The full sign-in page also lists development business-owner and admin accounts while the site remains unlaunched.",

  "footer.tagline": "Independent local discovery for the South Wales Valleys.",
  "footer.navigation": "Footer navigation",
  "footer.browseBusinesses": "Browse businesses",
  "footer.explorePlaces": "Explore places",
  "footer.localEvents": "Local events",
  "footer.localOffers": "Local offers",
  "footer.latestNews": "Latest news",
  "footer.localGuides": "Local guides",
  "footer.suggestBusiness": "Suggest a business",
  "footer.policies": "Policies and accountability",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.accessibility": "Accessibility",
  "footer.contentGuidelines": "Content guidelines",
  "footer.corrections": "Corrections",
  "footer.advertising": "Advertising",
  "footer.legal":
    "OurValleys is independent and is not operated or endorsed by any council, public body or external publisher. Business content shown during the build is clearly labelled fictional demonstration data. Made in the Valleys.",

  "hero.greetingWelcome": "Welcome to",
  "hero.greetingCroeso": "Croeso i",
  "hero.greetingLocal": "Local to",
  "hero.titleLine2": "our Valleys.",
  "hero.tagline": "One place for everything that matters.",
  "hero.searchLabel": "Search local businesses",
  "hero.queryLabel": "What are you looking for?",
  "hero.whereLabel": "Where?",
  "hero.allAreas": "All covered areas",
  "hero.search": "Search",
  "hero.quickActions": "Quick actions",
  "hero.findBusiness": "Find a business",
  "hero.whatsOn": "See what’s on",
  "hero.explorePlaces": "Explore places",
  "hero.previews": "Homepage previews",
  "hero.previousPreview": "Show previous preview",
  "hero.nextPreview": "Show next preview",
  "hero.pausePreviews": "Pause automatic preview cycling",
  "hero.resumePreviews": "Resume automatic preview cycling",
  "hero.scroll": "Scroll to explore",
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof en;
