/**
 * Strings for the photos studio (`/dashboard/business/[id]/photos`). Spread
 * into the main catalogues. Welsh is first-draft and needs review by a fluent
 * Welsh speaker before launch.
 */
export const photosEn = {
  "hub.tab.photos": "Photos",
  "photos.metaTitle": "Photos",
  "photos.back": "Back to your dashboard",
  "photos.eyebrow": "Logo, cover and gallery",
  "photos.title": "Photos",
  "photos.lead":
    "Choose how each photo is framed, describe it for people who cannot see it, and put your gallery in order.",
  "photos.viewSite": "Preview your website",
  "photos.demo":
    "This is a public demonstration account, so photos can be looked at here but not changed.",
  "photos.readOnly":
    "You can look at these photos, but your role cannot change them.",
  "photos.storageOff":
    "Photo uploads are switched off on this site for now. Photos already added can still be edited.",
  "photos.unavailable": "Photos could not be loaded just now. Try again soon.",

  "photos.outcome.uploaded": "Photo uploaded.",
  "photos.outcome.photo-saved": "Photo saved.",
  "photos.outcome.cover-set": "That photo is now your cover photo.",
  "photos.outcome.moved": "The gallery order has been updated.",
  "photos.outcome.unchanged": "Nothing changed.",
  "photos.outcome.stale":
    "The gallery changed while you were arranging it. The latest order is shown; arrange it again.",
  "photos.outcome.removed": "Photo removed.",
  "photos.outcome.invalid":
    "That did not work. Check the photo is a JPEG, PNG or WebP under 5MB and that it has a description.",
  "photos.outcome.undescribed":
    "Add a description to that photo and save it before making it your cover photo.",
  "photos.outcome.limit":
    "Your gallery is full. Remove a photo to add another.",
  "photos.outcome.disabled": "Photo uploads are switched off on this site.",
  "photos.outcome.forbidden": "Your membership cannot edit this business.",
  "photos.outcome.missing":
    "That photo is no longer there. The page now shows what is current.",
  "photos.outcome.unavailable":
    "That could not be saved just now. Try again in a minute.",

  "photos.progress.title": "Photo checklist",
  "photos.progress.text": "{done} of {total} done",
  "photos.progress.aria": "Photo checklist {percent}% complete",
  "photos.check.logo": "Add a logo",
  "photos.check.cover": "Add a cover photo",
  "photos.check.gallery": "Add {want} gallery photos ({have} so far)",
  "photos.check.descriptions": "Describe every photo",
  "photos.check.done": "Done",
  "photos.check.todo": "To do",
  "photos.tips.title": "Tips for good photos",
  "photos.tips.one":
    "Natural light and a tidy background make most photos better.",
  "photos.tips.two":
    "Show your work, your premises and your people, not just your logo.",
  "photos.tips.three":
    "Landscape photos work best for the cover. Set the focus on the subject so no crop cuts it off.",

  "photos.logo.title": "Logo",
  "photos.logo.hint":
    "Shown beside your name. A square or simple wide logo works well.",
  "photos.logo.empty": "No logo yet. A neutral placeholder is shown instead.",
  "photos.cover.title": "Cover photo",
  "photos.cover.hint":
    "The large photo at the top of your website and on your directory card.",
  "photos.cover.empty":
    "No cover photo yet. A placeholder is shown until you add one.",
  "photos.gallery.title": "Gallery ({count} of {max})",
  "photos.gallery.hint":
    "More of your work and your place. The first photo can be shown larger.",
  "photos.gallery.empty": "No gallery photos yet.",
  "photos.gallery.full":
    "Your gallery is full ({max} photos). Remove one to add another.",

  "photos.tile.cover": "Cover",
  "photos.tile.needsDescription": "Needs a description",
  "photos.tile.position": "Photo {n} of {total}",
  "photos.tile.edit": "Edit photo",
  "photos.tile.fallbackName": "Photo {n}",
  "photos.tile.noDescription": "No description yet",

  "photos.editor.focusTitle": "Choose what stays in view",
  "photos.editor.focusHelp":
    "Click or drag on the photo, or use the sliders, to pick the part that matters. The previews show each crop.",
  "photos.editor.pickerAria": "Focus picker. Click or drag to set the focus.",
  "photos.editor.horizontal": "Left to right",
  "photos.editor.vertical": "Top to bottom",
  "photos.editor.centre": "Centre the focus",
  "photos.editor.position": "Focus at {x}% across, {y}% down",
  "photos.frames.title": "How it will be cropped",
  "photos.frames.wide": "Cover, wide screens",
  "photos.frames.tall": "Cover, side by side",
  "photos.frames.card": "Directory card and gallery",
  "photos.frames.square": "Square thumbnail",
  "photos.alt.label": "Description",
  "photos.alt.help":
    "A short sentence saying what the photo shows. It is read aloud to people who cannot see it and shown if the photo cannot load.",
  "photos.alt.count": "{count} of {max} characters",
  "photos.alt.good": "That is a helpful description.",
  "photos.alt.hint.missing":
    "Add a description so everyone can follow your page.",
  "photos.alt.hint.tooShort":
    "A few more words would help, for example who or what is in the photo.",
  "photos.alt.hint.tooLong":
    "Try to keep it to one short sentence; very long descriptions are tiring to listen to.",
  "photos.alt.hint.startsWithImageOf":
    "No need to start with “photo of”; people are already told it is a picture.",
  "photos.alt.hint.looksLikeFilename":
    "That looks like a file name. Say what the photo shows instead.",
  "photos.alt.hint.allCaps":
    "Capital letters can be read out letter by letter. Use normal case.",
  "photos.editor.save": "Save photo",
  "photos.editor.dirty": "Unsaved changes",
  "photos.editor.clean": "No changes",

  "photos.action.makeCover": "Make this my cover photo",
  "photos.action.moveEarlier": "Move earlier",
  "photos.action.moveLater": "Move later",
  "photos.action.orderAria": "Gallery order controls",
  "photos.remove.summary": "Remove this photo",
  "photos.remove.warning":
    "This takes the photo off your website. You can upload it again later.",
  "photos.remove.confirm": "Yes, remove it",

  "photos.upload.logo": "Upload a logo",
  "photos.upload.cover": "Upload a cover photo",
  "photos.upload.replaceLogo": "Replace the logo",
  "photos.upload.replaceCover": "Replace the cover photo",
  "photos.upload.gallery": "Add a gallery photo",
  "photos.upload.file": "Choose a photo",
  "photos.upload.help": "JPEG, PNG or WebP, up to {max}MB.",
  "photos.upload.tooBig":
    "That file is larger than {max}MB. Choose a smaller photo.",
  "photos.upload.wrongType": "Use a JPEG, PNG or WebP photo.",
  "photos.upload.previewAlt": "Preview of the chosen photo",
  "photos.upload.submit": "Upload photo",
  "photos.upload.altRequired": "Add a description of at least 3 characters.",
  "photos.upload.replaceNote":
    "The current photo is replaced and removed from your website.",

  "photos.reorder.summary": "Change the order of your gallery",
  "photos.website.link": "Manage photos in the Photos tab",
} as const;

export const photosCy = {
  "hub.tab.photos": "Lluniau",
  "photos.metaTitle": "Lluniau",
  "photos.back": "Yn ôl i'ch dangosfwrdd",
  "photos.eyebrow": "Logo, clawr ac oriel",
  "photos.title": "Lluniau",
  "photos.lead":
    "Dewiswch sut mae pob llun yn cael ei fframio, disgrifiwch ef i bobl na allant ei weld, a rhowch eich oriel mewn trefn.",
  "photos.viewSite": "Rhagolwg o'ch gwefan",
  "photos.demo":
    "Cyfrif arddangos cyhoeddus yw hwn, felly gallwch edrych ar y lluniau yma ond ni ellir eu newid.",
  "photos.readOnly":
    "Gallwch edrych ar y lluniau hyn, ond ni all eich rôl eu newid.",
  "photos.storageOff":
    "Mae uwchlwytho lluniau wedi'i ddiffodd ar y safle hwn am y tro. Gellir dal i olygu lluniau sydd eisoes wedi'u hychwanegu.",
  "photos.unavailable":
    "Nid oedd modd llwytho'r lluniau ar hyn o bryd. Rhowch gynnig arall arni cyn bo hir.",

  "photos.outcome.uploaded": "Llun wedi'i uwchlwytho.",
  "photos.outcome.photo-saved": "Llun wedi'i gadw.",
  "photos.outcome.cover-set": "Y llun hwnnw yw eich llun clawr bellach.",
  "photos.outcome.moved": "Mae trefn yr oriel wedi'i diweddaru.",
  "photos.outcome.unchanged": "Ni newidiodd dim.",
  "photos.outcome.stale":
    "Newidiodd yr oriel wrth i chi ei threfnu. Dangosir y drefn ddiweddaraf; trefnwch hi eto.",
  "photos.outcome.removed": "Llun wedi'i dynnu.",
  "photos.outcome.invalid":
    "Ni weithiodd hynny. Gwiriwch fod y llun yn JPEG, PNG neu WebP o dan 5MB a bod ganddo ddisgrifiad.",
  "photos.outcome.undescribed":
    "Ychwanegwch ddisgrifiad at y llun hwnnw a'i gadw cyn ei wneud yn llun clawr.",
  "photos.outcome.limit":
    "Mae eich oriel yn llawn. Tynnwch lun i ychwanegu un arall.",
  "photos.outcome.disabled":
    "Mae uwchlwytho lluniau wedi'i ddiffodd ar y safle hwn.",
  "photos.outcome.forbidden": "Ni all eich aelodaeth olygu'r busnes hwn.",
  "photos.outcome.missing":
    "Nid yw'r llun hwnnw yno mwyach. Mae'r dudalen bellach yn dangos beth sy'n gyfredol.",
  "photos.outcome.unavailable":
    "Ni ellid cadw hynny ar hyn o bryd. Rhowch gynnig arall arni mewn munud.",

  "photos.progress.title": "Rhestr wirio lluniau",
  "photos.progress.text": "{done} o {total} wedi'u gwneud",
  "photos.progress.aria": "Rhestr wirio lluniau {percent}% wedi'i chwblhau",
  "photos.check.logo": "Ychwanegu logo",
  "photos.check.cover": "Ychwanegu llun clawr",
  "photos.check.gallery": "Ychwanegu {want} llun i'r oriel ({have} hyd yma)",
  "photos.check.descriptions": "Disgrifio pob llun",
  "photos.check.done": "Wedi'i wneud",
  "photos.check.todo": "I'w wneud",
  "photos.tips.title": "Awgrymiadau ar gyfer lluniau da",
  "photos.tips.one":
    "Mae golau naturiol a chefndir taclus yn gwella'r rhan fwyaf o luniau.",
  "photos.tips.two":
    "Dangoswch eich gwaith, eich safle a'ch pobl, nid dim ond eich logo.",
  "photos.tips.three":
    "Lluniau tirlun sy'n gweithio orau ar gyfer y clawr. Gosodwch y ffocws ar y pwnc fel na fydd unrhyw docio yn ei dorri i ffwrdd.",

  "photos.logo.title": "Logo",
  "photos.logo.hint":
    "Yn cael ei ddangos wrth ymyl eich enw. Mae logo sgwâr neu logo llydan syml yn gweithio'n dda.",
  "photos.logo.empty": "Dim logo eto. Dangosir dalfan niwtral yn ei le.",
  "photos.cover.title": "Llun clawr",
  "photos.cover.hint":
    "Y llun mawr ar frig eich gwefan ac ar eich cerdyn cyfeiriadur.",
  "photos.cover.empty":
    "Dim llun clawr eto. Dangosir dalfan nes i chi ychwanegu un.",
  "photos.gallery.title": "Oriel ({count} o {max})",
  "photos.gallery.hint":
    "Mwy o'ch gwaith a'ch lle. Gellir dangos y llun cyntaf yn fwy.",
  "photos.gallery.empty": "Dim lluniau yn yr oriel eto.",
  "photos.gallery.full":
    "Mae eich oriel yn llawn ({max} llun). Tynnwch un i ychwanegu un arall.",

  "photos.tile.cover": "Clawr",
  "photos.tile.needsDescription": "Angen disgrifiad",
  "photos.tile.position": "Llun {n} o {total}",
  "photos.tile.edit": "Golygu'r llun",
  "photos.tile.fallbackName": "Llun {n}",
  "photos.tile.noDescription": "Dim disgrifiad eto",

  "photos.editor.focusTitle": "Dewiswch beth sy'n aros yn y golwg",
  "photos.editor.focusHelp":
    "Cliciwch neu llusgwch ar y llun, neu defnyddiwch y llithrwyr, i ddewis y rhan sy'n bwysig. Mae'r rhagolygon yn dangos pob tocio.",
  "photos.editor.pickerAria":
    "Dewisydd ffocws. Cliciwch neu llusgwch i osod y ffocws.",
  "photos.editor.horizontal": "O'r chwith i'r dde",
  "photos.editor.vertical": "O'r brig i'r gwaelod",
  "photos.editor.centre": "Canoli'r ffocws",
  "photos.editor.position": "Ffocws ar {x}% ar draws, {y}% i lawr",
  "photos.frames.title": "Sut y bydd yn cael ei docio",
  "photos.frames.wide": "Clawr, sgriniau llydan",
  "photos.frames.tall": "Clawr, ochr yn ochr",
  "photos.frames.card": "Cerdyn cyfeiriadur ac oriel",
  "photos.frames.square": "Mân-lun sgwâr",
  "photos.alt.label": "Disgrifiad",
  "photos.alt.help":
    "Brawddeg fer yn dweud beth mae'r llun yn ei ddangos. Caiff ei darllen yn uchel i bobl na allant weld y llun a'i dangos os na ellir llwytho'r llun.",
  "photos.alt.count": "{count} o {max} nod",
  "photos.alt.good": "Mae hwnna'n ddisgrifiad defnyddiol.",
  "photos.alt.hint.missing":
    "Ychwanegwch ddisgrifiad fel y gall pawb ddilyn eich tudalen.",
  "photos.alt.hint.tooShort":
    "Byddai ychydig mwy o eiriau'n helpu, er enghraifft pwy neu beth sydd yn y llun.",
  "photos.alt.hint.tooLong":
    "Ceisiwch ei gadw i un frawddeg fer; mae disgrifiadau hir iawn yn flinedig i wrando arnynt.",
  "photos.alt.hint.startsWithImageOf":
    "Nid oes angen dechrau gyda “llun o”; dywedir wrth bobl eisoes mai llun ydyw.",
  "photos.alt.hint.looksLikeFilename":
    "Mae hynny'n edrych fel enw ffeil. Dywedwch beth mae'r llun yn ei ddangos yn lle hynny.",
  "photos.alt.hint.allCaps":
    "Gellir darllen priflythrennau fesul llythyren. Defnyddiwch lythrennau arferol.",
  "photos.editor.save": "Cadw'r llun",
  "photos.editor.dirty": "Newidiadau heb eu cadw",
  "photos.editor.clean": "Dim newidiadau",

  "photos.action.makeCover": "Gwneud hwn yn llun clawr i mi",
  "photos.action.moveEarlier": "Symud yn gynharach",
  "photos.action.moveLater": "Symud yn hwyrach",
  "photos.action.orderAria": "Rheolyddion trefn yr oriel",
  "photos.remove.summary": "Tynnu'r llun hwn",
  "photos.remove.warning":
    "Mae hyn yn tynnu'r llun oddi ar eich gwefan. Gallwch ei uwchlwytho eto'n ddiweddarach.",
  "photos.remove.confirm": "Ie, tynnu'r llun",

  "photos.upload.logo": "Uwchlwytho logo",
  "photos.upload.cover": "Uwchlwytho llun clawr",
  "photos.upload.replaceLogo": "Newid y logo",
  "photos.upload.replaceCover": "Newid y llun clawr",
  "photos.upload.gallery": "Ychwanegu llun i'r oriel",
  "photos.upload.file": "Dewiswch lun",
  "photos.upload.help": "JPEG, PNG neu WebP, hyd at {max}MB.",
  "photos.upload.tooBig":
    "Mae'r ffeil honno'n fwy na {max}MB. Dewiswch lun llai.",
  "photos.upload.wrongType": "Defnyddiwch lun JPEG, PNG neu WebP.",
  "photos.upload.previewAlt": "Rhagolwg o'r llun a ddewiswyd",
  "photos.upload.submit": "Uwchlwytho'r llun",
  "photos.upload.altRequired": "Ychwanegwch ddisgrifiad o 3 nod o leiaf.",
  "photos.upload.replaceNote":
    "Caiff y llun presennol ei ddisodli a'i dynnu oddi ar eich gwefan.",

  "photos.reorder.summary": "Newid trefn eich oriel",
  "photos.website.link": "Rheoli lluniau yn y tab Lluniau",
} as const satisfies Record<keyof typeof photosEn, string>;
