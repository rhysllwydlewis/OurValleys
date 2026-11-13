/**
 * Strings for the rebuilt sign-in experience: the welcome panel's highlights,
 * the password helpers, the demonstration chooser and the second sign-in step.
 * Spread into the main catalogues.
 * Welsh is first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const signinEn = {
  "signin.panelTitle": "Welcome back",
  "signin.panelLead":
    "Sign in with the email address and password for your account.",
  "signin.show": "Show",
  "signin.hide": "Hide",
  "signin.showAria": "Show characters",
  "signin.hideAria": "Hide characters",
  "signin.capsLock": "Caps Lock is on.",
  "signin.redirecting": "Signed in. Taking you there…",
  "signin.createAccount": "Create a free account",

  "signin.demoHeading": "Try a demonstration",
  "signin.demoLead":
    "Fictional accounts for looking around before launch. Nothing in them is real.",
  "signin.demoChoose": "Demonstration account",

  "signin.secondTitle": "One more step",
  "signin.secondLead":
    "Enter the 6-digit code from your authenticator app to finish signing in.",
  "signin.secondRecoveryLead":
    "Enter one of the recovery codes you saved when you turned on two-step sign-in. Each code works once.",
  "signin.secondBack": "Start again with a different account",

  "signin.benefitsAria": "What an account is for",
  "signin.benefit1Title": "Keep what matters",
  "signin.benefit1Text":
    "Save businesses, places, events and offers to come back to.",
  "signin.benefit2Title": "Follow local life",
  "signin.benefit2Text":
    "See what is new from the businesses and places you follow.",
  "signin.benefit3Title": "Run your business page",
  "signin.benefit3Text":
    "Update one profile and your listing and website change together.",
} as const;

export const signinCy: Record<keyof typeof signinEn, string> = {
  "signin.panelTitle": "Croeso’n ôl",
  "signin.panelLead":
    "Mewngofnodwch gyda chyfeiriad e-bost a chyfrinair eich cyfrif.",
  "signin.show": "Dangos",
  "signin.hide": "Cuddio",
  "signin.showAria": "Dangos y nodau",
  "signin.hideAria": "Cuddio’r nodau",
  "signin.capsLock": "Mae Caps Lock ymlaen.",
  "signin.redirecting": "Wedi mewngofnodi. Yn eich tywys yno…",
  "signin.createAccount": "Creu cyfrif am ddim",

  "signin.demoHeading": "Rhowch gynnig ar arddangosiad",
  "signin.demoLead":
    "Cyfrifon ffuglennol ar gyfer edrych o gwmpas cyn lansio. Nid oes dim ynddynt yn real.",
  "signin.demoChoose": "Cyfrif arddangos",

  "signin.secondTitle": "Un cam arall",
  "signin.secondLead":
    "Rhowch y cod 6 digid o’ch ap dilysu i orffen mewngofnodi.",
  "signin.secondRecoveryLead":
    "Rhowch un o’r codau adfer a gadwyd gennych wrth droi mewngofnodi dau gam ymlaen. Mae pob cod yn gweithio unwaith.",
  "signin.secondBack": "Dechrau eto gyda chyfrif gwahanol",

  "signin.benefitsAria": "Beth yw diben cyfrif",
  "signin.benefit1Title": "Cadwch yr hyn sy’n bwysig",
  "signin.benefit1Text":
    "Cadwch fusnesau, lleoedd, digwyddiadau a chynigion i ddychwelyd atynt.",
  "signin.benefit2Title": "Dilynwch fywyd lleol",
  "signin.benefit2Text":
    "Gwelwch beth sy’n newydd gan y busnesau a’r lleoedd rydych yn eu dilyn.",
  "signin.benefit3Title": "Rhedwch dudalen eich busnes",
  "signin.benefit3Text":
    "Diweddarwch un proffil ac mae eich rhestriad a’ch gwefan yn newid gyda’i gilydd.",
};
