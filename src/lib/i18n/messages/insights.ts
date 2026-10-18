/**
 * Strings added by the owner insights overhaul
 * (`/dashboard/business/[id]/insights`). Spread into the main catalogues. Welsh
 * is first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const insightsEn = {
  "hub.tab.insights": "Insights",
  "insights.metaTitle": "Insights",
  "insights.back": "Back to your dashboard",
  "insights.eyebrow": "How people find you",
  "insights.title": "Insights",
  "insights.lead":
    "Who looked at your website, where they came from and what they did next. Counted without recording who anyone is.",
  "insights.periodAria": "Choose the period to show",
  "insights.days": "{days} days",
  "insights.period": "Last {days} days, compared with the {days} days before",
  "insights.export": "Download daily figures (CSV)",
  "insights.viewSite": "View your website",
  "insights.noAccess":
    "Your role on this business does not include insights. Ask an owner or manager if you need them.",
  "insights.noAccess.back": "Back to your dashboard",
  "insights.demo":
    "Insights are switched off for the public demo accounts. Sign in with your own account to see your figures.",
  "insights.empty.title": "No visits recorded yet",
  "insights.empty.body":
    "Insights start filling in as soon as people visit your published website. Share the link, or print your QR code for the shop window, the counter or a flyer.",
  "insights.empty.notLive":
    "Your website is not published yet, so there is nothing to count. Publish it and the first visits will appear here.",
  "insights.empty.qr": "Get your QR code",
  "insights.empty.dashboard": "Finish your website",
  "insights.kpi.views": "Page views",
  "insights.kpi.visitors": "Approx. visitors",
  "insights.kpi.searches": "Seen in search",
  "insights.kpi.contacts": "Got in touch",
  "insights.kpi.qr": "QR code scans",
  "insights.kpi.visitorsNote":
    "An estimate: different people on one network can count as one.",
  "insights.kpi.contactsNote": "Contact button uses plus enquiries.",
  "insights.change.none": "Nothing yet",
  "insights.change.same": "Same as before",
  "insights.change.new": "{delta} more than before",
  "insights.change.up": "{percent}% up",
  "insights.change.down": "{percent}% down",
  "insights.highlights.title": "What stands out",
  "insights.highlights.quiet":
    "Not much to report yet. Once a few people have visited, the patterns will show here.",
  "insights.highlight.views.up":
    "Your page views are up {percent}% on the period before.",
  "insights.highlight.views.down":
    "Your page views are down {percent}% on the period before.",
  "insights.highlight.views.new":
    "{delta} more page views than in the period before, which had none.",
  "insights.highlight.topSource":
    "Most visitors came from {source} ({percent}% of visits).",
  "insights.highlight.busiestDay": "{day} is your busiest day of the week.",
  "insights.highlight.topChannel":
    "{channel} was the most used way to get in touch ({count} times).",
  "insights.highlight.contactRate":
    "About {percent} in every 100 visits led to someone getting in touch.",
  "insights.highlight.noContact":
    "People are visiting but nobody has used a contact button or the enquiry form yet. Check your contact details are easy to find.",
  "insights.highlight.noQr":
    "Nobody has scanned your QR code in this period. Printing it for the window or counter lets passers-by reach your website.",
  "insights.trend.title": "Visits each day",
  "insights.trend.summary":
    "{total} page views in {days} days. Busiest day: {peak} ({views}).",
  "insights.trend.contactsTitle": "Got in touch each day",
  "insights.trend.partial": "The first day covers only part of the day.",
  "insights.trend.table": "Show the figures as a table",
  "insights.trend.tableCaption": "Daily figures for the last {days} days",
  "insights.trend.col.date": "Day",
  "insights.trend.col.views": "Page views",
  "insights.trend.col.contacts": "Contact buttons",
  "insights.trend.col.enquiries": "Enquiries",
  "insights.sources.title": "Where visitors came from",
  "insights.sources.lead":
    "Based on the page each visitor arrived from. Only the kind of place is kept, never the address.",
  "insights.sources.empty": "No visits to attribute yet.",
  "insights.source.qr": "Your QR code",
  "insights.source.directory": "The Our Valleys directory",
  "insights.source.search": "Our Valleys search",
  "insights.source.map": "The valleys map",
  "insights.source.whats_on": "What's on and offers",
  "insights.source.news_guides": "News and guides",
  "insights.source.home": "The Our Valleys home page",
  "insights.source.search_engine": "A search engine",
  "insights.source.social": "Social media or messaging",
  "insights.source.other_site": "Another website",
  "insights.source.direct": "A direct link or bookmark",
  "insights.source.count.one": "{count} visit",
  "insights.source.count.other": "{count} visits",
  "insights.funnel.title": "From finding you to getting in touch",
  "insights.funnel.lead":
    "Bars are scaled to the largest number, so they show shape rather than a strict funnel: visits also come from links, QR codes and word of mouth.",
  "insights.funnel.appearances": "Appeared in search and listings",
  "insights.funnel.views": "Visited your website",
  "insights.funnel.contacts": "Got in touch",
  "insights.funnel.rate":
    "About {percent} in every 100 visits led to someone getting in touch.",
  "insights.funnel.rateNone": "No visits yet to measure against.",
  "insights.channels.title": "How people got in touch",
  "insights.channels.lead":
    "Counts a contact button being used, not a call connecting or an email arriving.",
  "insights.channels.empty": "No contact buttons used in this period.",
  "insights.channels.enquiries": "Enquiry form messages",
  "insights.channel.call_click": "Call button",
  "insights.channel.email_click": "Email button",
  "insights.channel.directions_click": "Directions",
  "insights.channel.external_click": "Website and other links",
  "insights.channel.booking_click": "Booking link",
  "insights.channel.order_click": "Order link",
  "insights.surfaces.title": "Where on your website",
  "insights.surface.business_website": "Main page",
  "insights.surface.offer": "Offers",
  "insights.surface.event": "Events",
  "insights.surface.menu_document": "Menu document",
  "insights.surface.other": "Elsewhere",
  "insights.weekdays.title": "Busiest days of the week",
  "insights.weekdays.lead": "Page views added up for each weekday.",
  "insights.weekdays.empty": "Not enough visits yet to show a pattern.",
  "insights.weekdays.row": "{day}: {views} page views",
  "insights.privacy.title": "How these figures are counted",
  "insights.privacy.body":
    "Visits are counted without cookies and without recording who anyone is. Your own preview never counts. Times are Europe/London. Figures can be a little low when a browser blocks counting.",
  "insights.unavailable":
    "Some figures could not be loaded just now. Refresh in a minute.",
} as const;

export const insightsCy: Record<keyof typeof insightsEn, string> = {
  "hub.tab.insights": "Mewnwelediad",
  "insights.metaTitle": "Mewnwelediad",
  "insights.back": "Yn ôl i’ch dangosfwrdd",
  "insights.eyebrow": "Sut mae pobl yn dod o hyd i chi",
  "insights.title": "Mewnwelediad",
  "insights.lead":
    "Pwy edrychodd ar eich gwefan, o ble y daethant a beth wnaethant nesaf. Cyfrif heb gofnodi pwy yw neb.",
  "insights.periodAria": "Dewiswch y cyfnod i’w ddangos",
  "insights.days": "{days} diwrnod",
  "insights.period":
    "{days} diwrnod diwethaf, o’i gymharu â’r {days} diwrnod cyn hynny",
  "insights.export": "Lawrlwytho’r ffigurau dyddiol (CSV)",
  "insights.viewSite": "Gweld eich gwefan",
  "insights.noAccess":
    "Nid yw eich rôl ar y busnes hwn yn cynnwys mewnwelediad. Gofynnwch i berchennog neu reolwr os oes eu hangen arnoch.",
  "insights.noAccess.back": "Yn ôl i’ch dangosfwrdd",
  "insights.demo":
    "Mae mewnwelediad wedi’i ddiffodd ar gyfer y cyfrifon arddangos cyhoeddus. Mewngofnodwch â’ch cyfrif eich hun i weld eich ffigurau.",
  "insights.empty.title": "Dim ymweliadau wedi’u cofnodi eto",
  "insights.empty.body":
    "Bydd mewnwelediad yn dechrau llenwi cyn gynted ag y bydd pobl yn ymweld â’ch gwefan gyhoeddedig. Rhannwch y ddolen, neu argraffwch eich cod QR ar gyfer ffenestr y siop, y cownter neu daflen.",
  "insights.empty.notLive":
    "Nid yw eich gwefan wedi’i chyhoeddi eto, felly does dim i’w gyfrif. Cyhoeddwch hi a bydd yr ymweliadau cyntaf yn ymddangos yma.",
  "insights.empty.qr": "Cael eich cod QR",
  "insights.empty.dashboard": "Gorffen eich gwefan",
  "insights.kpi.views": "Golygon tudalen",
  "insights.kpi.visitors": "Ymwelwyr bras",
  "insights.kpi.searches": "Gweld mewn chwilio",
  "insights.kpi.contacts": "Cysylltu â chi",
  "insights.kpi.qr": "Sganiau cod QR",
  "insights.kpi.visitorsNote":
    "Amcangyfrif: gall gwahanol bobl ar un rhwydwaith gyfrif fel un.",
  "insights.kpi.contactsNote": "Defnydd o fotymau cysylltu ac ymholiadau.",
  "insights.change.none": "Dim eto",
  "insights.change.same": "Yr un peth ag o’r blaen",
  "insights.change.new": "{delta} yn fwy nag o’r blaen",
  "insights.change.up": "i fyny {percent}%",
  "insights.change.down": "i lawr {percent}%",
  "insights.highlights.title": "Beth sy’n sefyll allan",
  "insights.highlights.quiet":
    "Dim llawer i’w adrodd eto. Unwaith y bydd ychydig o bobl wedi ymweld, bydd y patrymau’n dangos yma.",
  "insights.highlight.views.up":
    "Mae eich golygon tudalen i fyny {percent}% o’i gymharu â’r cyfnod cynt.",
  "insights.highlight.views.down":
    "Mae eich golygon tudalen i lawr {percent}% o’i gymharu â’r cyfnod cynt.",
  "insights.highlight.views.new":
    "{delta} yn fwy o olygon tudalen nag yn y cyfnod cynt, nad oedd ganddo’r un.",
  "insights.highlight.topSource":
    "Daeth y rhan fwyaf o ymwelwyr o: {source} ({percent}% o ymweliadau).",
  "insights.highlight.busiestDay":
    "{day} yw eich diwrnod prysuraf o’r wythnos.",
  "insights.highlight.topChannel":
    "{channel} oedd y ffordd fwyaf poblogaidd o gysylltu ({count} gwaith).",
  "insights.highlight.contactRate":
    "Arweiniodd tua {percent} ym mhob 100 ymweliad at rywun yn cysylltu.",
  "insights.highlight.noContact":
    "Mae pobl yn ymweld ond does neb wedi defnyddio botwm cysylltu na’r ffurflen ymholiad eto. Gwiriwch fod eich manylion cyswllt yn hawdd eu canfod.",
  "insights.highlight.noQr":
    "Does neb wedi sganio eich cod QR yn y cyfnod hwn. Mae ei argraffu ar gyfer y ffenestr neu’r cownter yn helpu pobl sy’n pasio i gyrraedd eich gwefan.",
  "insights.trend.title": "Ymweliadau bob dydd",
  "insights.trend.summary":
    "{total} golwg tudalen mewn {days} diwrnod. Diwrnod prysuraf: {peak} ({views}).",
  "insights.trend.contactsTitle": "Cysylltu â chi bob dydd",
  "insights.trend.partial":
    "Dim ond rhan o’r diwrnod y mae’r diwrnod cyntaf yn ei gynnwys.",
  "insights.trend.table": "Dangos y ffigurau fel tabl",
  "insights.trend.tableCaption":
    "Ffigurau dyddiol ar gyfer y {days} diwrnod diwethaf",
  "insights.trend.col.date": "Diwrnod",
  "insights.trend.col.views": "Golygon tudalen",
  "insights.trend.col.contacts": "Botymau cysylltu",
  "insights.trend.col.enquiries": "Ymholiadau",
  "insights.sources.title": "O ble y daeth ymwelwyr",
  "insights.sources.lead":
    "Yn seiliedig ar y dudalen y cyrhaeddodd pob ymwelydd ohoni. Dim ond y math o le a gedwir, byth y cyfeiriad.",
  "insights.sources.empty": "Dim ymweliadau i’w priodoli eto.",
  "insights.source.qr": "Eich cod QR",
  "insights.source.directory": "Cyfeiriadur Ein Cymoedd",
  "insights.source.search": "Chwilio Ein Cymoedd",
  "insights.source.map": "Map y cymoedd",
  "insights.source.whats_on": "Beth sydd ymlaen a chynigion",
  "insights.source.news_guides": "Newyddion a chanllawiau",
  "insights.source.home": "Hafan Ein Cymoedd",
  "insights.source.search_engine": "Peiriant chwilio",
  "insights.source.social": "Cyfryngau cymdeithasol neu negeseua",
  "insights.source.other_site": "Gwefan arall",
  "insights.source.direct": "Dolen uniongyrchol neu nod tudalen",
  "insights.source.count.one": "{count} ymweliad",
  "insights.source.count.other": "{count} ymweliad",
  "insights.funnel.title": "O ddod o hyd i chi i gysylltu â chi",
  "insights.funnel.lead":
    "Mae’r bariau wedi’u graddio i’r rhif mwyaf, felly maent yn dangos siâp yn hytrach na twndis caeth: daw ymweliadau hefyd o ddolenni, codau QR a llafar gwlad.",
  "insights.funnel.appearances": "Ymddangos mewn chwilio a rhestrau",
  "insights.funnel.views": "Ymweld â’ch gwefan",
  "insights.funnel.contacts": "Cysylltu â chi",
  "insights.funnel.rate":
    "Arweiniodd tua {percent} ym mhob 100 ymweliad at rywun yn cysylltu.",
  "insights.funnel.rateNone": "Dim ymweliadau eto i’w mesur yn eu herbyn.",
  "insights.channels.title": "Sut y cysylltodd pobl",
  "insights.channels.lead":
    "Mae’n cyfrif botwm cysylltu’n cael ei ddefnyddio, nid galwad yn cysylltu nac e-bost yn cyrraedd.",
  "insights.channels.empty":
    "Dim botymau cysylltu wedi’u defnyddio yn y cyfnod hwn.",
  "insights.channels.enquiries": "Negeseuon ffurflen ymholiad",
  "insights.channel.call_click": "Botwm galw",
  "insights.channel.email_click": "Botwm e-bost",
  "insights.channel.directions_click": "Cyfarwyddiadau",
  "insights.channel.external_click": "Gwefan a dolenni eraill",
  "insights.channel.booking_click": "Dolen archebu",
  "insights.channel.order_click": "Dolen archebu ar-lein",
  "insights.surfaces.title": "Ble ar eich gwefan",
  "insights.surface.business_website": "Y brif dudalen",
  "insights.surface.offer": "Cynigion",
  "insights.surface.event": "Digwyddiadau",
  "insights.surface.menu_document": "Dogfen y fwydlen",
  "insights.surface.other": "Mewn mannau eraill",
  "insights.weekdays.title": "Diwrnodau prysuraf yr wythnos",
  "insights.weekdays.lead":
    "Golygon tudalen wedi’u hadio ar gyfer pob diwrnod o’r wythnos.",
  "insights.weekdays.empty": "Dim digon o ymweliadau eto i ddangos patrwm.",
  "insights.weekdays.row": "{day}: {views} golwg tudalen",
  "insights.privacy.title": "Sut mae’r ffigurau hyn yn cael eu cyfrif",
  "insights.privacy.body":
    "Mae ymweliadau’n cael eu cyfrif heb gwcis a heb gofnodi pwy yw neb. Nid yw eich rhagolwg eich hun byth yn cyfrif. Amser Ewrop/Llundain yw’r amseroedd. Gall ffigurau fod ychydig yn isel pan fo porwr yn rhwystro cyfrif.",
  "insights.unavailable":
    "Nid oedd modd llwytho rhai ffigurau ar hyn o bryd. Adnewyddwch ymhen munud.",
};
