# Display comfort (`/display`)

Visitors can tailor how OurValleys looks to them without an account.

**Choices** (one cookie, `ov-display`, one year, not httpOnly, no personal data): text size (standard, large 112.5%, larger 125%), contrast (standard, high), movement (follow device, reduced), spacing (standard, relaxed) and typeface (OurValleys, plain system font).

**How it works.** `src/lib/display/preferences.ts` validates every value against closed lists, so a tampered or oversized cookie falls back to the standard look. The root layout reads the cookie and sets `data-display-*` attributes on `<html>` (only non-default values). `src/app/display-preferences.css` maps them onto the `--canvas`/`--ov-*` tokens: high contrast removes glass transparency and blur and underlines links; reduced movement overrides animation and transition durations and smooth scrolling; text size scales `rem`. The `/display` page is a plain form with a server action (works without JavaScript), a sample that previews the unsaved selection via CSS `:has()`, and a reset. Linked from the footer and the accessibility statement. English and Welsh (Welsh first-draft, needs fluent review).

**Not done / next.** Saving the choice to a resident's account; a quick "Aa" control in the header; text-size handling inside business-owned `/b/[slug]` themes (they inherit the root scale but owner themes keep their own colours, so high contrast only affects shared tokens).
