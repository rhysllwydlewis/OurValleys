/**
 * Strings for the public suggestion, report and claim forms. Kept in their own
 * module and spread into the main catalogues so the slice stays easy to merge.
 * Welsh is first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const formsEn = {
  "formsCommon.thankYou": "Thank you",
  "formsCommon.sending": "Sending…",
  "formsCommon.sendFailed": "This could not be sent. Please try again shortly.",
  "formsCommon.breadcrumb": "Breadcrumb",

  "suggest.metaTitle": "Suggest a local business",
  "suggest.metaDescription":
    "Tell OurValleys about a local business that is missing from the directory.",
  "suggest.back": "Browse businesses",
  "suggest.eyebrow": "Can't find it?",
  "suggest.title": "Suggest a local business",
  "suggest.leadBefore":
    "Tell us about a business that should be listed. Suggestions go to an OurValleys reviewer only: nothing is published automatically and we do not contact the business in your name. Suggestions and any email you give are deleted after twelve months. See the ",
  "suggest.privacyLink": "privacy notice",
  "suggest.sentTitle": "Your suggestion has been received.",
  "suggest.sentBody":
    "An OurValleys reviewer will look at it. Nothing is published automatically and the business is not contacted on your behalf.",
  "suggest.name": "Business name",
  "suggest.place": "Town or village",
  "suggest.category": "What kind of business? (optional)",
  "suggest.categoryPlaceholder": "For example café, plumber or football club",
  "suggest.note": "Anything we should know? (optional)",
  "suggest.email": "Your email (optional)",
  "suggest.emailPlaceholder": "Only if you'd like us to tell you what happens",
  "suggest.honeypot": "Leave this field empty",
  "suggest.invalid": "Please check the business name, town and email address.",
  "suggest.rateLimited":
    "You have sent several suggestions recently. Please try again later.",
  "suggest.submit": "Send suggestion",

  "report.businessMetaTitle": "Report incorrect information",
  "report.eventMetaTitle": "Report an event",
  "report.businessBack": "All local businesses",
  "report.eventBack": "All local events",
  "report.eyebrowBusiness": "Report incorrect information",
  "report.eyebrowEvent": "Report an event",
  "report.lead":
    "Tell us what needs correcting. Reports go to an OurValleys reviewer and never change the listing automatically.",
  "report.sentTitle": "Your report has been sent.",
  "report.sentBody":
    "An OurValleys reviewer will look into this. Reports never publish automatically or change the listing on their own.",
  "report.reason": "What's wrong?",
  "report.details": "What should be corrected?",
  "report.detailsPlaceholder": "Explain what is wrong and how you know.",
  "report.reason.incorrect_details":
    "Incorrect details (address, phone, hours)",
  "report.reason.closed_or_moved": "This business has closed or moved",
  "report.reason.inappropriate_content": "Inappropriate or offensive content",
  "report.reason.duplicate_listing": "Duplicate business page",
  "report.reason.other": "Something else",
  "report.eventReason.incorrect_details":
    "Incorrect details (date, time, location)",
  "report.eventReason.cancelled_or_wrong_date":
    "This event has been cancelled or the date is wrong",
  "report.eventReason.inappropriate_content":
    "Inappropriate or offensive content",
  "report.eventReason.duplicate_listing": "Duplicate event listing",
  "report.eventReason.other": "Something else",
  "report.suggestedLegend": "Suggested public details (optional)",
  "report.suggestedHelp":
    "Add only details you are confident are public and correct. A reviewer must approve them before anything changes.",
  "report.suggestedPhone": "Correct public phone",
  "report.suggestedEmail": "Correct public email",
  "report.suggestedSummary": "Correct short description",
  "report.email": "Your email (optional)",
  "report.emailPlaceholder": "Only if you'd like a reply",
  "report.submit": "Send report",

  "claim.metaTitle": "Claim a business",
  "claim.back": "← Back to {business}",
  "claim.eyebrow": "Ownership claim",
  "claim.title": "Request access to {business}",
  "claim.lead":
    "Formal proof is not mandatory to start a claim. Give the review team enough accurate information to distinguish a genuine connection from impersonation or a duplicate. Submitting a claim never removes an existing owner automatically.",
  "claim.submittedTitle": "Your claim has been submitted.",
  "claim.submittedBody":
    "An administrator will review the account, business record and evidence. High-impact actions remain confirmed and audited.",
  "claim.signInBefore": "You need an OurValleys account to claim a business. ",
  "claim.signInLink": "Sign in",
  "claim.signInAfter": " first so nothing you type here is lost.",
  "claim.role": "Your connection to the business",
  "claim.role.owner": "Owner",
  "claim.role.manager": "Manager",
  "claim.role.staff": "Member of staff",
  "claim.role.representative": "Authorised representative",
  "claim.reason": "Why should this account receive access?",
  "claim.website": "Existing website or public profile (optional)",
  "claim.phone": "Business telephone number (optional)",
  "claim.evidence": "Other evidence or differences to note (optional)",
  "claim.verifyEmail":
    "Verify your account email before submitting an ownership claim.",
  "claim.failed":
    "The claim could not be submitted. Check the details and try again.",
  "claim.submit": "Submit ownership claim",
  "invite.metaTitle": "Team invitation",
  "invite.eyebrow": "Team invitation",
  "invite.role.manager": "Manager",
  "invite.role.editor": "Editor",
  "invite.role.viewer": "Viewer",
  "invite.outcome.email_mismatch":
    "Sign in with the email address this invitation was sent to, then try again.",
  "invite.outcome.expired":
    "This invitation has expired. Ask the business to send a new one.",
  "invite.outcome.not_found": "This invitation is no longer valid.",
  "invite.outcome.unavailable":
    "That action is temporarily unavailable. Try again shortly.",
  "invite.goneTitle": "This invitation is no longer available.",
  "invite.goneBody": "It may have already been used, revoked or expired.",
  "invite.joinTitle": "Join {business} as {role}.",
  "invite.joinBody":
    "This invitation was sent to {email}. Accepting it gives your account {role} access to manage this business on OurValleys.",
  "invite.accept": "Accept invitation",
  "invite.wrongAccount":
    "You are signed in as {current}. Sign in with {invited} to accept this invitation.",
  "invite.signInAccept": "Sign in to accept",
  "invite.home": "Return to OurValleys",
  "unsub.metaTitle": "Unsubscribe",
  "unsub.eyebrow": "Email preferences",
  "unsub.saved_event_cancellation.heading": "Saved-event cancellation emails",
  "unsub.saved_event_cancellation.description":
    "You will no longer be emailed when an event you saved is cancelled. You can turn this back on from your account settings at any time.",
  "unsub.saved_place_digest.heading": "Saved-place digest emails",
  "unsub.saved_place_digest.description":
    "You will no longer receive the weekly email about new businesses and events in the places you saved. You can turn this back on from your account settings at any time.",
  "unsub.saved_event_reminder.heading": "Saved-event reminder emails",
  "unsub.saved_event_reminder.description":
    "You will no longer be emailed a reminder the day before an event you saved. You can turn this back on from your account settings at any time.",
  "unsub.business_lifecycle.heading": "Business reminder emails",
  "unsub.business_lifecycle.description":
    "This business will no longer receive publication and account reminder emails. Important account notices, such as confirmed deletion, are unaffected. Owners can turn this back on from the operations dashboard at any time.",
  "unsub.outcome.unsubscribed": "You have been unsubscribed.",
  "unsub.outcome.invalid":
    "This unsubscribe link is invalid or has already been used.",
  "unsub.outcome.unavailable":
    "That action is temporarily unavailable. Try again shortly.",
  "unsub.submit": "Unsubscribe",
  "search.metaTitle": "Search OurValleys",
  "search.metaDescription":
    "Search local businesses, events, places, categories and guides across the South Wales Valleys in one place.",
  "search.eyebrow": "Search",
  "search.title": "Find anything local, in one search.",
  "search.lead":
    "Businesses, events, places, categories and guides from across the Valleys. Only published, public information is searched.",
  "search.formLabel": "Search OurValleys",
  "search.queryLabel": "What are you looking for?",
  "search.placeholder": "A café, a class, a town…",
  "search.submit": "Search",
  "search.idleEyebrow": "Start typing",
  "search.idleTitle": "Enter at least two characters.",
  "search.idleBody":
    "Or browse a section directly: businesses, events, places or guides.",
  "search.browseBusinesses": "Browse businesses",
  "search.browseEvents": "Browse events",
  "search.browsePlaces": "Browse places",
  "search.unavailableEyebrow": "Temporarily unavailable",
  "search.unavailableTitle": "Search is not available right now.",
  "search.unavailableBody":
    "Please try again shortly, or browse the directory instead.",
  "search.noneEyebrow": "No results",
  "search.noneTitle": "Nothing matched “{query}”.",
  "search.noneBody":
    "Check the spelling, try a shorter word, or browse by category or place.",
  "search.countOne": "1 result for “{query}”",
  "search.countMany": "{count} results for “{query}”",
  "search.businesses": "Businesses ({count})",
  "search.events": "Events ({count})",
  "search.places": "Places",
  "search.categories": "Categories",
  "search.guides": "Guides",
  "search.demo": "Fictional demonstration",
  "search.view": "View {business}",
  "search.eventBy": "By {business}",
  "search.eventView": "View details",
  "search.guideRead": "Read the guide",
  "search.seeAllBusinesses": "See all {count} businesses",
  "search.seeAllEvents": "See all {count} events",
} as const satisfies Record<string, string>;

export const formsCy: Record<keyof typeof formsEn, string> = {
  "formsCommon.thankYou": "Diolch",
  "formsCommon.sending": "Yn anfon…",
  "formsCommon.sendFailed":
    "Nid oedd modd anfon hwn. Rhowch gynnig arall arni cyn bo hir.",
  "formsCommon.breadcrumb": "Briwsion bara",

  "suggest.metaTitle": "Awgrymu busnes lleol",
  "suggest.metaDescription":
    "Dywedwch wrth OurValleys am fusnes lleol sydd ar goll o’r cyfeiriadur.",
  "suggest.back": "Pori busnesau",
  "suggest.eyebrow": "Methu dod o hyd iddo?",
  "suggest.title": "Awgrymu busnes lleol",
  "suggest.leadBefore":
    "Dywedwch wrthym am fusnes a ddylai fod ar y rhestr. Dim ond adolygydd OurValleys sy’n gweld awgrymiadau: ni chaiff dim ei gyhoeddi’n awtomatig ac nid ydym yn cysylltu â’r busnes yn eich enw chi. Caiff awgrymiadau ac unrhyw e-bost a roddwch eu dileu ar ôl deuddeg mis. Gweler yr ",
  "suggest.privacyLink": "hysbysiad preifatrwydd",
  "suggest.sentTitle": "Rydym wedi cael eich awgrym.",
  "suggest.sentBody":
    "Bydd adolygydd OurValleys yn edrych arno. Ni chaiff dim ei gyhoeddi’n awtomatig ac nid oes cysylltu â’r busnes ar eich rhan.",
  "suggest.name": "Enw’r busnes",
  "suggest.place": "Tref neu bentref",
  "suggest.category": "Pa fath o fusnes? (dewisol)",
  "suggest.categoryPlaceholder":
    "Er enghraifft caffi, plymwr neu glwb pêl-droed",
  "suggest.note": "Unrhyw beth y dylem ei wybod? (dewisol)",
  "suggest.email": "Eich e-bost (dewisol)",
  "suggest.emailPlaceholder":
    "Dim ond os hoffech inni ddweud wrthych beth sy’n digwydd",
  "suggest.honeypot": "Gadewch y maes hwn yn wag",
  "suggest.invalid": "Gwiriwch enw’r busnes, y dref a’r cyfeiriad e-bost.",
  "suggest.rateLimited":
    "Rydych wedi anfon sawl awgrym yn ddiweddar. Rhowch gynnig arall arni’n nes ymlaen.",
  "suggest.submit": "Anfon yr awgrym",

  "report.businessMetaTitle": "Rhoi gwybod am wybodaeth anghywir",
  "report.eventMetaTitle": "Rhoi gwybod am ddigwyddiad",
  "report.businessBack": "Pob busnes lleol",
  "report.eventBack": "Pob digwyddiad lleol",
  "report.eyebrowBusiness": "Rhoi gwybod am wybodaeth anghywir",
  "report.eyebrowEvent": "Rhoi gwybod am ddigwyddiad",
  "report.lead":
    "Dywedwch wrthym beth sydd angen ei gywiro. Mae adroddiadau’n mynd at adolygydd OurValleys ac nid ydynt byth yn newid y rhestriad yn awtomatig.",
  "report.sentTitle": "Mae eich adroddiad wedi’i anfon.",
  "report.sentBody":
    "Bydd adolygydd OurValleys yn edrych i mewn i hyn. Nid yw adroddiadau byth yn cyhoeddi’n awtomatig nac yn newid y rhestriad ar eu pen eu hunain.",
  "report.reason": "Beth sydd o’i le?",
  "report.details": "Beth ddylid ei gywiro?",
  "report.detailsPlaceholder":
    "Eglurwch beth sydd o’i le a sut rydych yn gwybod.",
  "report.reason.incorrect_details":
    "Manylion anghywir (cyfeiriad, ffôn, oriau)",
  "report.reason.closed_or_moved": "Mae’r busnes hwn wedi cau neu symud",
  "report.reason.inappropriate_content": "Cynnwys amhriodol neu sarhaus",
  "report.reason.duplicate_listing": "Tudalen fusnes ddyblyg",
  "report.reason.other": "Rhywbeth arall",
  "report.eventReason.incorrect_details":
    "Manylion anghywir (dyddiad, amser, lleoliad)",
  "report.eventReason.cancelled_or_wrong_date":
    "Mae’r digwyddiad hwn wedi’i ganslo neu mae’r dyddiad yn anghywir",
  "report.eventReason.inappropriate_content": "Cynnwys amhriodol neu sarhaus",
  "report.eventReason.duplicate_listing": "Rhestriad digwyddiad dyblyg",
  "report.eventReason.other": "Rhywbeth arall",
  "report.suggestedLegend": "Manylion cyhoeddus arfaethedig (dewisol)",
  "report.suggestedHelp":
    "Ychwanegwch ond manylion rydych yn hyderus eu bod yn gyhoeddus ac yn gywir. Rhaid i adolygydd eu cymeradwyo cyn i unrhyw beth newid.",
  "report.suggestedPhone": "Y ffôn cyhoeddus cywir",
  "report.suggestedEmail": "Yr e-bost cyhoeddus cywir",
  "report.suggestedSummary": "Y disgrifiad byr cywir",
  "report.email": "Eich e-bost (dewisol)",
  "report.emailPlaceholder": "Dim ond os hoffech ateb",
  "report.submit": "Anfon yr adroddiad",

  "claim.metaTitle": "Hawlio busnes",
  "claim.back": "← Yn ôl i {business}",
  "claim.eyebrow": "Hawlio perchnogaeth",
  "claim.title": "Gofyn am fynediad i {business}",
  "claim.lead":
    "Nid oes rhaid cael prawf ffurfiol i ddechrau hawliad. Rhowch ddigon o wybodaeth gywir i’r tîm adolygu allu gwahaniaethu rhwng cysylltiad go iawn a thwyllo neu ddyblygu. Nid yw cyflwyno hawliad byth yn dileu perchennog presennol yn awtomatig.",
  "claim.submittedTitle": "Mae eich hawliad wedi’i gyflwyno.",
  "claim.submittedBody":
    "Bydd gweinyddwr yn adolygu’r cyfrif, cofnod y busnes a’r dystiolaeth. Mae camau gweithredu sydd â goblygiadau mawr yn cael eu cadarnhau a’u harchwilio o hyd.",
  "claim.signInBefore": "Mae angen cyfrif OurValleys arnoch i hawlio busnes. ",
  "claim.signInLink": "Mewngofnodwch",
  "claim.signInAfter": " yn gyntaf rhag colli’r hyn rydych yn ei deipio yma.",
  "claim.role": "Eich cysylltiad â’r busnes",
  "claim.role.owner": "Perchennog",
  "claim.role.manager": "Rheolwr",
  "claim.role.staff": "Aelod o staff",
  "claim.role.representative": "Cynrychiolydd awdurdodedig",
  "claim.reason": "Pam y dylai’r cyfrif hwn gael mynediad?",
  "claim.website": "Gwefan neu broffil cyhoeddus presennol (dewisol)",
  "claim.phone": "Rhif ffôn y busnes (dewisol)",
  "claim.evidence": "Tystiolaeth arall neu wahaniaethau i’w nodi (dewisol)",
  "claim.verifyEmail":
    "Gwiriwch e-bost eich cyfrif cyn cyflwyno hawliad perchnogaeth.",
  "claim.failed":
    "Nid oedd modd cyflwyno’r hawliad. Gwiriwch y manylion a rhowch gynnig arall arni.",
  "claim.submit": "Cyflwyno’r hawliad perchnogaeth",
  "invite.metaTitle": "Gwahoddiad i’r tîm",
  "invite.eyebrow": "Gwahoddiad i’r tîm",
  "invite.role.manager": "Rheolwr",
  "invite.role.editor": "Golygydd",
  "invite.role.viewer": "Gwyliwr",
  "invite.outcome.email_mismatch":
    "Mewngofnodwch gyda’r cyfeiriad e-bost yr anfonwyd y gwahoddiad hwn ato, yna rhowch gynnig arall arni.",
  "invite.outcome.expired":
    "Mae’r gwahoddiad hwn wedi dod i ben. Gofynnwch i’r busnes anfon un newydd.",
  "invite.outcome.not_found": "Nid yw’r gwahoddiad hwn yn ddilys mwyach.",
  "invite.outcome.unavailable":
    "Nid yw’r weithred honno ar gael dros dro. Rhowch gynnig arall arni cyn bo hir.",
  "invite.goneTitle": "Nid yw’r gwahoddiad hwn ar gael mwyach.",
  "invite.goneBody":
    "Efallai ei fod eisoes wedi’i ddefnyddio, ei ddirymu neu wedi dod i ben.",
  "invite.joinTitle": "Ymuno â {business} fel {role}.",
  "invite.joinBody":
    "Anfonwyd y gwahoddiad hwn i {email}. Wrth ei dderbyn, caiff eich cyfrif fynediad {role} i reoli’r busnes hwn ar OurValleys.",
  "invite.accept": "Derbyn y gwahoddiad",
  "invite.wrongAccount":
    "Rydych wedi mewngofnodi fel {current}. Mewngofnodwch gyda {invited} i dderbyn y gwahoddiad hwn.",
  "invite.signInAccept": "Mewngofnodi i dderbyn",
  "invite.home": "Dychwelyd i OurValleys",
  "unsub.metaTitle": "Dad-danysgrifio",
  "unsub.eyebrow": "Dewisiadau e-bost",
  "unsub.saved_event_cancellation.heading":
    "E-byst canslo digwyddiadau a gadwyd",
  "unsub.saved_event_cancellation.description":
    "Ni chewch e-bost mwyach pan fydd digwyddiad a gadwyd gennych yn cael ei ganslo. Gallwch droi hyn yn ôl ymlaen o osodiadau eich cyfrif ar unrhyw adeg.",
  "unsub.saved_place_digest.heading": "E-byst crynodeb lleoedd a gadwyd",
  "unsub.saved_place_digest.description":
    "Ni chewch yr e-bost wythnosol mwyach am fusnesau a digwyddiadau newydd yn y lleoedd a gadwyd gennych. Gallwch droi hyn yn ôl ymlaen o osodiadau eich cyfrif ar unrhyw adeg.",
  "unsub.saved_event_reminder.heading": "E-byst atgoffa digwyddiadau a gadwyd",
  "unsub.saved_event_reminder.description":
    "Ni chewch e-bost i’ch atgoffa y diwrnod cyn digwyddiad a gadwyd gennych mwyach. Gallwch droi hyn yn ôl ymlaen o osodiadau eich cyfrif ar unrhyw adeg.",
  "unsub.business_lifecycle.heading": "E-byst atgoffa busnes",
  "unsub.business_lifecycle.description":
    "Ni fydd y busnes hwn yn cael e-byst atgoffa cyhoeddi a chyfrif mwyach. Nid yw hysbysiadau pwysig am y cyfrif, fel dileu wedi’i gadarnhau, yn cael eu heffeithio. Gall perchnogion droi hyn yn ôl ymlaen o’r dangosfwrdd gweithrediadau ar unrhyw adeg.",
  "unsub.outcome.unsubscribed": "Rydych wedi’ch dad-danysgrifio.",
  "unsub.outcome.invalid":
    "Mae’r ddolen ddad-danysgrifio hon yn annilys neu eisoes wedi’i defnyddio.",
  "unsub.outcome.unavailable":
    "Nid yw’r weithred honno ar gael dros dro. Rhowch gynnig arall arni cyn bo hir.",
  "unsub.submit": "Dad-danysgrifio",
  "search.metaTitle": "Chwilio OurValleys",
  "search.metaDescription":
    "Chwiliwch am fusnesau lleol, digwyddiadau, lleoedd, categorïau a chanllawiau ar draws Cymoedd De Cymru mewn un lle.",
  "search.eyebrow": "Chwilio",
  "search.title": "Dewch o hyd i unrhyw beth lleol, mewn un chwiliad.",
  "search.lead":
    "Busnesau, digwyddiadau, lleoedd, categorïau a chanllawiau o bob rhan o’r Cymoedd. Dim ond gwybodaeth gyhoeddedig, gyhoeddus a chwilir.",
  "search.formLabel": "Chwilio OurValleys",
  "search.queryLabel": "Beth rydych chi’n chwilio amdano?",
  "search.placeholder": "Caffi, dosbarth, tref…",
  "search.submit": "Chwilio",
  "search.idleEyebrow": "Dechreuwch deipio",
  "search.idleTitle": "Rhowch o leiaf ddau nod.",
  "search.idleBody":
    "Neu porwch adran yn uniongyrchol: busnesau, digwyddiadau, lleoedd neu ganllawiau.",
  "search.browseBusinesses": "Pori busnesau",
  "search.browseEvents": "Pori digwyddiadau",
  "search.browsePlaces": "Pori lleoedd",
  "search.unavailableEyebrow": "Ddim ar gael dros dro",
  "search.unavailableTitle": "Nid yw chwilio ar gael ar hyn o bryd.",
  "search.unavailableBody":
    "Rhowch gynnig arall arni cyn bo hir, neu porwch y cyfeiriadur yn lle hynny.",
  "search.noneEyebrow": "Dim canlyniadau",
  "search.noneTitle": "Doedd dim yn cyfateb i “{query}”.",
  "search.noneBody":
    "Gwiriwch y sillafu, rhowch gynnig ar air byrrach, neu porwch yn ôl categori neu le.",
  "search.countOne": "1 canlyniad ar gyfer “{query}”",
  "search.countMany": "{count} canlyniad ar gyfer “{query}”",
  "search.businesses": "Busnesau ({count})",
  "search.events": "Digwyddiadau ({count})",
  "search.places": "Lleoedd",
  "search.categories": "Categorïau",
  "search.guides": "Canllawiau",
  "search.demo": "Arddangosiad ffuglennol",
  "search.view": "Gweld {business}",
  "search.eventBy": "Gan {business}",
  "search.eventView": "Gweld y manylion",
  "search.guideRead": "Darllen y canllaw",
  "search.seeAllBusinesses": "Gweld pob un o’r {count} busnes",
  "search.seeAllEvents": "Gweld pob un o’r {count} digwyddiad",
};
