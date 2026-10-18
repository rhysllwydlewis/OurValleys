# 59. Extra website sections (FAQ, price lists, team, areas, facilities)

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).
Governing brief: `docs/32-free-business-website-product-brief.md` §9 and WP-06/WP-11.

## What an owner can do

On the operations page (`/dashboard/business/[id]/operations#extra-sections`) an owner with the
`manage_content` permission builds up to 12 sections of six types:

| Type            | Row fields                        | Public presentation                           |
| --------------- | --------------------------------- | --------------------------------------------- |
| `faq`           | question, answer                  | Native `<details>` accordion + `FAQPage` data |
| `products`      | name, description, price          | Price list                                    |
| `treatments`    | name, description, time and price | Price list                                    |
| `team`          | name, about them, role            | People cards                                  |
| `areas_covered` | area                              | Chips                                         |
| `facilities`    | facility                          | Chips                                         |

- Each section is a plain-form row editor (works without script): saved entries first, then three
  blank spare rows. Blank rows are ignored; a row with text but no name is refused, never dropped.
- Edit in place (a section keeps its place), move up/down, hide/show (content kept), confirmed remove.
- Guidance by business category (`recommendedSectionTypes`): what is worth adding, thin FAQs,
  unanswered questions, unpriced entries, people without roles, everything hidden.
- Sections appear in the public page menu and in the private preview, in the saved order.

## Data and rules

No schema change: content stays in `business_category_section.content` (`{ entries: [...] }`).
New sections go last under a per-business advisory lock that also enforces the 12-section limit and
serialises moves; moves rewrite orders as 0..n in one transaction. Every write is scoped by
`business_id` (tenant isolation tests cover edit, move, hide and remove across businesses).

Public output escapes everything as text (no HTML). The owner's words are tagged `lang="en-GB"`
inside a Welsh page until Welsh translation of these sections exists (next slice).

`FAQPage` JSON-LD is emitted only for active FAQ sections, only for entries that have an answer,
never for demo records, and never empty.

## Out of scope / next

Welsh translation of section headings and entries, placing sections in the designer's section
order and layout choices, photos for team and products, per-entry hide, drag and drop.
