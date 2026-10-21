/**
 * Strings for the owner's visitor-suggestions page
 * (`/dashboard/business/[id]/corrections`) and the hub step that leads to it.
 * Spread into the main catalogues. Welsh is first-draft and needs review by a
 * fluent Welsh speaker before launch.
 */
export const correctionsEn = {
  "hub.tab.corrections": "Suggestions",
  "corr.tabBadge": "{count} waiting",
  "corr.metaTitle": "Visitor suggestions",
  "corr.back": "Back to your dashboard",
  "corr.eyebrow": "Visitor suggestions",
  "corr.title": "Suggestions from visitors",
  "corr.lead": "Fixes people have suggested for your page.",
  "corr.intro":
    "When someone spots something out of date on your page, they can suggest a fix. Nothing changes until you decide: apply it, mark it handled, decline it, or pass it to an OurValleys reviewer if you are unsure.",
  "corr.demo":
    "This is a public demonstration account, so suggestions can be looked at here but not decided.",
  "corr.unavailable":
    "Suggestions could not be loaded just now. Try again soon.",

  "corr.empty.title": "No suggestions waiting",
  "corr.empty.body":
    "When a visitor suggests a correction to your page it will appear here, and a number will show on this tab.",
  "corr.open.heading": "Waiting for you ({count})",
  "corr.sent": "Sent {date}",
  "corr.detailsLabel": "What the visitor wrote",
  "corr.suggested": "Suggested",
  "corr.today": "Your page today",
  "corr.removed": "(remove it)",
  "corr.empty.value": "(nothing)",
  "corr.alreadyMatches": "Your page already shows this.",
  "corr.withTeam": "With an OurValleys reviewer",
  "corr.withTeamBody":
    "You passed this on. A reviewer will decide, and the result will show here under recently decided.",

  "corr.field.publicPhone": "Phone number",
  "corr.field.publicEmail": "Email address",
  "corr.field.summary": "Short description",
  "corr.field.description": "Full description",
  "corr.note.hours": "Opening hours suggested",
  "corr.note.address": "Address or new location suggested",
  "corr.notesHelp":
    "Hours and addresses are shown for you to check. Update them in your profile or hours editor if they are right, then mark this as handled.",

  "corr.noteLabel": "Note for your records (optional)",
  "corr.notePlaceholder": "Why you decided this",
  "corr.act.apply": "Apply to my page",
  "corr.act.handled": "Mark as handled",
  "corr.act.decline": "Decline",
  "corr.act.escalate": "Ask a reviewer",
  "corr.help.withChanges":
    "Apply updates the details above on your public page straight away.",
  "corr.help.notesOnly":
    "Nothing here can be applied automatically. Update your page yourself if it is right, then mark it handled.",

  "corr.recent.heading": "Recently decided",
  "corr.state.applied": "Applied",
  "corr.state.handled": "Handled",
  "corr.state.declined": "Declined",
  "corr.state.closed": "Closed by a reviewer",

  "corr.outcome.applied": "Applied. Your public page now shows the change.",
  "corr.outcome.handled": "Marked as handled.",
  "corr.outcome.declined": "Declined. Nothing on your page changed.",
  "corr.outcome.escalated":
    "Passed to an OurValleys reviewer. Nothing on your page changed.",
  "corr.outcome.forbidden":
    "You do not have permission to decide suggestions for this business.",
  "corr.outcome.invalid": "That request was not valid. Try again.",
  "corr.outcome.gone":
    "That suggestion has already been decided or is no longer available.",
  "corr.outcome.note_too_long": "Keep your note under 500 characters.",
  "corr.outcome.nothing_to_apply":
    "This suggestion has no details to apply. Mark it handled or decline it.",
  "corr.outcome.unavailable":
    "That could not be saved just now. Try again soon.",

  "hub.step.review_corrections.title": "{count} visitor suggestions to review",
  "hub.step.review_corrections.titleOne": "1 visitor suggestion to review",
  "hub.step.review_corrections.body":
    "Someone thinks something on your page is out of date. Apply the fix, or decline it, in a click.",
  "hub.step.review_corrections.cta": "Review suggestions",
} as const;

export const correctionsCy = {
  "hub.tab.corrections": "Awgrymiadau",
  "corr.tabBadge": "{count} yn aros",
  "corr.metaTitle": "Awgrymiadau gan ymwelwyr",
  "corr.back": "Yn ôl i’ch dangosfwrdd",
  "corr.eyebrow": "Awgrymiadau gan ymwelwyr",
  "corr.title": "Awgrymiadau gan ymwelwyr",
  "corr.lead": "Cywiriadau y mae pobl wedi’u hawgrymu ar gyfer eich tudalen.",
  "corr.intro":
    "Pan fydd rhywun yn sylwi ar rywbeth sydd wedi dyddio ar eich tudalen, gallant awgrymu cywiriad. Does dim yn newid nes i chi benderfynu: ei gymhwyso, ei nodi wedi’i drin, ei wrthod, neu ei basio i adolygydd OurValleys os nad ydych yn siŵr.",
  "corr.demo":
    "Cyfrif arddangos cyhoeddus yw hwn, felly gellir edrych ar awgrymiadau yma ond nid penderfynu arnynt.",
  "corr.unavailable":
    "Nid oedd modd llwytho’r awgrymiadau ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "corr.empty.title": "Dim awgrymiadau’n aros",
  "corr.empty.body":
    "Pan fydd ymwelydd yn awgrymu cywiriad i’ch tudalen bydd yn ymddangos yma, a bydd rhif i’w weld ar y tab hwn.",
  "corr.open.heading": "Yn aros amdanoch ({count})",
  "corr.sent": "Anfonwyd {date}",
  "corr.detailsLabel": "Yr hyn a ysgrifennodd yr ymwelydd",
  "corr.suggested": "Awgrymwyd",
  "corr.today": "Eich tudalen heddiw",
  "corr.removed": "(ei dynnu)",
  "corr.empty.value": "(dim byd)",
  "corr.alreadyMatches": "Mae eich tudalen eisoes yn dangos hyn.",
  "corr.withTeam": "Gydag adolygydd OurValleys",
  "corr.withTeamBody":
    "Fe wnaethoch basio hyn ymlaen. Bydd adolygydd yn penderfynu, a bydd y canlyniad i’w weld yma o dan benderfynwyd yn ddiweddar.",

  "corr.field.publicPhone": "Rhif ffôn",
  "corr.field.publicEmail": "Cyfeiriad e-bost",
  "corr.field.summary": "Disgrifiad byr",
  "corr.field.description": "Disgrifiad llawn",
  "corr.note.hours": "Oriau agor a awgrymwyd",
  "corr.note.address": "Cyfeiriad neu leoliad newydd a awgrymwyd",
  "corr.notesHelp":
    "Dangosir oriau a chyfeiriadau i chi eu gwirio. Diweddarwch nhw yn eich proffil neu’ch golygydd oriau os ydynt yn gywir, yna nodwch hwn wedi’i drin.",

  "corr.noteLabel": "Nodyn ar gyfer eich cofnodion (dewisol)",
  "corr.notePlaceholder": "Pam y gwnaethoch benderfynu hyn",
  "corr.act.apply": "Cymhwyso i fy nhudalen",
  "corr.act.handled": "Nodi wedi’i drin",
  "corr.act.decline": "Gwrthod",
  "corr.act.escalate": "Gofyn i adolygydd",
  "corr.help.withChanges":
    "Mae cymhwyso yn diweddaru’r manylion uchod ar eich tudalen gyhoeddus ar unwaith.",
  "corr.help.notesOnly":
    "Ni ellir cymhwyso dim yma’n awtomatig. Diweddarwch eich tudalen eich hun os yw’n gywir, yna nodwch ei fod wedi’i drin.",

  "corr.recent.heading": "Penderfynwyd yn ddiweddar",
  "corr.state.applied": "Wedi’i gymhwyso",
  "corr.state.handled": "Wedi’i drin",
  "corr.state.declined": "Wedi’i wrthod",
  "corr.state.closed": "Wedi’i gau gan adolygydd",

  "corr.outcome.applied":
    "Wedi’i gymhwyso. Mae eich tudalen gyhoeddus bellach yn dangos y newid.",
  "corr.outcome.handled": "Wedi’i nodi wedi’i drin.",
  "corr.outcome.declined": "Wedi’i wrthod. Ni newidiodd dim ar eich tudalen.",
  "corr.outcome.escalated":
    "Wedi’i basio i adolygydd OurValleys. Ni newidiodd dim ar eich tudalen.",
  "corr.outcome.forbidden":
    "Nid oes gennych ganiatâd i benderfynu ar awgrymiadau ar gyfer y busnes hwn.",
  "corr.outcome.invalid":
    "Nid oedd y cais yn ddilys. Rhowch gynnig arall arni.",
  "corr.outcome.gone":
    "Mae’r awgrym hwn eisoes wedi’i benderfynu neu nid yw ar gael mwyach.",
  "corr.outcome.note_too_long": "Cadwch eich nodyn dan 500 nod.",
  "corr.outcome.nothing_to_apply":
    "Nid oes manylion i’w cymhwyso yn yr awgrym hwn. Nodwch ef wedi’i drin neu gwrthodwch ef.",
  "corr.outcome.unavailable":
    "Nid oedd modd cadw hynny ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "hub.step.review_corrections.title":
    "{count} awgrym gan ymwelwyr i’w hadolygu",
  "hub.step.review_corrections.titleOne": "1 awgrym gan ymwelydd i’w adolygu",
  "hub.step.review_corrections.body":
    "Mae rhywun yn meddwl bod rhywbeth ar eich tudalen wedi dyddio. Cymhwyswch y cywiriad, neu gwrthodwch ef, gydag un clic.",
  "hub.step.review_corrections.cta": "Adolygu awgrymiadau",
} as const;
