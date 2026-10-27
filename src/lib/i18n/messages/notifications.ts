/**
 * Strings for the notification centre: the account menu entry, the bell
 * badge and `/account/notifications`. Spread into the main catalogues. Welsh
 * is first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const notificationsEn = {
  "notif.menu": "Notifications",
  "notif.menuUnread": "Notifications, {count} unread",
  "notif.triggerUnread": "Account, {count} unread notifications",

  "notif.metaTitle": "Notifications",
  "notif.eyebrow": "Your account",
  "notif.title": "Notifications",
  "notif.lead":
    "What changed in the places, searches and businesses you follow, kept here so a missed email is never a missed update.",
  "notif.back": "Back to my account",
  "notif.settings": "Choose what you are told about",
  "notif.demo":
    "This is a public demonstration account, so it has no notifications.",
  "notif.unavailable":
    "Notifications could not be loaded just now. Try again soon.",

  "notif.filter.aria": "Show notifications about",
  "notif.filter.all": "All",
  "notif.filter.saved": "Saved and followed",
  "notif.filter.business": "My businesses",
  "notif.summary.unread": "{count} unread in total",
  "notif.summary.allRead": "You are all caught up",
  "notif.list.aria": "Notifications",
  "notif.new": "New",
  "notif.open": "Open",
  "notif.markRead": "Mark as read",
  "notif.markUnread": "Mark as unread",
  "notif.dismiss": "Dismiss",
  "notif.markAll": "Mark all as read",
  "notif.clearRead": "Clear read notifications",

  "notif.empty.title": "Nothing here yet",
  "notif.empty.body":
    "When a saved search finds something new, a saved event is about to start or your weekly summary is ready, it appears here. Turn on email alerts on a saved search to get started.",
  "notif.empty.link": "Go to saved items",
  "notif.emptyFiltered.title": "Nothing in this group",
  "notif.emptyFiltered.body": "Try All to see every notification.",

  "notif.pager.aria": "Notification pages",
  "notif.pager.prev": "Newer",
  "notif.pager.next": "Older",
  "notif.pager.status": "Page {page} of {pages}",

  "notif.outcome.done": "Done.",
  "notif.outcome.notFound": "That notification is no longer here.",
  "notif.outcome.failed": "That did not work. Please try again.",

  "notif.kind.search.titleOne": "1 new result for “{query}”",
  "notif.kind.search.title": "{count} new results for “{query}”",
  "notif.kind.search.body": "Open the search to see what is new.",
  "notif.kind.event.title": "Coming up soon: {title}",
  "notif.kind.event.body": "{business} · {when}",
  "notif.kind.digest.titleOne": "1 new thing from your saved places",
  "notif.kind.digest.title": "{count} new things from your saved places",
  "notif.kind.digest.body":
    "New businesses, events and offers from places and businesses you saved.",
  "notif.kind.owner.title": "Your weekly summary for {business}",
  "notif.kind.owner.body":
    "{views} views, {enquiries} enquiries, {awaiting} waiting for a reply.",
} as const;

export const notificationsCy: Record<keyof typeof notificationsEn, string> = {
  "notif.menu": "Hysbysiadau",
  "notif.menuUnread": "Hysbysiadau, heb eu darllen: {count}",
  "notif.triggerUnread": "Cyfrif, hysbysiadau heb eu darllen: {count}",

  "notif.metaTitle": "Hysbysiadau",
  "notif.eyebrow": "Eich cyfrif",
  "notif.title": "Hysbysiadau",
  "notif.lead":
    "Beth sydd wedi newid yn y lleoedd, y chwiliadau a'r busnesau rydych yn eu dilyn, wedi'i gadw yma fel nad yw e-bost a gollwyd yn newyddion a gollwyd.",
  "notif.back": "Yn ôl i fy nghyfrif",
  "notif.settings": "Dewiswch beth rydych am gael gwybod amdano",
  "notif.demo":
    "Cyfrif arddangos cyhoeddus yw hwn, felly nid oes ganddo hysbysiadau.",
  "notif.unavailable":
    "Doedd dim modd llwytho'r hysbysiadau ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "notif.filter.aria": "Dangos hysbysiadau am",
  "notif.filter.all": "Y cyfan",
  "notif.filter.saved": "Wedi'u cadw a'u dilyn",
  "notif.filter.business": "Fy musnesau",
  "notif.summary.unread": "{count} heb eu darllen i gyd",
  "notif.summary.allRead": "Rydych wedi dal i fyny",
  "notif.list.aria": "Hysbysiadau",
  "notif.new": "Newydd",
  "notif.open": "Agor",
  "notif.markRead": "Marcio fel wedi'i ddarllen",
  "notif.markUnread": "Marcio fel heb ei ddarllen",
  "notif.dismiss": "Diystyru",
  "notif.markAll": "Marcio pob un fel wedi'i ddarllen",
  "notif.clearRead": "Clirio'r hysbysiadau a ddarllenwyd",

  "notif.empty.title": "Dim byd yma eto",
  "notif.empty.body":
    "Pan fydd chwiliad a gadwyd yn dod o hyd i rywbeth newydd, pan fydd digwyddiad a gadwyd ar fin dechrau neu pan fydd eich crynodeb wythnosol yn barod, bydd yn ymddangos yma. Trowch rybuddion e-bost ymlaen ar chwiliad a gadwyd i ddechrau.",
  "notif.empty.link": "Mynd i'r eitemau a gadwyd",
  "notif.emptyFiltered.title": "Dim byd yn y grŵp hwn",
  "notif.emptyFiltered.body": "Rhowch gynnig ar Y cyfan i weld pob hysbysiad.",

  "notif.pager.aria": "Tudalennau hysbysiadau",
  "notif.pager.prev": "Newyddach",
  "notif.pager.next": "Hŷn",
  "notif.pager.status": "Tudalen {page} o {pages}",

  "notif.outcome.done": "Wedi'i wneud.",
  "notif.outcome.notFound": "Nid yw'r hysbysiad hwnnw yma mwyach.",
  "notif.outcome.failed": "Ni weithiodd hynny. Rhowch gynnig arall arni.",

  "notif.kind.search.titleOne": "1 canlyniad newydd ar gyfer “{query}”",
  "notif.kind.search.title": "{count} canlyniad newydd ar gyfer “{query}”",
  "notif.kind.search.body": "Agorwch y chwiliad i weld beth sy'n newydd.",
  "notif.kind.event.title": "Yn dod cyn bo hir: {title}",
  "notif.kind.event.body": "{business} · {when}",
  "notif.kind.digest.titleOne": "1 peth newydd o'ch lleoedd a gadwyd",
  "notif.kind.digest.title": "{count} peth newydd o'ch lleoedd a gadwyd",
  "notif.kind.digest.body":
    "Busnesau, digwyddiadau a chynigion newydd o'r lleoedd a'r busnesau a gadwyd gennych.",
  "notif.kind.owner.title": "Eich crynodeb wythnosol ar gyfer {business}",
  "notif.kind.owner.body":
    "{views} golwg, {enquiries} ymholiad, {awaiting} yn aros am ateb.",
};
