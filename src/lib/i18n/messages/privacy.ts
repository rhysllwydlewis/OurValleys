/**
 * Strings for the privacy and notification centre (`/account/privacy`).
 * Spread into the main catalogues. Welsh is first-draft and needs review by a
 * fluent Welsh speaker before launch.
 */
export const privacyEn = {
  "privacy.metaTitle": "Privacy and notices",
  "privacy.eyebrow": "Your account",
  "privacy.title": "Privacy and notices",
  "privacy.lead":
    "See what OurValleys keeps about you, choose which notices appear in your notification centre, and take a copy of everything or delete it.",
  "privacy.back": "Back to my account",
  "privacy.demo":
    "This is a public demonstration account, so it holds no personal data and has no notice choices.",
  "privacy.outcome.saved": "Your choices are saved.",
  "privacy.outcome.failed": "That did not work. Please try again.",

  "privacy.holdings.title": "What we hold about you",
  "privacy.holdings.lead":
    "These counts are only what you have chosen to keep or done while signed in. Nothing here is shown to other people.",
  "privacy.holdings.unavailable":
    "The counts could not be loaded just now. Try again soon.",
  "privacy.holdings.account":
    "We also keep your name, email address and sign-in details so you can use your account. They are in the download below.",
  "privacy.holding.savedBusinesses": "Saved businesses",
  "privacy.holding.mutedBusinesses": "Saved businesses that do not notify you",
  "privacy.holding.savedPlaces": "Saved places",
  "privacy.holding.savedEvents": "Saved events",
  "privacy.holding.savedSearches": "Saved searches",
  "privacy.holding.notifications": "Notifications in your inbox",
  "privacy.holding.reviews": "Reviews you wrote",
  "privacy.holding.reportsFiled": "Reports you filed",
  "privacy.holding.businessRoles": "Business team roles",

  "privacy.notices.title": "Notices in your notification centre",
  "privacy.notices.lead":
    "Untick a kind to stop it appearing in your notification centre. This does not change the emails you choose to receive.",
  "privacy.notices.legend": "Notices to show",
  "privacy.notices.save": "Save my choices",
  "privacy.notices.inbox": "Open my notifications",

  "privacy.kind.search.label": "Saved search results",
  "privacy.kind.search.hint": "When a search you saved finds something new.",
  "privacy.kind.event.label": "Saved event reminders",
  "privacy.kind.event.hint": "When an event you saved is about to start.",
  "privacy.kind.digest.label": "Saved places summary",
  "privacy.kind.digest.hint":
    "New businesses, events and offers from places you saved.",
  "privacy.kind.followedUpdate.label": "Updates from saved businesses",
  "privacy.kind.followedUpdate.hint":
    "When a business you saved posts a short update.",
  "privacy.kind.followedOffer.label": "Offers from saved businesses",
  "privacy.kind.followedOffer.hint":
    "When a business you saved publishes an offer.",
  "privacy.kind.followedEvent.label": "Events from saved businesses",
  "privacy.kind.followedEvent.hint": "When a business you saved adds an event.",
  "privacy.kind.owner.label": "Weekly summary for my businesses",
  "privacy.kind.owner.hint":
    "Views, enquiries and what is waiting, for businesses you manage.",

  "privacy.email.title": "Emails",
  "privacy.email.lead":
    "Email choices live with your account settings, and each saved search has its own alert switch.",
  "privacy.email.manage": "Email preferences",
  "privacy.email.savedSearches": "Saved searches and alerts",

  "privacy.data.title": "Your data",
  "privacy.data.lead":
    "Download a copy of everything above as a file you can keep, or delete your account and the personal data attached to it.",
  "privacy.data.download": "Download my data",
  "privacy.data.delete": "Delete my account",
  "privacy.settingsLink": "See everything we hold, and choose your notices",
} as const;

export const privacyCy: Record<keyof typeof privacyEn, string> = {
  "privacy.metaTitle": "Preifatrwydd a hysbysiadau",
  "privacy.eyebrow": "Eich cyfrif",
  "privacy.title": "Preifatrwydd a hysbysiadau",
  "privacy.lead":
    "Gwelwch beth mae OurValleys yn ei gadw amdanoch, dewiswch pa hysbysiadau sy'n ymddangos yn eich canolfan hysbysiadau, a chymerwch gopi o bopeth neu ei ddileu.",
  "privacy.back": "Yn ôl i fy nghyfrif",
  "privacy.demo":
    "Cyfrif arddangos cyhoeddus yw hwn, felly nid oes ganddo ddata personol na dewisiadau hysbysiadau.",
  "privacy.outcome.saved": "Mae eich dewisiadau wedi'u cadw.",
  "privacy.outcome.failed": "Ni weithiodd hynny. Rhowch gynnig arall arni.",

  "privacy.holdings.title": "Beth rydym yn ei gadw amdanoch",
  "privacy.holdings.lead":
    "Dim ond yr hyn rydych wedi dewis ei gadw neu ei wneud wrth fod wedi mewngofnodi yw'r cyfrifon hyn. Ni ddangosir dim o hyn i bobl eraill.",
  "privacy.holdings.unavailable":
    "Doedd dim modd llwytho'r cyfrifon ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",
  "privacy.holdings.account":
    "Rydym hefyd yn cadw eich enw, eich cyfeiriad e-bost a'ch manylion mewngofnodi fel y gallwch ddefnyddio eich cyfrif. Maent yn y lawrlwythiad isod.",
  "privacy.holding.savedBusinesses": "Busnesau a gadwyd",
  "privacy.holding.mutedBusinesses":
    "Busnesau a gadwyd nad ydynt yn eich hysbysu",
  "privacy.holding.savedPlaces": "Lleoedd a gadwyd",
  "privacy.holding.savedEvents": "Digwyddiadau a gadwyd",
  "privacy.holding.savedSearches": "Chwiliadau a gadwyd",
  "privacy.holding.notifications": "Hysbysiadau yn eich mewnflwch",
  "privacy.holding.reviews": "Adolygiadau a ysgrifennwyd gennych",
  "privacy.holding.reportsFiled": "Adroddiadau a gyflwynwyd gennych",
  "privacy.holding.businessRoles": "Rolau tîm busnes",

  "privacy.notices.title": "Hysbysiadau yn eich canolfan hysbysiadau",
  "privacy.notices.lead":
    "Dad-diciwch fath i'w atal rhag ymddangos yn eich canolfan hysbysiadau. Nid yw hyn yn newid yr e-byst rydych yn dewis eu cael.",
  "privacy.notices.legend": "Hysbysiadau i'w dangos",
  "privacy.notices.save": "Cadw fy newisiadau",
  "privacy.notices.inbox": "Agor fy hysbysiadau",

  "privacy.kind.search.label": "Canlyniadau chwiliadau a gadwyd",
  "privacy.kind.search.hint":
    "Pan fydd chwiliad a gadwyd gennych yn dod o hyd i rywbeth newydd.",
  "privacy.kind.event.label": "Atgoffa am ddigwyddiadau a gadwyd",
  "privacy.kind.event.hint":
    "Pan fydd digwyddiad a gadwyd gennych ar fin dechrau.",
  "privacy.kind.digest.label": "Crynodeb o'r lleoedd a gadwyd",
  "privacy.kind.digest.hint":
    "Busnesau, digwyddiadau a chynigion newydd o'r lleoedd a gadwyd gennych.",
  "privacy.kind.followedUpdate.label": "Newyddion gan fusnesau a gadwyd",
  "privacy.kind.followedUpdate.hint":
    "Pan fydd busnes a gadwyd gennych yn postio newyddion byr.",
  "privacy.kind.followedOffer.label": "Cynigion gan fusnesau a gadwyd",
  "privacy.kind.followedOffer.hint":
    "Pan fydd busnes a gadwyd gennych yn cyhoeddi cynnig.",
  "privacy.kind.followedEvent.label": "Digwyddiadau gan fusnesau a gadwyd",
  "privacy.kind.followedEvent.hint":
    "Pan fydd busnes a gadwyd gennych yn ychwanegu digwyddiad.",
  "privacy.kind.owner.label": "Crynodeb wythnosol ar gyfer fy musnesau",
  "privacy.kind.owner.hint":
    "Golygon, ymholiadau a'r hyn sy'n aros, ar gyfer busnesau rydych yn eu rheoli.",

  "privacy.email.title": "E-byst",
  "privacy.email.lead":
    "Mae dewisiadau e-bost gyda gosodiadau eich cyfrif, ac mae gan bob chwiliad a gadwyd ei switsh rhybuddion ei hun.",
  "privacy.email.manage": "Dewisiadau e-bost",
  "privacy.email.savedSearches": "Chwiliadau a rhybuddion a gadwyd",

  "privacy.data.title": "Eich data",
  "privacy.data.lead":
    "Lawrlwythwch gopi o bopeth uchod fel ffeil y gallwch ei chadw, neu dilëwch eich cyfrif a'r data personol sydd ynghlwm wrtho.",
  "privacy.data.download": "Lawrlwytho fy nata",
  "privacy.data.delete": "Dileu fy nghyfrif",
  "privacy.settingsLink":
    "Gweld popeth rydym yn ei gadw, a dewis eich hysbysiadau",
};
