/**
 * Strings for `/b/[slug]/follow`: every way to follow one business (feed
 * readers and a calendar subscription). Spread into the main catalogues.
 * Welsh is first-draft and needs review by a fluent Welsh speaker before
 * launch.
 */
export const followBusinessEn = {
  "followbiz.metaTitle": "Follow {business}",
  "followbiz.metaDescription":
    "Get updates, offers and events from {business} in your feed reader or calendar.",
  "followbiz.back": "Back to {business}",
  "followbiz.eyebrow": "Stay in touch",
  "followbiz.title": "Follow {business}",
  "followbiz.lead":
    "New posts, offers and events from {business} can arrive in the apps you already use. No account is needed and nothing is sent to us.",
  "followbiz.footer": "Follow us",
  "followbiz.updates.title": "Updates",
  "followbiz.updates.body":
    "News and notices in any feed reader (an Atom feed).",
  "followbiz.offers.title": "Offers",
  "followbiz.offers.body": "Live offers in any feed reader (an Atom feed).",
  "followbiz.events.title": "Events feed",
  "followbiz.events.body": "Upcoming events in any feed reader (an Atom feed).",
  "followbiz.calendar.title": "Events in your calendar",
  "followbiz.calendar.body":
    "Subscribe once and new events appear in Apple, Google or Outlook calendars (an iCalendar feed).",
  "followbiz.count.one": "1 item now",
  "followbiz.count.many": "{count} items now",
  "followbiz.count.none": "Nothing yet, but you can subscribe now",
  "followbiz.count.unknown": "Current count unavailable",
  "followbiz.addressLabel": "Feed address for {kind}",
  "followbiz.open": "Open feed",
  "followbiz.subscribe": "Subscribe in calendar app",
  "followbiz.copy": "Copy address",
  "followbiz.copied": "Address copied to the clipboard.",
  "followbiz.copyFailed":
    "Could not copy. Select the address and copy it yourself.",
  "followbiz.helpTitle": "What is a feed?",
  "followbiz.helpBody":
    "A feed is a web address that a reader app checks for you. Paste it into a feed reader or calendar app and new items show up there. Feed items are in English.",
  "followbiz.accountTitle": "Prefer notices on OurValleys?",
  "followbiz.accountBody":
    "Save this business to your free account and its updates, offers and events appear in your notifications.",
  "followbiz.accountLink": "See what you follow",
} as const;

export const followBusinessCy: Record<keyof typeof followBusinessEn, string> = {
  "followbiz.metaTitle": "Dilyn {business}",
  "followbiz.metaDescription":
    "Cewch ddiweddariadau, cynigion a digwyddiadau gan {business} yn eich darllenydd ffrydiau neu'ch calendr.",
  "followbiz.back": "Yn ôl i {business}",
  "followbiz.eyebrow": "Cadw mewn cysylltiad",
  "followbiz.title": "Dilyn {business}",
  "followbiz.lead":
    "Gall postiadau, cynigion a digwyddiadau newydd gan {business} gyrraedd yr apiau rydych chi'n eu defnyddio eisoes. Nid oes angen cyfrif ac ni anfonir dim atom ni.",
  "followbiz.footer": "Dilynwch ni",
  "followbiz.updates.title": "Diweddariadau",
  "followbiz.updates.body":
    "Newyddion a hysbysiadau mewn unrhyw ddarllenydd ffrydiau (ffrwd Atom).",
  "followbiz.offers.title": "Cynigion",
  "followbiz.offers.body":
    "Cynigion byw mewn unrhyw ddarllenydd ffrydiau (ffrwd Atom).",
  "followbiz.events.title": "Ffrwd digwyddiadau",
  "followbiz.events.body":
    "Digwyddiadau i ddod mewn unrhyw ddarllenydd ffrydiau (ffrwd Atom).",
  "followbiz.calendar.title": "Digwyddiadau yn eich calendr",
  "followbiz.calendar.body":
    "Tanysgrifiwch unwaith a bydd digwyddiadau newydd yn ymddangos yng nghalendrau Apple, Google neu Outlook (ffrwd iCalendar).",
  "followbiz.count.one": "1 eitem ar hyn o bryd",
  "followbiz.count.many": "{count} eitem ar hyn o bryd",
  "followbiz.count.none": "Dim eto, ond gallwch danysgrifio nawr",
  "followbiz.count.unknown": "Nid yw'r cyfrif cyfredol ar gael",
  "followbiz.addressLabel": "Cyfeiriad y ffrwd ar gyfer {kind}",
  "followbiz.open": "Agor y ffrwd",
  "followbiz.subscribe": "Tanysgrifio yn yr ap calendr",
  "followbiz.copy": "Copïo'r cyfeiriad",
  "followbiz.copied": "Wedi copïo'r cyfeiriad i'r clipfwrdd.",
  "followbiz.copyFailed":
    "Methu copïo. Dewiswch y cyfeiriad a'i gopïo eich hun.",
  "followbiz.helpTitle": "Beth yw ffrwd?",
  "followbiz.helpBody":
    "Cyfeiriad gwe yw ffrwd y mae ap darllen yn ei wirio ar eich rhan. Gludwch ef i ddarllenydd ffrydiau neu ap calendr a bydd eitemau newydd yn ymddangos yno. Mae eitemau'r ffrwd yn Saesneg.",
  "followbiz.accountTitle": "Well gennych hysbysiadau ar OurValleys?",
  "followbiz.accountBody":
    "Cadwch y busnes hwn yn eich cyfrif rhad ac am ddim a bydd ei ddiweddariadau, ei gynigion a'i ddigwyddiadau yn ymddangos yn eich hysbysiadau.",
  "followbiz.accountLink": "Gweld beth rydych chi'n ei ddilyn",
};
