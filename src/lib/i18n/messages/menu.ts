/**
 * Strings added by the menu builder overhaul: the owner's menu editor on the
 * operations page, the public menu (section and `/b/[slug]/menu`) and the
 * dietary labels. Spread into the main catalogues. Welsh is first-draft and
 * needs review by a fluent Welsh speaker before launch.
 */
export const menuEn = {
  // Dietary labels (approved set; stored as the English text).
  "menu.diet.vegetarian": "Vegetarian",
  "menu.diet.vegan": "Vegan",
  "menu.diet.gluten-free": "Gluten free",
  "menu.diet.dairy-free": "Dairy free",
  "menu.diet.nut-free": "Nut free",
  "menu.diet.halal": "Halal",
  "menu.diet.spicy": "Spicy",

  // Public menu.
  "menu.public.jumpAria": "Jump to a menu section",
  "menu.public.favourites": "House favourites",
  "menu.public.favourite": "Favourite",
  "menu.public.unavailable": "Not available today",
  "menu.public.filterLegend": "Show only dishes that are",
  "menu.public.filterAria": "Filter the menu by dietary need",
  "menu.public.hideUnavailable": "Hide unavailable dishes",
  "menu.public.clear": "Clear filters",
  "menu.public.count": "Showing {shown} of {total} dishes",
  "menu.public.countOne": "Showing 1 of {total} dishes",
  "menu.public.noMatch":
    "Nothing on this menu matches. Clear a filter to see every dish.",
  "menu.public.allergen":
    "Dietary labels are supplied by the business and are not independently checked. If you have an allergy, tell the business before you order.",
  "menu.public.viewFull": "View the full menu",
  "menu.public.print": "Print this menu",
  "menu.public.metaTitle": "{business} menu",
  "menu.public.metaDescription": "The menu from {business}.",
  "menu.public.pageTitle": "The menu",
  "menu.public.back": "Back to {business}",
  "menu.public.dishCount": "{count} dishes in {groups} sections",
  "menu.public.dishCountOne": "1 dish in {groups} sections",
  "menu.public.fileHeading": "Prefer the original?",

  // Owner builder.
  "menub.statsAria": "Your menu at a glance",
  "menub.statGroups": "Sections",
  "menub.statItems": "Dishes",
  "menub.statUnavailable": "Not available today",
  "menub.statHidden": "Hidden sections",
  "menub.guidanceTitle": "Make your menu better",
  "menub.guidance.add_group":
    "Start by adding a section such as Starters or Hot drinks, or paste your whole menu below.",
  "menub.guidance.add_items":
    "Your sections are empty. Add your first dishes, or paste your menu below.",
  "menub.guidance.fill_empty_groups":
    "Some sections have no dishes yet. Visitors only see sections that have something in them.",
  "menub.guidance.add_prices":
    "{count} dishes have no price. Prices are the first thing visitors look for.",
  "menub.guidance.add_pricesOne":
    "1 dish has no price. Prices are the first thing visitors look for.",
  "menub.guidance.add_descriptions":
    "Most dishes have no description. A short line about what is in it helps people choose.",
  "menub.guidance.add_labels":
    "No dishes have dietary labels yet. Labels let visitors filter for vegetarian, vegan and gluten free.",
  "menub.guidance.feature_favourites":
    "Mark two or three dishes as favourites and they appear at the top of your public menu.",
  "menub.guidanceDone":
    "Your menu looks complete. Keep it up to date and mark anything that has run out.",
  "menub.emptyBuilder": "No menu sections yet.",
  "menub.hiddenBadge": "Hidden from visitors",
  "menub.emptyGroup": "No dishes in this section yet.",
  "menub.itemCount": "{count} dishes",
  "menub.itemCountOne": "1 dish",
  "menub.moveUp": "Move {name} up",
  "menub.moveDown": "Move {name} down",
  "menub.up": "Up",
  "menub.down": "Down",
  "menub.editGroup": "Edit section",
  "menub.editItem": "Edit",
  "menub.editItemAria": "Edit {name}",
  "menub.save": "Save changes",
  "menub.groupName": "Section name",
  "menub.groupDescription": "Short description (optional)",
  "menub.groupVisible": "Show this section to visitors",
  "menub.removeGroup": "Remove section and its dishes",
  "menub.removeGroupAria": "Remove {name} and all its dishes",
  "menub.removeItem": "Remove",
  "menub.removeItemAria": "Remove {name}",
  "menub.confirmRemove": "Yes, remove",
  "menub.confirmGroupHint":
    "This removes the section and every dish in it. It cannot be undone.",
  "menub.confirmItemHint": "This removes the dish. It cannot be undone.",
  "menub.markUnavailable": "Mark unavailable",
  "menub.markAvailable": "Mark available",
  "menub.markUnavailableAria": "Mark {name} as not available today",
  "menub.markAvailableAria": "Mark {name} as available again",
  "menub.favourite": "Favourite",
  "menub.favouriteOn": "Remove from favourites",
  "menub.favouriteOff": "Make a favourite",
  "menub.favouriteOnAria": "Remove {name} from your favourites",
  "menub.favouriteOffAria": "Make {name} a favourite",
  "menub.unavailableBadge": "Not available",
  "menub.itemName": "Dish name",
  "menub.itemDescription": "Description (optional)",
  "menub.itemPrice": "Price (optional)",
  "menub.itemPriceHint":
    "Type 4.5 for £4.50, or words such as “from £5” or “market price”.",
  "menub.dietaryLegend": "Dietary labels",
  "menub.dietaryHint":
    "Only tick what you are sure of. Visitors are told labels come from you.",
  "menub.customLabels": "Other labels (optional)",
  "menub.customLabelsHint":
    "Separate with commas, for example “Locally sourced”.",
  "menub.itemAvailable": "Available today",
  "menub.itemFeatured": "Show as a house favourite",
  "menub.addItemTo": "Add a dish to {name}",
  "menub.addItem": "Add dish",
  "menub.addGroupTitle": "Add a section",
  "menub.addGroupHint":
    "For example Starters, Mains, Hot drinks or Treatments.",
  "menub.addGroup": "Add section",
  "menub.importTitle": "Paste your menu",
  "menub.importLead":
    "Paste a typed or copied menu and we will build the sections and dishes. You can tidy everything afterwards.",
  "menub.importHelp":
    "One dish per line, like “Leek soup - 5.50 - with bread (v)”. A line in capitals or ending in a colon starts a new section.",
  "menub.importLabel": "Your menu",
  "menub.importPlaceholder":
    "STARTERS\nLeek soup - 5.50 - with crusty bread (v)\nWelsh rarebit - 6 (v)\n\nMAINS:\nCawl - 12.50 - lamb and root vegetables\nSunday roast 14.95",
  "menub.importDefaultGroup": "Section for dishes before any heading",
  "menub.importDefaultGroupValue": "Menu",
  "menub.importButton": "Build my menu",
  "menub.importLimits":
    "Up to 80 lines and 12 sections at a time. It adds to your menu and never replaces it.",
  "menub.previewTitle": "How visitors see it",
  "menub.previewLead":
    "This is your public menu exactly as visitors will see it once your page is published.",
  "menub.previewEmpty":
    "Visitors will see nothing here until you add a section with at least one dish.",
  "menub.viewPublic": "Open the public menu",
  "menub.quickUpload": "Quick upload of an existing menu",
  "menub.limitsNote": "Up to 30 sections and 300 dishes.",
  "menub.outcome.moved": "Menu order updated.",
  "menub.outcome.imported":
    "Your menu has been built. Check it and tidy it up.",
} as const;

export const menuCy: Record<keyof typeof menuEn, string> = {
  "menu.diet.vegetarian": "Llysieuol",
  "menu.diet.vegan": "Fegan",
  "menu.diet.gluten-free": "Heb glwten",
  "menu.diet.dairy-free": "Heb laeth",
  "menu.diet.nut-free": "Heb gnau",
  "menu.diet.halal": "Halal",
  "menu.diet.spicy": "Sbeislyd",

  "menu.public.jumpAria": "Neidio i ran o’r fwydlen",
  "menu.public.favourites": "Ffefrynnau’r tŷ",
  "menu.public.favourite": "Ffefryn",
  "menu.public.unavailable": "Ddim ar gael heddiw",
  "menu.public.filterLegend": "Dangos prydau sydd ond yn",
  "menu.public.filterAria": "Hidlo’r fwydlen yn ôl anghenion dietegol",
  "menu.public.hideUnavailable": "Cuddio prydau sydd ddim ar gael",
  "menu.public.clear": "Clirio’r hidlwyr",
  "menu.public.count": "Yn dangos {shown} o {total} pryd",
  "menu.public.countOne": "Yn dangos 1 o {total} pryd",
  "menu.public.noMatch":
    "Does dim byd ar y fwydlen yn cyfateb. Cliriwch hidlydd i weld pob pryd.",
  "menu.public.allergen":
    "Mae’r busnes yn darparu’r labeli dietegol ac nid ydynt wedi’u gwirio’n annibynnol. Os oes gennych alergedd, dywedwch wrth y busnes cyn archebu.",
  "menu.public.viewFull": "Gweld y fwydlen lawn",
  "menu.public.print": "Argraffu’r fwydlen hon",
  "menu.public.metaTitle": "Bwydlen {business}",
  "menu.public.metaDescription": "Bwydlen {business}.",
  "menu.public.pageTitle": "Y fwydlen",
  "menu.public.back": "Yn ôl i {business}",
  "menu.public.dishCount": "{count} pryd mewn {groups} rhan",
  "menu.public.dishCountOne": "1 pryd mewn {groups} rhan",
  "menu.public.fileHeading": "Eisiau’r gwreiddiol?",

  "menub.statsAria": "Eich bwydlen ar gip",
  "menub.statGroups": "Rhannau",
  "menub.statItems": "Prydau",
  "menub.statUnavailable": "Ddim ar gael heddiw",
  "menub.statHidden": "Rhannau cudd",
  "menub.guidanceTitle": "Gwellwch eich bwydlen",
  "menub.guidance.add_group":
    "Dechreuwch trwy ychwanegu rhan fel Dechreuwyr neu Diodydd poeth, neu gludwch eich bwydlen gyfan isod.",
  "menub.guidance.add_items":
    "Mae eich rhannau’n wag. Ychwanegwch eich prydau cyntaf, neu gludwch eich bwydlen isod.",
  "menub.guidance.fill_empty_groups":
    "Does dim prydau mewn rhai rhannau eto. Dim ond rhannau sydd â rhywbeth ynddynt y mae ymwelwyr yn eu gweld.",
  "menub.guidance.add_prices":
    "Does dim pris ar {count} pryd. Prisiau yw’r peth cyntaf y mae ymwelwyr yn chwilio amdano.",
  "menub.guidance.add_pricesOne":
    "Does dim pris ar 1 pryd. Prisiau yw’r peth cyntaf y mae ymwelwyr yn chwilio amdano.",
  "menub.guidance.add_descriptions":
    "Does dim disgrifiad ar y rhan fwyaf o’r prydau. Mae llinell fer am beth sydd ynddo’n helpu pobl i ddewis.",
  "menub.guidance.add_labels":
    "Does dim labeli dietegol ar unrhyw bryd eto. Mae labeli’n galluogi ymwelwyr i hidlo am lysieuol, fegan a heb glwten.",
  "menub.guidance.feature_favourites":
    "Nodwch ddau neu dri phryd fel ffefrynnau a byddant yn ymddangos ar frig eich bwydlen gyhoeddus.",
  "menub.guidanceDone":
    "Mae eich bwydlen yn edrych yn gyflawn. Cadwch hi’n gyfredol a nodwch unrhyw beth sydd wedi dod i ben.",
  "menub.emptyBuilder": "Dim rhannau bwydlen eto.",
  "menub.hiddenBadge": "Wedi’i guddio rhag ymwelwyr",
  "menub.emptyGroup": "Dim prydau yn y rhan hon eto.",
  "menub.itemCount": "{count} pryd",
  "menub.itemCountOne": "1 pryd",
  "menub.moveUp": "Symud {name} i fyny",
  "menub.moveDown": "Symud {name} i lawr",
  "menub.up": "I fyny",
  "menub.down": "I lawr",
  "menub.editGroup": "Golygu’r rhan",
  "menub.editItem": "Golygu",
  "menub.editItemAria": "Golygu {name}",
  "menub.save": "Cadw’r newidiadau",
  "menub.groupName": "Enw’r rhan",
  "menub.groupDescription": "Disgrifiad byr (dewisol)",
  "menub.groupVisible": "Dangos y rhan hon i ymwelwyr",
  "menub.removeGroup": "Dileu’r rhan a’i phrydau",
  "menub.removeGroupAria": "Dileu {name} a’i holl brydau",
  "menub.removeItem": "Dileu",
  "menub.removeItemAria": "Dileu {name}",
  "menub.confirmRemove": "Ydw, dileu",
  "menub.confirmGroupHint":
    "Mae hyn yn dileu’r rhan a phob pryd ynddi. Ni ellir ei ddadwneud.",
  "menub.confirmItemHint": "Mae hyn yn dileu’r pryd. Ni ellir ei ddadwneud.",
  "menub.markUnavailable": "Nodi ddim ar gael",
  "menub.markAvailable": "Nodi ar gael",
  "menub.markUnavailableAria": "Nodi nad yw {name} ar gael heddiw",
  "menub.markAvailableAria": "Nodi bod {name} ar gael eto",
  "menub.favourite": "Ffefryn",
  "menub.favouriteOn": "Tynnu o’r ffefrynnau",
  "menub.favouriteOff": "Gwneud yn ffefryn",
  "menub.favouriteOnAria": "Tynnu {name} o’ch ffefrynnau",
  "menub.favouriteOffAria": "Gwneud {name} yn ffefryn",
  "menub.unavailableBadge": "Ddim ar gael",
  "menub.itemName": "Enw’r pryd",
  "menub.itemDescription": "Disgrifiad (dewisol)",
  "menub.itemPrice": "Pris (dewisol)",
  "menub.itemPriceHint":
    "Teipiwch 4.5 am £4.50, neu eiriau fel “o £5” neu “pris y farchnad”.",
  "menub.dietaryLegend": "Labeli dietegol",
  "menub.dietaryHint":
    "Ticiwch yr hyn rydych yn sicr ohono’n unig. Dywedir wrth ymwelwyr fod y labeli’n dod gennych chi.",
  "menub.customLabels": "Labeli eraill (dewisol)",
  "menub.customLabelsHint":
    "Gwahanwch â choma, er enghraifft “Wedi’i gyrchu’n lleol”.",
  "menub.itemAvailable": "Ar gael heddiw",
  "menub.itemFeatured": "Dangos fel ffefryn y tŷ",
  "menub.addItemTo": "Ychwanegu pryd at {name}",
  "menub.addItem": "Ychwanegu pryd",
  "menub.addGroupTitle": "Ychwanegu rhan",
  "menub.addGroupHint":
    "Er enghraifft Dechreuwyr, Prif gyrsiau, Diodydd poeth neu Driniaethau.",
  "menub.addGroup": "Ychwanegu rhan",
  "menub.importTitle": "Gludo eich bwydlen",
  "menub.importLead":
    "Gludwch fwydlen wedi’i theipio neu ei chopïo a byddwn yn adeiladu’r rhannau a’r prydau. Gallwch eu twtio wedyn.",
  "menub.importHelp":
    "Un pryd ar bob llinell, fel “Cawl cennin - 5.50 - gyda bara (v)”. Mae llinell mewn prif lythrennau neu sy’n gorffen â cholon yn dechrau rhan newydd.",
  "menub.importLabel": "Eich bwydlen",
  "menub.importPlaceholder":
    "CYNHESU\nCawl cennin - 5.50 - gyda bara crystiog (v)\nCaws pobi Cymreig - 6 (v)\n\nPRIF GYRSIAU:\nCawl - 12.50 - cig oen a llysiau gwraidd\nCinio dydd Sul 14.95",
  "menub.importDefaultGroup": "Rhan ar gyfer prydau cyn unrhyw bennawd",
  "menub.importDefaultGroupValue": "Bwydlen",
  "menub.importButton": "Adeiladu fy mwydlen",
  "menub.importLimits":
    "Hyd at 80 llinell a 12 rhan ar y tro. Mae’n ychwanegu at eich bwydlen ac nid yw byth yn ei disodli.",
  "menub.previewTitle": "Sut mae ymwelwyr yn ei gweld",
  "menub.previewLead":
    "Dyma eich bwydlen gyhoeddus yn union fel y bydd ymwelwyr yn ei gweld unwaith y bydd eich tudalen wedi’i chyhoeddi.",
  "menub.previewEmpty":
    "Ni fydd ymwelwyr yn gweld dim byd yma nes i chi ychwanegu rhan ag o leiaf un pryd.",
  "menub.viewPublic": "Agor y fwydlen gyhoeddus",
  "menub.quickUpload": "Uwchlwytho bwydlen sy’n bodoli’n gyflym",
  "menub.limitsNote": "Hyd at 30 rhan a 300 pryd.",
  "menub.outcome.moved": "Diweddarwyd trefn y fwydlen.",
  "menub.outcome.imported":
    "Mae eich bwydlen wedi’i hadeiladu. Gwiriwch hi a’i thwtio.",
};
