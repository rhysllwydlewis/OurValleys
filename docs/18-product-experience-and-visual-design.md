# Product Experience and Visual Design Specification

## 1. Purpose

This document defines how OurValleys should feel, look and behave as a digital product.

The product charter and MVP specification define what the platform does. This specification defines the intended experience so implementation agents do not produce a generic directory, an ordinary dashboard template or an inconsistent collection of pages.

The working experience direction is:

> A premium, modern and unmistakably local platform that makes finding and supporting life in the Valleys feel useful, engaging and trustworthy.

This is a standing product direction. It may be refined through evidence and visual testing, but it must not be silently replaced by a generic software-as-a-service aesthetic.

## 2. Experience principles

### 2.1 Useful before decorative

Visual polish and animation must support discovery, understanding or confidence. The site should remain useful if motion is reduced, advanced effects fail or a user is on an ordinary mobile connection.

### 2.2 Premium without feeling exclusive

OurValleys should feel carefully designed, high quality and contemporary, but not intimidating, corporate or aimed only at luxury businesses.

Premium means:

- Strong typography.
- Deliberate spacing.
- Refined motion.
- Excellent imagery.
- Clear information hierarchy.
- Consistent interaction patterns.
- High-quality empty, loading and error states.

It does not mean excessive animation, tiny text, low contrast, ornamental complexity or hiding useful information behind effects.

### 2.3 Local without cliché

Use the character of Rhondda Cynon Taf as inspiration without relying on predictable tourism clichés.

Suitable references include:

- Valley contours and layered landscapes.
- Town lights, streets and community density.
- Rivers, routes and connections between places.
- Local stone, slate, mist, woodland and changing light.
- The contrast between industrial heritage and current local life.

Avoid defaulting to generic mountain photography, stereotyped Welsh decoration, flags everywhere or imagery that makes the area appear empty and remote.

### 2.4 Product, not portal

The experience should feel like one connected product. Search, location, saved items, events, business pages and account actions should use shared patterns and persistent context.

Do not reproduce the visual language of an old council portal, newspaper index or crowded link directory.

### 2.5 Calm confidence

The interface should communicate trust through clarity rather than through badges, warnings and boxed text everywhere.

Use plain language, visible status, clear provenance and honest coverage states.

## 3. Provisional visual direction

The visual system is provisional until the public brand is fully confirmed, but implementation should begin with a coherent direction rather than placeholder styling.

### 3.1 Overall character

- Modern editorial layout combined with useful application widgets.
- Spacious composition with selective dense information areas.
- Rounded geometry used consistently, not on every element indiscriminately.
- Layered surfaces and depth used to guide attention.
- Photography and local content given room to breathe.
- Strong, readable type rather than novelty display fonts.
- Subtle texture or atmospheric depth where it does not harm clarity.

### 3.2 Provisional colour system

Begin with semantic tokens rather than hard-coded colours throughout components.

Suggested direction:

- **Canvas:** warm off-white or very light mineral neutral.
- **Ink:** near-black with a slight green or slate undertone.
- **Primary:** deep valley green or blue-green.
- **Secondary:** mist, pale slate or soft moss.
- **Warm accent:** restrained copper, amber or terracotta.
- **Success, warning and danger:** accessible functional colours that remain distinct from brand accents.

A suitable first token study may begin around:

```text
canvas       #F4F5F1
surface      #FFFFFF
ink          #101714
muted-ink    #52605A
primary      #173F35
primary-soft #DDE7E2
warm-accent  #B7774C
line         #D8DDD9
```

These values are not final brand approval. Agents may refine them through contrast testing, screenshots and coherent visual review, but should preserve the restrained premium direction.

### 3.3 Typography

- Use a high-quality, highly readable sans-serif as the primary interface typeface.
- An editorial serif may be used selectively for major headlines or guide content if it improves the design and performance remains acceptable.
- Avoid loading several font families or many font weights.
- Type must remain clear at ordinary mobile sizes and support Welsh characters.
- Use fluid type scales with sensible maximums rather than oversized headings that consume the whole screen.

### 3.4 Shape and spacing

- Use a consistent radius scale.
- Prefer generous spacing and clear grouping over heavy divider use.
- Cards should exist because the content is a meaningful unit, not because every section must become a card.
- Buttons and interactive controls must have comfortable touch targets.

## 4. Liquid-glass language

The product owner prefers a premium liquid-glass or translucent layered aesthetic.

Use this selectively for:

- The primary navigation shell.
- Search and location controls.
- Floating action clusters.
- Login and account dialogs.
- Filter panels and mobile sheets.
- Selected homepage widgets.
- Preview controls and contextual toolbars.

Do not apply transparency to every surface. Main reading content, forms with substantial text and dense dashboard tables usually require solid, stable surfaces.

### 4.1 Requirements

Liquid-glass surfaces must:

- Preserve readable contrast over every background.
- Use a solid or more opaque fallback where backdrop filtering is unsupported.
- Avoid large expensive blur regions on low-powered mobile devices.
- Remain understandable in high-contrast and forced-colour modes.
- Retain visible borders or separation where the background is visually complex.
- Avoid making disabled and active states difficult to distinguish.

### 4.2 Implementation guidance

- Build glass as design-system tokens and component variants, not scattered CSS effects.
- Use restrained blur, transparency, highlight and shadow values.
- Prefer one or two depth levels.
- Test over both photography and plain backgrounds.
- Reduce or remove blur when the performance budget requires it.

## 5. Animated homepage vision

The homepage should be an animated, scroll-responsive experience that introduces the platform and makes local discovery feel alive.

It must not become a passive promotional film. Search and useful content remain the core of the first screen.

## 5.1 Homepage story

A recommended initial sequence is:

### Scene 1 — The Valleys connected

- Open with an atmospheric, premium interpretation of layered valley contours or an abstracted local landscape.
- Use subtle depth, parallax or light movement rather than fast cinematic motion.
- Present the working proposition and universal search immediately.
- Keep the search usable before all animation has loaded.

Suggested working copy hierarchy:

```text
OurValleys
Everything local, all in one place.
Find businesses, events, places and useful local information near you.
```

The exact public wording remains subject to brand validation.

### Scene 2 — Search becomes discovery

As the user begins to scroll, the hero search and location context may transition into a set of real discovery widgets:

- Nearby businesses.
- What is on today or this weekend.
- Popular local categories.
- A selected place or “My Area” panel.

Motion should show that the platform connects information rather than presenting unrelated modules.

### Scene 3 — Local life in motion

Use content cards, map fragments, place names, event previews and business imagery to create a sense of active local life.

The animation may reveal content as layered panels or widgets, but the underlying content must remain real, semantic and navigable.

### Scene 4 — A website for every local business

Demonstrate the flagship proposition through animated generated-site previews:

- A business record is entered once.
- The information assembles into a polished business website.
- The same information appears in search, place and category contexts.

This should be a real product demonstration using representative fictional data, not a vague marketing illustration.

### Scene 5 — Join the local network

End with distinct resident and business pathways:

- Explore what is near you.
- Create or claim a business.

The business call to action should feel valuable but must not overwhelm resident discovery.

## 5.2 Motion behaviour

- Prefer purposeful transitions, gentle parallax, reveal, scale and depth changes.
- Avoid continuous motion that competes with reading.
- Never require scroll-jacking or remove normal browser scrolling.
- Do not make important content readable only during a precise animation frame.
- Avoid heavy autoplay background video as the default implementation.
- Prefer CSS, browser-native capabilities and lightweight TypeScript interaction code before adding a large animation dependency.
- Use a dedicated motion library only when it provides clear maintainability or sequencing value.
- Lazy-load non-essential animation code.

## 5.3 Reduced-motion experience

When reduced motion is requested:

- Remove parallax and large spatial movement.
- Replace animated sequencing with immediate or simple faded states.
- Preserve all content, controls and hierarchy.
- Do not replace the experience with an empty static hero.

## 5.4 Performance requirements

The animated homepage must still target the public-page Core Web Vitals budgets in the MVP specification.

- Essential hero text and search must render server-side.
- The first useful interaction must not wait for animation code.
- Reserve layout space to prevent shifts.
- Optimise and preload only genuinely critical media.
- Do not ship desktop-grade animation payloads to small mobile devices unnecessarily.
- Provide static imagery or simplified effects for constrained devices and connections.

## 6. Widget-based interaction model

The product owner prefers useful widgets and contextual panels over sending users to a new full page for every small action.

A widget is a focused interactive surface such as a dialog, popover, sheet, expandable panel or dashboard card that lets a user complete a clear task without losing context.

Suitable widget experiences include:

- Sign in and account access.
- Location selection.
- Search filters.
- Save and organise an item.
- Event preview.
- Business contact options.
- Share controls.
- Notifications.
- Dashboard summaries.
- Quick editing of simple business details.

## 6.1 Login widget

Selecting **Log in** should normally open an accessible authentication dialog on larger screens.

The dialog should:

- Use the premium glass surface where contrast permits.
- Provide email sign-in and any approved alternative methods.
- Support password recovery and registration paths.
- Trap focus correctly while open.
- Close with Escape where safe.
- Restore focus to the launching control.
- Announce errors accessibly.
- Avoid account-enumeration wording.

On small screens, use a full-height or near-full-height sheet where that is more usable than a small centred dialog.

Authentication must also have a dedicated route or resilient fallback. A critical journey must not be possible only through JavaScript modal state.

## 6.2 Widget routing and resilience

- Important widget states should be deep-linkable or have a dedicated route when useful.
- Browser back behaviour must be predictable.
- Opening a widget must not unexpectedly discard page state.
- A failed widget action should preserve user input where safe.
- Critical information must not exist only in hover content.
- Dialogs and sheets must have clear titles and close controls.

## 6.3 Dashboard widgets

Resident, business and admin dashboards may use a refined modular or bento-style layout where it improves scanning.

Widgets should show actionable information such as:

- Tasks requiring attention.
- Publication state.
- Enquiries.
- Upcoming events.
- Saved items.
- Verification progress.
- Search performance.

Avoid filling dashboards with decorative charts, vanity metrics or cards containing only one line of obvious information.

## 7. Public navigation and shell

- Navigation should feel light, stable and premium.
- A translucent floating shell is appropriate on visually rich homepage sections.
- It may become more opaque after scrolling or over dense content.
- Universal search remains easy to reach.
- Account state and **For Business** remain visible without dominating the navigation.
- Mobile navigation should use a well-designed sheet, not a cramped desktop menu.
- The current place or area should be visible when location context affects results.

## 8. Search experience

Search is the primary product interaction, not a decorative input.

The homepage search should support a clear two-part model:

1. What are you looking for?
2. Where?

The interface may visually combine these into one premium search widget, but the concepts should remain understandable and accessible.

Requirements:

- Keyboard operable.
- Useful suggestions without forcing selection.
- Clear recent or popular searches only where privacy-safe.
- Location can be entered manually.
- Precise location permission is optional.
- Filter state is reflected in the URL on the results page.
- No fictional suggestions presented as real businesses or availability.

## 9. Imagery and media

- Prioritise authentic, high-quality local imagery and owner-supplied business media.
- Record source, permission, credit and alt text.
- Avoid generic stock imagery when it undermines local credibility.
- Use editorial crops consistently.
- Provide graceful layouts when imagery is missing.
- Generated business sites must not all look identical merely because the same image ratio is used.

The animated homepage may use designed landscape layers, illustrations, photography or generated visual assets, but public claims and identifiable business content must remain factual and rights-cleared.

## 10. Generated business website visual quality

Generated sites must feel like credible standalone business websites, not directory entries stretched into a page.

Each template family should have:

- A distinct but related visual rhythm.
- Strong hero treatment.
- Clear contact actions.
- Category-appropriate section order.
- Guarded design choices.
- Premium default typography and spacing.
- Excellent missing-content states.
- Mobile-first contact behaviour.

The platform design and generated business-site designs should share quality standards but do not need to look identical.

## 11. Responsive behaviour

- Design mobile layouts intentionally rather than shrinking desktop effects.
- Reduce decorative layering and blur where screen space or performance requires it.
- Use bottom sheets for suitable mobile widget interactions.
- Keep primary actions within comfortable reach.
- Do not depend on hover.
- Test ordinary small Android devices as well as high-end iPhones and tablets.

## 12. Accessibility requirements

In addition to WCAG 2.2 AA requirements elsewhere in the repository:

- All motion must support reduced-motion preferences.
- Glass surfaces must pass contrast in their actual rendered context.
- Focus must remain visible over translucent surfaces.
- Dialog focus management and return focus must be tested.
- Animated content must not cause unexpected context changes.
- Carousels must not auto-advance without controls and pause behaviour.
- Important status must not be communicated by colour, blur or motion alone.
- Zoom and reflow must not break layered homepage sections.

## 13. Design-system component priorities

The initial design system should include, at minimum:

- Typography and spacing tokens.
- Colour and semantic state tokens.
- Radius, border, elevation and glass tokens.
- Buttons and button groups.
- Links.
- Text fields, text areas, selects and comboboxes.
- Search control.
- Location selector.
- Cards and content tiles.
- Badges and status indicators.
- Dialog.
- Mobile sheet.
- Popover and menu.
- Tabs where justified.
- Toast or non-blocking notification.
- Form errors and summaries.
- Skeleton and loading state.
- Empty state.
- Media frame.
- Navigation shell.
- Widget container.

Build semantic primitives and variants rather than duplicating styled components for each page.

## 14. Visual and interaction review process

A user-interface pull request is not ready based only on code review and passing unit tests.

For substantial UI work, the agent must:

1. Render the affected pages.
2. Capture or inspect desktop, tablet and mobile states.
3. Exercise primary interactions.
4. Test keyboard operation.
5. Test reduced motion.
6. Check loading, empty and failure states.
7. Review visual consistency against this specification.
8. Correct weaknesses.
9. Repeat the review after corrections.

Use screenshot or visual-regression tooling when available. Passing snapshots do not prove that the design is good; they only detect unexpected differences.

## 15. Anti-patterns

Do not produce:

- A generic marketplace clone.
- A crowded council-portal layout.
- A template dashboard with no local character.
- Excessive gradients, glowing borders or science-fiction interface effects.
- Glass applied to every surface.
- An animated hero that prevents immediate search.
- Scroll-jacking.
- Huge video payloads on mobile.
- Motion without reduced-motion behaviour.
- Modal-only critical journeys with no route fallback.
- Tiny low-contrast text over imagery.
- A homepage made entirely of uniform cards.
- Decorative maps that do not support actual place discovery.

## 16. Definition of experience readiness

The initial experience direction is ready for controlled use when:

- The platform shell is coherent and recognisably OurValleys.
- The homepage is animated but remains fast and immediately useful.
- Universal search and location selection work without an account.
- Login and selected contextual actions use accessible widgets with route fallbacks.
- Liquid-glass surfaces are selective, readable and performant.
- Mobile is intentionally designed.
- Reduced-motion behaviour preserves the full experience.
- Representative public, resident, business and admin pages share one design system.
- Generated business templates meet the quality gate in `06-business-website-builder.md`.
- Repeated visual review is no longer finding material inconsistency or usability defects.

## 17. Authority and change control

This specification records the product owner’s current experience preferences and is authoritative for implementation.

Agents may refine details autonomously through evidence, prototyping and review. Materially different visual directions should be presented only when they would create a substantially different public product.

Record major changes in `12-decisions-risks.md`. Do not quietly remove the animated homepage, premium direction, selective liquid-glass language or widget-based interaction model merely because a basic template is faster to implement.
