/**
 * Strings for `/account/following`: what the businesses a resident saved have
 * posted lately, and which of them send in-site notices. Spread into the main
 * catalogues. Welsh is first-draft and needs review by a fluent Welsh speaker
 * before launch.
 */
export const followingEn = {
  "follow.metaTitle": "From your businesses",
  "follow.eyebrow": "Your account",
  "follow.title": "From your businesses",
  "follow.lead":
    "New updates, offers and events from the local businesses you saved, and a switch for each one to say whether it can notify you.",
  "follow.back": "Back to my account",
  "follow.notifications": "Open notifications",
  "follow.demo":
    "This is a public demonstration account, so it has no saved businesses.",
  "follow.unavailable":
    "This page could not be loaded just now. Try again soon.",

  "follow.feed.title": "Latest from the businesses you saved",
  "follow.feed.aria": "Recent activity from saved businesses",
  "follow.feed.emptyTitle": "Nothing new lately",
  "follow.feed.emptyBody":
    "When a business you saved posts an update, adds an offer or plans an event, it appears here.",
  "follow.feed.fictional": "Fictional demonstration business",
  "follow.kind.update": "Update",
  "follow.kind.offer": "Offer",
  "follow.kind.event": "Event",
  "follow.item.by": "from {business}",
  "follow.item.when": "Starts {when}",
  "follow.item.posted": "Posted {when}",
  "follow.item.open": "Open",
  "follow.open.update": "Read the update from {business}",
  "follow.open.offer": "See the offer from {business}",
  "follow.open.event": "See the event from {business}",

  "follow.manage.title": "Who can notify you",
  "follow.manage.lead":
    "Notices appear in your notification bell within about half an hour. They never send email.",
  "follow.manage.aria": "Saved businesses and notice switches",
  "follow.manage.on": "Notices on",
  "follow.manage.off": "Notices off",
  "follow.manage.turnOff": "Turn off notices for {business}",
  "follow.manage.turnOn": "Turn on notices for {business}",
  "follow.manage.switchOff": "Turn off",
  "follow.manage.switchOn": "Turn on",
  "follow.manage.allOff": "Turn all off",
  "follow.manage.allOn": "Turn all on",
  "follow.manage.emptyTitle": "You have not saved a business yet",
  "follow.manage.emptyBody":
    "Save a business from its page or from the directory, and it will show up here.",
  "follow.manage.browse": "Browse businesses",

  "follow.outcome.done": "Saved.",
  "follow.outcome.notFound": "That business is no longer in your saved list.",
  "follow.outcome.failed": "That did not work. Please try again.",
} as const;

export const followingCy: Record<keyof typeof followingEn, string> = {
  "follow.metaTitle": "O'ch busnesau",
  "follow.eyebrow": "Eich cyfrif",
  "follow.title": "O'ch busnesau",
  "follow.lead":
    "Newyddion, cynigion a digwyddiadau newydd gan y busnesau lleol a gadwyd gennych, a switsh i bob un i ddweud a gaiff eich hysbysu.",
  "follow.back": "Yn ôl i fy nghyfrif",
  "follow.notifications": "Agor hysbysiadau",
  "follow.demo":
    "Cyfrif arddangos cyhoeddus yw hwn, felly nid oes ganddo fusnesau a gadwyd.",
  "follow.unavailable":
    "Ni ellid llwytho'r dudalen hon ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "follow.feed.title": "Y diweddaraf gan y busnesau a gadwyd gennych",
  "follow.feed.aria": "Gweithgarwch diweddar gan fusnesau a gadwyd",
  "follow.feed.emptyTitle": "Dim byd newydd yn ddiweddar",
  "follow.feed.emptyBody":
    "Pan fydd busnes a gadwyd gennych yn postio newyddion, yn ychwanegu cynnig neu'n cynllunio digwyddiad, bydd yn ymddangos yma.",
  "follow.feed.fictional": "Busnes arddangos ffuglennol",
  "follow.kind.update": "Newyddion",
  "follow.kind.offer": "Cynnig",
  "follow.kind.event": "Digwyddiad",
  "follow.item.by": "gan {business}",
  "follow.item.when": "Yn dechrau {when}",
  "follow.item.posted": "Postiwyd {when}",
  "follow.item.open": "Agor",
  "follow.open.update": "Darllen y newyddion gan {business}",
  "follow.open.offer": "Gweld y cynnig gan {business}",
  "follow.open.event": "Gweld y digwyddiad gan {business}",

  "follow.manage.title": "Pwy all eich hysbysu",
  "follow.manage.lead":
    "Mae hysbysiadau'n ymddangos yn eich cloch hysbysiadau o fewn hanner awr. Nid ydynt byth yn anfon e-bost.",
  "follow.manage.aria": "Busnesau a gadwyd a switshis hysbysiadau",
  "follow.manage.on": "Hysbysiadau ymlaen",
  "follow.manage.off": "Hysbysiadau i ffwrdd",
  "follow.manage.turnOff": "Diffodd hysbysiadau ar gyfer {business}",
  "follow.manage.turnOn": "Troi hysbysiadau ymlaen ar gyfer {business}",
  "follow.manage.switchOff": "Diffodd",
  "follow.manage.switchOn": "Troi ymlaen",
  "follow.manage.allOff": "Diffodd pob un",
  "follow.manage.allOn": "Troi pob un ymlaen",
  "follow.manage.emptyTitle": "Nid ydych wedi cadw busnes eto",
  "follow.manage.emptyBody":
    "Cadwch fusnes o'i dudalen neu o'r cyfeiriadur, a bydd yn ymddangos yma.",
  "follow.manage.browse": "Pori busnesau",

  "follow.outcome.done": "Wedi'i gadw.",
  "follow.outcome.notFound":
    "Nid yw'r busnes hwnnw yn eich rhestr gadw mwyach.",
  "follow.outcome.failed": "Ni weithiodd hynny. Rhowch gynnig arall arni.",
};
