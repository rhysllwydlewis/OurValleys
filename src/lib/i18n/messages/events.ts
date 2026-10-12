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
  "eventsx.addToCalendarAria": "Add {title} to your calendar",
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
  "eventsx.addToCalendarAria": "Ychwanegu {title} at eich calendr",
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
};
