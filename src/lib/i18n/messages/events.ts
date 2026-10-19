/**
 * Strings added by the events overhaul (`/events`): the day strip, the
 * agenda grouped by day, "happening now" and add-to-calendar. Spread into the
 * main catalogues. Welsh is first-draft and needs review by a fluent Welsh
 * speaker before launch.
 */
export const eventsEn = {
  "eventsx.stripTitle": "Pick a day",
  "eventsx.stripAria": "Choose a day to see its events",
  "eventsx.dayEvents": "{day}: {count} events",
  "eventsx.dayOneEvent": "{day}: 1 event",
  "eventsx.dayNoEvents": "{day}: no events",
  "eventsx.stripToday": "Today",
  "eventsx.agendaAria": "Events by day",
  "eventsx.today": "Today",
  "eventsx.tomorrow": "Tomorrow",
  "eventsx.happeningNow": "Happening now",
  "eventsx.addToCalendar": "Add to calendar",
  "eventsx.until": "until {when}",
  "eventsx.filterDay": "Day: {value}",
  "eventsx.removeDay": "Remove day filter {value}",
  "eventsx.showing": "Showing {from}–{to} of {total}",
  "eventsx.pageNumber": "Page {page}",
  "eventsx.pageCurrent": "Page {page}, current page",
  "eventsx.pickedDayEmpty": "Nothing is listed for {day}.",
  "eventsx.pickedDayHint":
    "Try another day on the strip, or look at the next 30 days.",
  "eventsx.lead":
    "Everything happening across the Valleys, day by day, from published local businesses.",
  "eventsx.subscribe": "Subscribe in your calendar app",
  "eventsCal.viewAria": "How to view events",
  "eventsCal.viewList": "List",
  "eventsCal.viewMonth": "Month",
  "eventsCal.monthNavAria": "Choose a month",
  "eventsCal.previous": "Previous month",
  "eventsCal.next": "Next month",
  "eventsCal.thisMonth": "This month",
  "eventsCal.gridHint":
    "Days with events are links. Choose one to read its events below.",
  "eventsCal.more": "+{count} more",
  "eventsCal.dayPanel": "Events on {day}",
  "eventsCal.monthAgenda": "Everything in {month}",
  "eventsCal.showMonth": "Show the whole month",
  "eventsCal.monthCount": "{count} events in {month}",
  "eventsCal.monthCountOne": "1 event in {month}",
  "eventsCal.monthEmpty": "Nothing is listed for {month}.",
  "eventsCal.monthEmptyHint":
    "Try the next month, or clear a filter. Only upcoming events are listed.",
  "eventsCal.pastMonth":
    "This month has passed. Only upcoming events are listed, so its earlier days are empty.",
  "eventsCal.truncated":
    "This month has more events than can be shown here. Narrow the search or choose a place to see the rest.",
  "eventsCal.unavailableTitle": "The calendar is unavailable right now.",
  "eventsCal.unavailableBody":
    "We could not read this month. Try again shortly, or use the list view.",
  "eventsCal.today": "today",
  "eventsCal.dayEmpty": "{day}: no events",
  "eventsCal.listView": "Switch to the list",
} as const satisfies Record<string, string>;

export const eventsCy: Record<keyof typeof eventsEn, string> = {
  "eventsx.stripTitle": "Dewiswch ddiwrnod",
  "eventsx.stripAria": "Dewiswch ddiwrnod i weld ei ddigwyddiadau",
  "eventsx.dayEvents": "{day}: {count} digwyddiad",
  "eventsx.dayOneEvent": "{day}: 1 digwyddiad",
  "eventsx.dayNoEvents": "{day}: dim digwyddiadau",
  "eventsx.stripToday": "Heddiw",
  "eventsx.agendaAria": "Digwyddiadau fesul diwrnod",
  "eventsx.today": "Heddiw",
  "eventsx.tomorrow": "Yfory",
  "eventsx.happeningNow": "Yn digwydd nawr",
  "eventsx.addToCalendar": "Ychwanegu at y calendr",
  "eventsx.until": "tan {when}",
  "eventsx.filterDay": "Diwrnod: {value}",
  "eventsx.removeDay": "Tynnu’r hidlydd diwrnod {value}",
  "eventsx.showing": "Yn dangos {from}–{to} o {total}",
  "eventsx.pageNumber": "Tudalen {page}",
  "eventsx.pageCurrent": "Tudalen {page}, y dudalen bresennol",
  "eventsx.pickedDayEmpty": "Does dim byd wedi’i restru ar gyfer {day}.",
  "eventsx.pickedDayHint":
    "Rhowch gynnig ar ddiwrnod arall ar y stribed, neu edrychwch ar y 30 diwrnod nesaf.",
  "eventsx.lead":
    "Popeth sy’n digwydd ar draws y Cymoedd, o ddydd i ddydd, gan fusnesau lleol cyhoeddedig.",
  "eventsx.subscribe": "Tanysgrifio yn eich ap calendr",
  "eventsCal.viewAria": "Sut i weld digwyddiadau",
  "eventsCal.viewList": "Rhestr",
  "eventsCal.viewMonth": "Mis",
  "eventsCal.monthNavAria": "Dewiswch fis",
  "eventsCal.previous": "Y mis blaenorol",
  "eventsCal.next": "Y mis nesaf",
  "eventsCal.thisMonth": "Y mis hwn",
  "eventsCal.gridHint":
    "Mae diwrnodau â digwyddiadau yn ddolenni. Dewiswch un i ddarllen ei ddigwyddiadau isod.",
  "eventsCal.more": "+{count} arall",
  "eventsCal.dayPanel": "Digwyddiadau ar {day}",
  "eventsCal.monthAgenda": "Popeth ym mis {month}",
  "eventsCal.showMonth": "Dangos y mis cyfan",
  "eventsCal.monthCount": "{count} digwyddiad ym mis {month}",
  "eventsCal.monthCountOne": "1 digwyddiad ym mis {month}",
  "eventsCal.monthEmpty": "Does dim byd wedi’i restru ar gyfer {month}.",
  "eventsCal.monthEmptyHint":
    "Rhowch gynnig ar y mis nesaf, neu cliriwch hidlydd. Dim ond digwyddiadau i ddod sy’n cael eu rhestru.",
  "eventsCal.pastMonth":
    "Mae’r mis hwn wedi mynd heibio. Dim ond digwyddiadau i ddod sy’n cael eu rhestru, felly mae ei ddiwrnodau cynharach yn wag.",
  "eventsCal.truncated":
    "Mae gan y mis hwn fwy o ddigwyddiadau nag y gellir eu dangos yma. Cyfyngwch y chwiliad neu dewiswch le i weld y gweddill.",
  "eventsCal.unavailableTitle": "Nid yw’r calendr ar gael ar hyn o bryd.",
  "eventsCal.unavailableBody":
    "Ni allem ddarllen y mis hwn. Rhowch gynnig arall arni cyn bo hir, neu defnyddiwch y rhestr.",
  "eventsCal.today": "heddiw",
  "eventsCal.dayEmpty": "{day}: dim digwyddiadau",
  "eventsCal.listView": "Newid i’r rhestr",
};
