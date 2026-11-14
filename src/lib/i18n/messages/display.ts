/**
 * Strings for the display comfort settings (`/display`). Spread into the main
 * catalogues. Welsh is first-draft and needs review by a fluent Welsh speaker
 * before launch.
 */
export const displayEn = {
  "display.metaTitle": "Display and comfort",
  "display.eyebrow": "Accessibility",
  "display.title": "Make OurValleys comfortable to read",
  "display.lead":
    "Choose the text size, contrast, motion and spacing that suit you. Your choices are kept on this device, apply to every page, and need no account.",
  "display.saved": "Your display choices are saved on this device.",
  "display.reset": "Your display choices are back to the standard look.",
  "display.sample.title": "How it will look",
  "display.sample.heading": "Market day in the valley",
  "display.sample.body":
    "Fresh bread from the bakery, a repair café at the library and a walking group meeting at ten. This sample follows the choices you have saved.",
  "display.sample.link": "A link looks like this",
  "display.save": "Save my choices",
  "display.resetButton": "Back to standard",
  "display.footerNote":
    "Your browser or device settings still apply on top of these. Read our accessibility statement for what we do to keep the site usable.",
  "display.statementLink": "Accessibility statement",
  "display.link": "Display settings",

  "display.group.text": "Text size",
  "display.group.contrast": "Contrast",
  "display.group.motion": "Movement",
  "display.group.spacing": "Spacing",
  "display.group.font": "Typeface",

  "display.text.standard": "Standard",
  "display.text.large": "Large",
  "display.text.larger": "Larger",
  "display.contrast.standard": "Standard",
  "display.contrast.high": "High contrast",
  "display.motion.system": "Follow my device",
  "display.motion.reduced": "Reduce movement",
  "display.spacing.standard": "Standard",
  "display.spacing.relaxed": "Relaxed",
  "display.font.standard": "OurValleys",
  "display.font.plain": "Plain system font",

  "display.hint.text": "Scales all text and the space around it.",
  "display.hint.contrast":
    "Black on white, firm outlines, underlined links and no see-through panels.",
  "display.hint.motion":
    "Stops animations and smooth scrolling even if your device allows them.",
  "display.hint.spacing": "More room between lines, words and letters.",
  "display.hint.font": "Uses your device's own typeface instead of ours.",
} as const;

export const displayCy: Record<keyof typeof displayEn, string> = {
  "display.metaTitle": "Dangosydd a chysur",
  "display.eyebrow": "Hygyrchedd",
  "display.title": "Gwnewch OurValleys yn gyfforddus i'w ddarllen",
  "display.lead":
    "Dewiswch y maint testun, y cyferbyniad, y symudiad a'r bylchau sy'n addas i chi. Cedwir eich dewisiadau ar y ddyfais hon, maent yn berthnasol i bob tudalen, ac nid oes angen cyfrif.",
  "display.saved": "Mae eich dewisiadau dangos wedi'u cadw ar y ddyfais hon.",
  "display.reset": "Mae eich dewisiadau dangos yn ôl i'r olwg safonol.",
  "display.sample.title": "Sut fydd yn edrych",
  "display.sample.heading": "Diwrnod marchnad yn y cwm",
  "display.sample.body":
    "Bara ffres o'r siop fara, caffi trwsio yn y llyfrgell a grŵp cerdded yn cyfarfod am ddeg. Mae'r sampl hon yn dilyn y dewisiadau rydych wedi'u cadw.",
  "display.sample.link": "Dyma sut mae dolen yn edrych",
  "display.save": "Cadw fy newisiadau",
  "display.resetButton": "Yn ôl i'r safon",
  "display.footerNote":
    "Mae gosodiadau eich porwr neu ddyfais yn dal i weithio ar ben y rhain. Darllenwch ein datganiad hygyrchedd i weld beth rydym yn ei wneud i gadw'r safle'n hawdd ei ddefnyddio.",
  "display.statementLink": "Datganiad hygyrchedd",
  "display.link": "Gosodiadau dangos",

  "display.group.text": "Maint testun",
  "display.group.contrast": "Cyferbyniad",
  "display.group.motion": "Symudiad",
  "display.group.spacing": "Bylchau",
  "display.group.font": "Ffurfdeip",

  "display.text.standard": "Safonol",
  "display.text.large": "Mawr",
  "display.text.larger": "Mwy",
  "display.contrast.standard": "Safonol",
  "display.contrast.high": "Cyferbyniad uchel",
  "display.motion.system": "Dilyn fy nyfais",
  "display.motion.reduced": "Lleihau symudiad",
  "display.spacing.standard": "Safonol",
  "display.spacing.relaxed": "Llaes",
  "display.font.standard": "OurValleys",
  "display.font.plain": "Ffont plaen y system",

  "display.hint.text": "Yn graddio'r holl destun a'r lle o'i gwmpas.",
  "display.hint.contrast":
    "Du ar wyn, amlinelliadau cadarn, dolenni wedi'u tanlinellu a dim paneli tryloyw.",
  "display.hint.motion":
    "Yn atal animeiddiadau a sgrolio llyfn hyd yn oed os yw eich dyfais yn eu caniatáu.",
  "display.hint.spacing": "Mwy o le rhwng llinellau, geiriau a llythrennau.",
  "display.hint.font": "Yn defnyddio ffurfdeip eich dyfais yn lle ein un ni.",
};
