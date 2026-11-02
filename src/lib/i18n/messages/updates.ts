/**
 * Strings for business updates: the owner's Updates tab
 * (`/dashboard/business/[id]/updates`), the business website block and page,
 * and the local feed (`/updates`). Spread into the main catalogues. Welsh is
 * first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const updatesEn = {
  "hub.tab.updates": "Updates",
  "hub.manage.updates.title": "Updates",
  "hub.manage.updates.body":
    "Short news for your website and the local feed: a closure, a new season, a change.",
  "footer.localUpdates": "Local updates",

  "upd.metaTitle": "Updates",
  "upd.back": "Back to your dashboard",
  "upd.eyebrow": "News from your business",
  "upd.title": "Updates",
  "upd.lead":
    "Post a short update and it appears on your website and in the local updates feed.",
  "upd.demo":
    "This is a public demonstration account, so updates can be looked at here but not changed.",
  "upd.unavailable": "Updates could not be loaded just now. Try again soon.",

  "upd.summary.aria": "Updates at a glance",
  "upd.summary.published": "Published",
  "upd.summary.drafts": "Drafts",
  "upd.state.published": "Published",
  "upd.state.draft": "Draft",
  "upd.badge.welsh": "Welsh added",
  "upd.group.published": "Published updates",
  "upd.group.publishedHint": "Visitors can read these on your website.",
  "upd.group.drafts": "Drafts",
  "upd.group.draftsHint": "Only you and your team can see these.",
  "upd.when.published": "Published {date}",
  "upd.when.edited": "Last edited {date}",
  "upd.empty.title": "No updates yet",
  "upd.empty.body":
    "Tell people what is new: a change to opening times, a seasonal menu, a charity event. A few plain sentences are enough.",
  "upd.new.summary": "Write a new update",

  "upd.act.publish": "Publish",
  "upd.act.unpublish": "Unpublish",
  "upd.act.view": "View on website",
  "upd.act.edit": "Edit",
  "upd.act.read": "Read",
  "upd.act.remove": "Delete",
  "upd.act.named": "{action}: {title}",
  "upd.remove.warning":
    "Deleting removes this update and its Welsh version for good. To keep it but hide it, unpublish it instead.",
  "upd.remove.confirm": "Yes, delete this update",

  "upd.tip.welshMissing":
    "Add a Welsh version so Welsh-speaking visitors can read this in Welsh.",
  "upd.tip.welshHalf":
    "The Welsh version needs both a title and text before Welsh readers will see it.",
  "upd.tip.shortBody":
    "A sentence or two more detail helps people know whether this matters to them.",
  "upd.tip.draftReady": "This draft is ready to publish.",

  "upd.form.title": "Headline",
  "upd.form.titleHint":
    "Short and specific, for example “Closed on Monday 3 November”.",
  "upd.form.body": "Update",
  "upd.form.bodyHint":
    "Plain text only. Leave a blank line between paragraphs. Links and formatting are not supported.",
  "upd.form.count": "{count} of {max} characters",
  "upd.form.welshLegend": "Welsh version (optional)",
  "upd.form.welshHint":
    "Welsh readers see this instead of the English. Write both the headline and the text, or leave both empty.",
  "upd.form.titleCy": "Welsh headline",
  "upd.form.titleCyHint": "The same news, in Welsh.",
  "upd.form.bodyCy": "Welsh text",
  "upd.form.bodyCyHint": "Plain text, as for the English.",
  "upd.form.publish": "Publish now",
  "upd.form.saveDraft": "Save as draft",
  "upd.form.saveChanges": "Save changes",
  "upd.form.saving": "Saving…",
  "upd.form.errorsIntro": "Some things need fixing before this can be saved.",

  "upd.err.titleShort": "Add a headline of at least 3 characters.",
  "upd.err.titleLong": "Shorten the headline to 120 characters or fewer.",
  "upd.err.bodyShort": "Write at least 10 characters of text.",
  "upd.err.bodyLong": "Shorten the text to 1,500 characters or fewer.",
  "upd.err.welshTitleMissing": "Add a Welsh headline, or clear the Welsh text.",
  "upd.err.welshBodyMissing":
    "Add the Welsh text, or clear the Welsh headline.",
  "upd.err.welshTitleLong":
    "Shorten the Welsh headline to 120 characters or fewer.",
  "upd.err.welshBodyLong":
    "Shorten the Welsh text to 1,500 characters or fewer.",
  "upd.formError.locked":
    "An administrator removed this update after a report, so it cannot be changed.",
  "upd.outcome.locked":
    "An administrator removed that update after a report, so it cannot be changed.",
  "upd.state.removed": "Removed",
  "upd.summary.removed": "Removed",
  "upd.group.removed": "Removed by an administrator",
  "upd.group.removedHint":
    "Taken down after a report. These cannot be edited, republished or deleted. If you think this was a mistake, get in touch with us.",
  "upd.when.removed": "Removed by an administrator after a report",
  "upd.report": "Report this update",
  "upd.formError.forbidden": "You do not have permission to change updates.",
  "upd.formError.invalid":
    "That form was not valid. Reload the page and try again.",
  "upd.formError.not_found": "That update no longer exists.",
  "upd.formError.stale":
    "Someone else changed this update since you opened it. Reload the page to see their version, then make your change again.",
  "upd.formError.limit":
    "You have reached the limit of 200 updates. Delete some old ones first.",
  "upd.formError.rate":
    "You have published 10 updates in the last 24 hours. Try again later, or save this one as a draft.",
  "upd.formError.unavailable": "Could not save just now. Try again soon.",

  "upd.outcome.draftSaved": "Draft saved.",
  "upd.outcome.saved": "Changes saved.",
  "upd.outcome.published": "Published. It is now on your website.",
  "upd.outcome.unpublished":
    "Unpublished. It is now a draft and no longer public.",
  "upd.outcome.removed": "Update deleted.",
  "upd.outcome.unchanged": "Nothing needed changing.",
  "upd.outcome.forbidden": "You do not have permission to change updates.",
  "upd.outcome.invalid": "That request was not valid.",
  "upd.outcome.not_found": "That update no longer exists.",
  "upd.outcome.rate":
    "You have published 10 updates in the last 24 hours. Try again later.",
  "upd.outcome.limit": "You have reached the limit of 200 updates.",
  "upd.outcome.unavailable": "Could not do that just now. Try again soon.",

  "upd.preview.label": "How it reads",
  "upd.preview.empty": "Start typing to see your update here.",
  "upd.preview.noTitle": "Your headline",
  "upd.preview.welshYes": "Welsh readers will see your Welsh version.",
  "upd.preview.welshNo":
    "Welsh readers will see the English until you add Welsh.",

  "upd.site.nav": "Updates",
  "upd.site.eyebrow": "Latest news",
  "upd.site.title": "Latest updates",
  "upd.site.all": "See all {count} updates",
  "upd.site.metaTitle": "Updates from {business}",
  "upd.site.metaDescription":
    "News and announcements from {business}, in the order they were posted.",
  "upd.site.pageTitle": "Updates from {business}",
  "upd.site.countOne": "1 update",
  "upd.site.count": "{count} updates",
  "upd.site.pageOf": "Page {page} of {total}",

  "upd.feed.metaTitle": "Local updates",
  "upd.feed.metaDescription":
    "The latest news and announcements from local businesses across the South Wales Valleys.",
  "upd.feed.eyebrow": "Local updates",
  "upd.feed.title": "News from local businesses",
  "upd.feed.lead":
    "Closures, new seasons, community news: what businesses across the Valleys have just told us.",
  "upd.feed.searchLabel": "Search updates",
  "upd.feed.searchPlaceholder": "Business, headline or topic",
  "upd.feed.submit": "Filter updates",
  "upd.feed.categoryLabel": "Category",
  "upd.feed.allCategories": "All categories",
  "upd.feed.countOne": "1 update",
  "upd.feed.countMany": "{count} updates",
  "upd.feed.emptyNone": "No updates yet",
  "upd.feed.emptyFiltered": "No updates match those filters",
  "upd.feed.emptyBody":
    "Businesses post updates from their dashboard. Check back soon, or browse the directory.",
  "upd.feed.emptyFilteredBody":
    "Try a different place or category, or clear the filters to see every update.",
  "upd.feed.unavailableTitle": "Updates are unavailable",
  "upd.feed.unavailableBody":
    "We could not load updates just now. Try again in a moment.",
  "upd.summary.scheduled": "Scheduled",
  "upd.state.scheduled": "Scheduled",
  "upd.group.scheduled": "Scheduled updates",
  "upd.group.scheduledHint":
    "These go live on their own at the time shown. Until then only you and your team can see them.",
  "upd.when.scheduled": "Goes live {date}",
  "upd.act.publishNow": "Publish now",
  "upd.act.cancelSchedule": "Cancel schedule",
  "upd.form.scheduleLegend": "Or publish later",
  "upd.form.publishAt": "Publish on (UK time)",
  "upd.form.publishAtHint":
    "Pick a date and time between 10 minutes and 90 days from now. It goes live within a few minutes of that time.",
  "upd.form.schedule": "Schedule",
  "upd.form.scheduleChange": "Save changes and keep schedule",
  "upd.err.publishAtMissing": "Choose the date and time to publish.",
  "upd.err.publishAtInvalid": "That is not a real date and time.",
  "upd.err.publishAtSoon": "Choose a time at least 10 minutes from now.",
  "upd.err.publishAtFar": "Choose a time within the next 90 days.",
  "upd.formError.scheduleLimit":
    "You already have 20 updates waiting to go live. Wait for one to publish, or cancel one first.",
  "upd.formError.image-invalid":
    "The picture was not accepted. Use a JPEG, PNG or WebP under 5MB with a short description.",
  "upd.formError.image-limit":
    "You have reached the limit of pictures for updates.",
  "upd.formError.image-storage":
    "Picture uploads are switched off on this site for now.",
  "upd.outcome.scheduled": "Scheduled. It will go live on its own.",
  "upd.outcome.unscheduled":
    "Schedule cancelled. It is now a draft and nothing will be published.",
  "upd.outcome.scheduleLimit":
    "You already have 20 updates waiting to go live.",
  "upd.outcome.picture-text":
    "The update was saved, but the picture description was not accepted. Edit it and try again.",
  "ops.image.unavailableUpdate":
    "Pictures for updates are not available in this environment yet.",
  "ops.image.addUpdate": "Add a picture for this update",
  "upd.picture.preview": "New picture",
};

export const updatesCy: Record<keyof typeof updatesEn, string> = {
  "hub.tab.updates": "Diweddariadau",
  "hub.manage.updates.title": "Diweddariadau",
  "hub.manage.updates.body":
    "Newyddion byr ar gyfer eich gwefan a’r llif lleol: cau, tymor newydd, newid.",
  "footer.localUpdates": "Diweddariadau lleol",

  "upd.metaTitle": "Diweddariadau",
  "upd.back": "Yn ôl i’ch dangosfwrdd",
  "upd.eyebrow": "Newyddion o’ch busnes",
  "upd.title": "Diweddariadau",
  "upd.lead":
    "Postiwch ddiweddariad byr a bydd yn ymddangos ar eich gwefan ac yn y llif diweddariadau lleol.",
  "upd.demo":
    "Cyfrif arddangos cyhoeddus yw hwn, felly gellir edrych ar ddiweddariadau yma ond nid eu newid.",
  "upd.unavailable":
    "Doedd dim modd llwytho’r diweddariadau ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "upd.summary.aria": "Diweddariadau ar yr olwg gyntaf",
  "upd.summary.published": "Cyhoeddedig",
  "upd.summary.drafts": "Drafftiau",
  "upd.state.published": "Cyhoeddedig",
  "upd.state.draft": "Drafft",
  "upd.badge.welsh": "Cymraeg wedi’i ychwanegu",
  "upd.group.published": "Diweddariadau cyhoeddedig",
  "upd.group.publishedHint": "Gall ymwelwyr ddarllen y rhain ar eich gwefan.",
  "upd.group.drafts": "Drafftiau",
  "upd.group.draftsHint": "Dim ond chi a’ch tîm all weld y rhain.",
  "upd.when.published": "Cyhoeddwyd {date}",
  "upd.when.edited": "Golygwyd ddiwethaf {date}",
  "upd.empty.title": "Dim diweddariadau eto",
  "upd.empty.body":
    "Dywedwch wrth bobl beth sy’n newydd: newid i oriau agor, bwydlen dymhorol, digwyddiad elusennol. Mae ychydig o frawddegau plaen yn ddigon.",
  "upd.new.summary": "Ysgrifennu diweddariad newydd",

  "upd.act.publish": "Cyhoeddi",
  "upd.act.unpublish": "Dad-gyhoeddi",
  "upd.act.view": "Gweld ar y wefan",
  "upd.act.edit": "Golygu",
  "upd.act.read": "Darllen",
  "upd.act.remove": "Dileu",
  "upd.act.named": "{action}: {title}",
  "upd.remove.warning":
    "Mae dileu yn tynnu’r diweddariad hwn a’i fersiwn Gymraeg am byth. I’w gadw ond ei guddio, dad-gyhoeddwch ef yn lle hynny.",
  "upd.remove.confirm": "Ie, dileu’r diweddariad hwn",

  "upd.tip.welshMissing":
    "Ychwanegwch fersiwn Gymraeg fel y gall ymwelwyr Cymraeg ei ddarllen yn Gymraeg.",
  "upd.tip.welshHalf":
    "Mae angen teitl a thestun ar y fersiwn Gymraeg cyn i ddarllenwyr Cymraeg ei weld.",
  "upd.tip.shortBody":
    "Mae brawddeg neu ddwy yn rhagor o fanylion yn helpu pobl i wybod a yw hyn yn bwysig iddyn nhw.",
  "upd.tip.draftReady": "Mae’r drafft hwn yn barod i’w gyhoeddi.",

  "upd.form.title": "Pennawd",
  "upd.form.titleHint":
    "Byr a phenodol, er enghraifft “ar gau ddydd Llun 3 Tachwedd”.",
  "upd.form.body": "Diweddariad",
  "upd.form.bodyHint":
    "Testun plaen yn unig. Gadewch linell wag rhwng paragraffau. Nid yw dolenni a fformatio yn cael eu cefnogi.",
  "upd.form.count": "{count} o {max} nod",
  "upd.form.welshLegend": "Fersiwn Gymraeg (dewisol)",
  "upd.form.welshHint":
    "Mae darllenwyr Cymraeg yn gweld hwn yn lle’r Saesneg. Ysgrifennwch y pennawd a’r testun, neu gadewch y ddau’n wag.",
  "upd.form.titleCy": "Pennawd Cymraeg",
  "upd.form.titleCyHint": "Yr un newyddion, yn Gymraeg.",
  "upd.form.bodyCy": "Testun Cymraeg",
  "upd.form.bodyCyHint": "Testun plaen, fel yn y Saesneg.",
  "upd.form.publish": "Cyhoeddi nawr",
  "upd.form.saveDraft": "Cadw fel drafft",
  "upd.form.saveChanges": "Cadw’r newidiadau",
  "upd.form.saving": "Yn cadw…",
  "upd.form.errorsIntro": "Mae angen cywiro rhai pethau cyn y gellir cadw hwn.",

  "upd.err.titleShort": "Ychwanegwch bennawd o 3 nod o leiaf.",
  "upd.err.titleLong": "Byrhewch y pennawd i 120 nod neu lai.",
  "upd.err.bodyShort": "Ysgrifennwch 10 nod o destun o leiaf.",
  "upd.err.bodyLong": "Byrhewch y testun i 1,500 nod neu lai.",
  "upd.err.welshTitleMissing":
    "Ychwanegwch bennawd Cymraeg, neu cliriwch y testun Cymraeg.",
  "upd.err.welshBodyMissing":
    "Ychwanegwch y testun Cymraeg, neu cliriwch y pennawd Cymraeg.",
  "upd.err.welshTitleLong": "Byrhewch y pennawd Cymraeg i 120 nod neu lai.",
  "upd.err.welshBodyLong": "Byrhewch y testun Cymraeg i 1,500 nod neu lai.",
  "upd.formError.locked":
    "Tynnodd gweinyddwr y diweddariad hwn ar ôl adroddiad, felly ni ellir ei newid.",
  "upd.outcome.locked":
    "Tynnodd gweinyddwr y diweddariad hwnnw ar ôl adroddiad, felly ni ellir ei newid.",
  "upd.state.removed": "Wedi’i dynnu",
  "upd.summary.removed": "Wedi’u tynnu",
  "upd.group.removed": "Wedi’u tynnu gan weinyddwr",
  "upd.group.removedHint":
    "Wedi’u tynnu i lawr ar ôl adroddiad. Ni ellir eu golygu, eu hailgyhoeddi na’u dileu. Os credwch fod hyn yn gamgymeriad, cysylltwch â ni.",
  "upd.when.removed": "Tynnwyd gan weinyddwr ar ôl adroddiad",
  "upd.report": "Rhoi gwybod am y diweddariad hwn",
  "upd.formError.forbidden": "Nid oes gennych ganiatâd i newid diweddariadau.",
  "upd.formError.invalid":
    "Nid oedd y ffurflen yn ddilys. Ail-lwythwch y dudalen a rhowch gynnig arall arni.",
  "upd.formError.not_found": "Nid yw’r diweddariad hwnnw’n bodoli mwyach.",
  "upd.formError.stale":
    "Mae rhywun arall wedi newid y diweddariad hwn ers i chi ei agor. Ail-lwythwch y dudalen i weld eu fersiwn, yna gwnewch eich newid eto.",
  "upd.formError.limit":
    "Rydych wedi cyrraedd y terfyn o 200 diweddariad. Dilëwch rai hen rai yn gyntaf.",
  "upd.formError.rate":
    "Rydych wedi cyhoeddi 10 diweddariad yn y 24 awr diwethaf. Rhowch gynnig arall arni’n hwyrach, neu cadwch yr un hwn fel drafft.",
  "upd.formError.unavailable":
    "Doedd dim modd cadw ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "upd.outcome.draftSaved": "Drafft wedi’i gadw.",
  "upd.outcome.saved": "Newidiadau wedi’u cadw.",
  "upd.outcome.published": "Wedi’i gyhoeddi. Mae nawr ar eich gwefan.",
  "upd.outcome.unpublished":
    "Wedi’i ddad-gyhoeddi. Drafft yw e nawr ac nid yw’n gyhoeddus mwyach.",
  "upd.outcome.removed": "Diweddariad wedi’i ddileu.",
  "upd.outcome.unchanged": "Doedd dim angen newid dim.",
  "upd.outcome.forbidden": "Nid oes gennych ganiatâd i newid diweddariadau.",
  "upd.outcome.invalid": "Nid oedd y cais hwnnw’n ddilys.",
  "upd.outcome.not_found": "Nid yw’r diweddariad hwnnw’n bodoli mwyach.",
  "upd.outcome.rate":
    "Rydych wedi cyhoeddi 10 diweddariad yn y 24 awr diwethaf. Rhowch gynnig arall arni’n hwyrach.",
  "upd.outcome.limit": "Rydych wedi cyrraedd y terfyn o 200 diweddariad.",
  "upd.outcome.unavailable":
    "Doedd dim modd gwneud hynny ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "upd.preview.label": "Sut mae’n darllen",
  "upd.preview.empty": "Dechreuwch deipio i weld eich diweddariad yma.",
  "upd.preview.noTitle": "Eich pennawd",
  "upd.preview.welshYes":
    "Bydd darllenwyr Cymraeg yn gweld eich fersiwn Gymraeg.",
  "upd.preview.welshNo":
    "Bydd darllenwyr Cymraeg yn gweld y Saesneg nes i chi ychwanegu Cymraeg.",

  "upd.site.nav": "Diweddariadau",
  "upd.site.eyebrow": "Newyddion diweddaraf",
  "upd.site.title": "Diweddariadau diweddaraf",
  "upd.site.all": "Gweld pob un o’r {count} diweddariad",
  "upd.site.metaTitle": "Diweddariadau gan {business}",
  "upd.site.metaDescription":
    "Newyddion a chyhoeddiadau gan {business}, yn y drefn y cawsant eu postio.",
  "upd.site.pageTitle": "Diweddariadau gan {business}",
  "upd.site.countOne": "1 diweddariad",
  "upd.site.count": "{count} diweddariad",
  "upd.site.pageOf": "Tudalen {page} o {total}",

  "upd.feed.metaTitle": "Diweddariadau lleol",
  "upd.feed.metaDescription":
    "Y newyddion a’r cyhoeddiadau diweddaraf gan fusnesau lleol ar draws Cymoedd De Cymru.",
  "upd.feed.eyebrow": "Diweddariadau lleol",
  "upd.feed.title": "Newyddion gan fusnesau lleol",
  "upd.feed.lead":
    "Cau, tymhorau newydd, newyddion cymunedol: yr hyn y mae busnesau ar draws y Cymoedd newydd ei ddweud wrthym.",
  "upd.feed.searchLabel": "Chwilio diweddariadau",
  "upd.feed.searchPlaceholder": "Busnes, pennawd neu bwnc",
  "upd.feed.submit": "Hidlo diweddariadau",
  "upd.feed.categoryLabel": "Categori",
  "upd.feed.allCategories": "Pob categori",
  "upd.feed.countOne": "1 diweddariad",
  "upd.feed.countMany": "{count} diweddariad",
  "upd.feed.emptyNone": "Dim diweddariadau eto",
  "upd.feed.emptyFiltered": "Dim diweddariadau’n cyfateb i’r hidlyddion hynny",
  "upd.feed.emptyBody":
    "Mae busnesau’n postio diweddariadau o’u dangosfwrdd. Dewch yn ôl cyn bo hir, neu porwch y cyfeiriadur.",
  "upd.feed.emptyFilteredBody":
    "Rhowch gynnig ar le neu gategori gwahanol, neu clirio’r hidlyddion i weld pob diweddariad.",
  "upd.feed.unavailableTitle": "Nid yw diweddariadau ar gael",
  "upd.feed.unavailableBody":
    "Doedd dim modd llwytho diweddariadau ar hyn o bryd. Rhowch gynnig arall arni ymhen munud.",
  "upd.summary.scheduled": "Wedi’u trefnu",
  "upd.state.scheduled": "Wedi’i drefnu",
  "upd.group.scheduled": "Diweddariadau wedi’u trefnu",
  "upd.group.scheduledHint":
    "Bydd y rhain yn mynd yn fyw ar eu pen eu hunain ar yr amser a ddangosir. Tan hynny, dim ond chi a’ch tîm all eu gweld.",
  "upd.when.scheduled": "Yn mynd yn fyw {date}",
  "upd.act.publishNow": "Cyhoeddi nawr",
  "upd.act.cancelSchedule": "Canslo’r trefniant",
  "upd.form.scheduleLegend": "Neu gyhoeddi’n hwyrach",
  "upd.form.publishAt": "Cyhoeddi ar (amser y DU)",
  "upd.form.publishAtHint":
    "Dewiswch ddyddiad ac amser rhwng 10 munud a 90 diwrnod o nawr. Bydd yn mynd yn fyw o fewn ychydig funudau i’r amser hwnnw.",
  "upd.form.schedule": "Trefnu",
  "upd.form.scheduleChange": "Cadw’r newidiadau a chadw’r trefniant",
  "upd.err.publishAtMissing": "Dewiswch y dyddiad a’r amser i’w gyhoeddi.",
  "upd.err.publishAtInvalid": "Nid yw hwnnw’n ddyddiad ac amser go iawn.",
  "upd.err.publishAtSoon": "Dewiswch amser o leiaf 10 munud o nawr.",
  "upd.err.publishAtFar": "Dewiswch amser o fewn y 90 diwrnod nesaf.",
  "upd.formError.scheduleLimit":
    "Mae gennych eisoes 20 diweddariad yn aros i fynd yn fyw. Arhoswch i un gael ei gyhoeddi, neu canslwch un yn gyntaf.",
  "upd.formError.image-invalid":
    "Ni dderbyniwyd y llun. Defnyddiwch JPEG, PNG neu WebP o dan 5MB gyda disgrifiad byr.",
  "upd.formError.image-limit":
    "Rydych wedi cyrraedd y terfyn o luniau ar gyfer diweddariadau.",
  "upd.formError.image-storage":
    "Mae uwchlwytho lluniau wedi’i ddiffodd ar y wefan hon am y tro.",
  "upd.outcome.scheduled":
    "Wedi’i drefnu. Bydd yn mynd yn fyw ar ei ben ei hun.",
  "upd.outcome.unscheduled":
    "Trefniant wedi’i ganslo. Drafft yw e nawr ac ni chaiff dim ei gyhoeddi.",
  "upd.outcome.scheduleLimit":
    "Mae gennych eisoes 20 diweddariad yn aros i fynd yn fyw.",
  "upd.outcome.picture-text":
    "Cadwyd y diweddariad, ond ni dderbyniwyd disgrifiad y llun. Golygwch ef a rhowch gynnig arall arni.",
  "ops.image.unavailableUpdate":
    "Nid yw lluniau ar gyfer diweddariadau ar gael yn yr amgylchedd hwn eto.",
  "ops.image.addUpdate": "Ychwanegu llun ar gyfer y diweddariad hwn",
  "upd.picture.preview": "Llun newydd",
};
