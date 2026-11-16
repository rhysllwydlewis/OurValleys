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
    "Rivers, hills, towns and villages, as they lie. A numbered marker shows how many local businesses a place has. Pick a place to see what is there, or find the places closest to you.",
  "map.filterLabel": "Show",
  "map.filterAll": "Everything",
  "map.categoryNav": "Filter the map by category",
  "map.mapLabel": "Map of places in the South Wales Valleys",
  "map.mapHint":
    "Use the Tab key to move between places and Enter to choose one. Zoom with the buttons, then drag or use the arrow keys to move around.",
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
  "map.valleysLabel": "Valleys",
  "map.valleysNav": "Focus the map on a valley",
  "map.valleyAll": "All valleys",
  "map.valleyCounts": "Places: {places} · Businesses: {count}",
  "map.valleyPlaces": "Places in {valley}",
  "map.valleyBrowse": "Browse businesses in {valley}",
  "map.valleyAbout": "About {valley}",
  "map.valleyClear": "Show every valley",
  "map.placeInValley": "In {valley}",
  "map.listOther": "Other places",
  "map.zoomIn": "Zoom in",
  "map.zoomOut": "Zoom out",
  "map.zoomReset": "Show the whole map",
  "map.zoomGroup": "Map zoom",
  "map.legendLabel": "Map key",
  "map.legendBusinesses": "Places with local businesses",
  "map.legendPlace": "Town or village",
  "map.legendRiver": "River",
  "map.legendRail": "Railway",
  "map.legendRoad": "Main road",
  "map.legendYou": "You are here",
  "map.attribution":
    "Contains OS data © Crown copyright and database right 2026. Source: Office for National Statistics licensed under the Open Government Licence v3.0.",
} as const satisfies Record<string, string>;

export const mapCy: Record<keyof typeof mapEn, string> = {
  "nav.map": "Map",
  "map.metaTitle": "Map i archwilio’r cymoedd",
  "map.metaDescription":
    "Gwelwch ble mae busnesau lleol ar draws Cymoedd De Cymru a dewch o hyd i’r llefydd agosaf atoch chi.",
  "map.eyebrow": "Archwilio",
  "map.title": "Y cymoedd, fesul lle.",
  "map.lead":
    "Afonydd, bryniau, trefi a phentrefi, fel y maen nhw. Mae marciwr â rhif yn dangos faint o fusnesau lleol sydd gan le. Dewiswch le i weld beth sydd yno, neu dewch o hyd i’r llefydd agosaf atoch.",
  "map.filterLabel": "Dangos",
  "map.filterAll": "Popeth",
  "map.categoryNav": "Hidlo’r map yn ôl categori",
  "map.mapLabel": "Map o lefydd yng Nghymoedd De Cymru",
  "map.mapHint":
    "Defnyddiwch fysell Tab i symud rhwng llefydd ac Enter i ddewis un. Chwyddwch â’r botymau, yna llusgwch neu defnyddiwch y bysellau saeth i symud o gwmpas.",
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
  "map.valleysLabel": "Cymoedd",
  "map.valleysNav": "Canolbwyntio’r map ar gwm",
  "map.valleyAll": "Pob cwm",
  "map.valleyCounts": "Lleoedd: {places} · Busnesau: {count}",
  "map.valleyPlaces": "Lleoedd yn {valley}",
  "map.valleyBrowse": "Pori busnesau yn {valley}",
  "map.valleyAbout": "Am {valley}",
  "map.valleyClear": "Dangos pob cwm",
  "map.placeInValley": "Yn {valley}",
  "map.listOther": "Lleoedd eraill",
  "map.zoomIn": "Chwyddo i mewn",
  "map.zoomOut": "Chwyddo allan",
  "map.zoomReset": "Dangos y map cyfan",
  "map.zoomGroup": "Chwyddo’r map",
  "map.legendLabel": "Allwedd y map",
  "map.legendBusinesses": "Llefydd â busnesau lleol",
  "map.legendPlace": "Tref neu bentref",
  "map.legendRiver": "Afon",
  "map.legendRail": "Rheilffordd",
  "map.legendRoad": "Prif ffordd",
  "map.legendYou": "Rydych chi yma",
  "map.attribution":
    "Yn cynnwys data’r OS © Hawlfraint y Goron a hawl cronfa ddata 2026. Ffynhonnell: Y Swyddfa Ystadegau Gwladol, wedi’i drwyddedu o dan y Drwydded Llywodraeth Agored f3.0.",
};
