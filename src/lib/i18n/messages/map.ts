/**
 * Strings for the valleys map (`/map`). Kept in their own module and spread
 * into the main catalogues so the map slice stays easy to merge. Welsh is
 * first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const mapEn = {
  "nav.map": "Map",
  "map.metaTitle": "Explore the valleys map",
  "map.metaDescription":
    "See where local businesses are across the South Wales Valleys and find the places nearest to you.",
  "map.eyebrow": "Explore",
  "map.title": "The valleys, place by place.",
  "map.lead":
    "Every bubble is a town or village. Bigger bubbles have more local businesses. Pick one to see what is there, or find the places closest to you.",
  "map.filterLabel": "Show",
  "map.filterAll": "Everything",
  "map.categoryNav": "Filter the map by category",
  "map.mapLabel": "Map of places in the South Wales Valleys",
  "map.mapHint":
    "Use the Tab key to move between places and Enter to choose one.",
  "map.placeLabel": "{place}: {count} local businesses",
  "map.placeLabelOne": "{place}: 1 local business",
  "map.placeLabelNone": "{place}: no listed businesses yet",
  "map.panelTitle": "About this place",
  "map.panelEmptyPrompt": "Choose a place on the map to see what is there.",
  "map.countMany": "{count} local businesses",
  "map.countOne": "1 local business",
  "map.countNone": "No listed businesses yet",
  "map.noneYetHelp":
    "Businesses are still joining. You can suggest one or browse nearby.",
  "map.topCategories": "Most common here",
  "map.browseHere": "Browse businesses here",
  "map.browseNearby": "Browse within 8 km",
  "map.aboutPlace": "About {place}",
  "map.suggest": "Suggest a business",
  "map.locateTitle": "Find places near me",
  "map.locateButton": "Use my location",
  "map.locating": "Finding your position…",
  "map.locateNote":
    "Your position stays in your browser. It is not sent to OurValleys or stored.",
  "map.locateDenied":
    "We could not get your location. You can still choose a place on the map.",
  "map.locateUnsupported":
    "Your browser cannot share its location. Choose a place on the map instead.",
  "map.locateOutside":
    "You look to be outside the Valleys, so these are the nearest places we cover.",
  "map.nearestHeading": "Closest to you",
  "map.distanceKm": "{distance} km away",
  "map.listTitle": "All places",
  "map.listIntro":
    "The same information as the map, as a list. Places with the most businesses come first.",
  "map.listEmptySummary": "Places with no listed businesses yet ({count})",
  "map.listPlace": "Place",
  "map.listBusinesses": "Businesses",
  "map.unavailableTitle": "The map is not available right now.",
  "map.unavailableBody":
    "Please try again shortly, or browse the directory instead.",
  "map.browseDirectory": "Browse businesses",
  "map.summary": "{places} places, {count} local businesses shown.",
  "map.summaryOne": "{places} places, 1 local business shown.",
  "map.summaryNone": "{places} places. No local businesses listed yet.",
  "map.noscript":
    "The interactive map needs JavaScript. The list below has the same information.",
} as const satisfies Record<string, string>;

export const mapCy: Record<keyof typeof mapEn, string> = {
  "nav.map": "Map",
  "map.metaTitle": "Map i archwilio’r cymoedd",
  "map.metaDescription":
    "Gwelwch ble mae busnesau lleol ar draws Cymoedd De Cymru a dewch o hyd i’r llefydd agosaf atoch chi.",
  "map.eyebrow": "Archwilio",
  "map.title": "Y cymoedd, fesul lle.",
  "map.lead":
    "Mae pob swigen yn dref neu’n bentref. Mae gan y swigod mwy fwy o fusnesau lleol. Dewiswch un i weld beth sydd yno, neu dewch o hyd i’r llefydd agosaf atoch.",
  "map.filterLabel": "Dangos",
  "map.filterAll": "Popeth",
  "map.categoryNav": "Hidlo’r map yn ôl categori",
  "map.mapLabel": "Map o lefydd yng Nghymoedd De Cymru",
  "map.mapHint":
    "Defnyddiwch fysell Tab i symud rhwng llefydd a Enter i ddewis un.",
  "map.placeLabel": "{place}: {count} busnes lleol",
  "map.placeLabelOne": "{place}: 1 busnes lleol",
  "map.placeLabelNone": "{place}: dim busnesau wedi’u rhestru eto",
  "map.panelTitle": "Am y lle hwn",
  "map.panelEmptyPrompt": "Dewiswch le ar y map i weld beth sydd yno.",
  "map.countMany": "{count} busnes lleol",
  "map.countOne": "1 busnes lleol",
  "map.countNone": "Dim busnesau wedi’u rhestru eto",
  "map.noneYetHelp":
    "Mae busnesau’n dal i ymuno. Gallwch awgrymu un neu bori gerllaw.",
  "map.topCategories": "Mwyaf cyffredin yma",
  "map.browseHere": "Pori busnesau yma",
  "map.browseNearby": "Pori o fewn 8 km",
  "map.aboutPlace": "Am {place}",
  "map.suggest": "Awgrymu busnes",
  "map.locateTitle": "Dod o hyd i lefydd ger fy lleoliad",
  "map.locateButton": "Defnyddio fy lleoliad",
  "map.locating": "Yn dod o hyd i’ch safle…",
  "map.locateNote":
    "Mae eich safle’n aros yn eich porwr. Nid yw’n cael ei anfon i OurValleys na’i gadw.",
  "map.locateDenied":
    "Doedden ni ddim yn gallu cael eich lleoliad. Gallwch ddewis lle ar y map o hyd.",
  "map.locateUnsupported":
    "Ni all eich porwr rannu ei leoliad. Dewiswch le ar y map yn lle hynny.",
  "map.locateOutside":
    "Mae’n ymddangos eich bod y tu allan i’r Cymoedd, felly dyma’r llefydd agosaf rydyn ni’n eu cwmpasu.",
  "map.nearestHeading": "Agosaf atoch chi",
  "map.distanceKm": "{distance} km i ffwrdd",
  "map.listTitle": "Pob lle",
  "map.listIntro":
    "Yr un wybodaeth â’r map, ar ffurf rhestr. Mae’r llefydd sydd â’r mwyaf o fusnesau yn dod gyntaf.",
  "map.listEmptySummary": "Llefydd heb fusnesau wedi’u rhestru eto ({count})",
  "map.listPlace": "Lle",
  "map.listBusinesses": "Busnesau",
  "map.unavailableTitle": "Nid yw’r map ar gael ar hyn o bryd.",
  "map.unavailableBody":
    "Rhowch gynnig arall arni cyn bo hir, neu porwch y cyfeiriadur.",
  "map.browseDirectory": "Pori busnesau",
  "map.summary": "{places} lle, {count} busnes lleol yn cael eu dangos.",
  "map.summaryOne": "{places} lle, 1 busnes lleol yn cael ei ddangos.",
  "map.summaryNone": "{places} lle. Dim busnesau lleol wedi’u rhestru eto.",
  "map.noscript":
    "Mae angen JavaScript ar y map rhyngweithiol. Mae’r un wybodaeth yn y rhestr isod.",
};
