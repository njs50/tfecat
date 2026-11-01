# TFEcat design guide

This document is the source of truth for visual changes to TFEcat. The product
is dark-mode only. Preserve the restrained forest/terminal character rather
than introducing generic Material styling.

## Brand idea

TFEcat combines three ideas:

- **The Forest's Edge**: deep green-black surfaces and organic phosphor green.
- **The catalog**: clear hierarchy, compact data, and quiet structure.
- **`tcat` CLI**: monospace labels and the `>_` prompt inside the cat mark.

The interface should feel precise and atmospheric, not fantasy-ornamental.
Avoid gradients, glows, textures, oversized shadows, and decorative particles.

## Color tokens

These values are defined in `src/plugins/vuetify.ts`.

| Role | Value | Use |
| --- | --- | --- |
| Background | `#101513` | Page background and deepest rows |
| Surface | `#121816` | Header, cards, controls, standard rows |
| Surface variant | `#18211d` | Table headers, subtle borders, logo tile |
| Primary | `#b8f36b` | Logo, active indicator, primary actions |
| Primary hover | `#cdf995` | Optional primary-button hover |
| On primary | `#101513` | Text and icons on primary |
| On surface | `#e9f0ec` | Primary text |
| Secondary | `#92a099` | Table headings and supporting text |
| Muted | `#738078` | Inactive navigation and quiet metadata |

Use Vuetify theme variables rather than repeating hex values. `Muted` is the
only local extension currently used directly in `src/App.vue`.

## Typography

- **Body and headings:** Roboto, loaded in `index.html`.
- **Brand, navigation, eyebrow labels, and table headings:** system monospace:
  `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
- **Wordmark:** `1.7rem`, weight `700`, tracking `-0.08em`.
- **Navigation:** `0.75rem`, weight `600`, tracking `0.18em`, uppercase.
- **Page eyebrow:** `0.75rem`, weight `600`, tracking `0.16em`, uppercase.
- **Page title:** `2rem` desktop and `1.75rem` below 600px, weight `600`.

Do not replace the wordmark with an image. Keeping it as text makes it sharp,
accessible, and responsive.

## Logo and app icons

The reusable UI mark is `src/components/BrandMark.vue`. Editable and generated
app assets live in `public/icons/`.

- The mark is an angular cat silhouette containing a `>_` prompt.
- Header size is **56 × 56px**.
- Keep the phosphor-green cat on the dark surface-variant tile.
- Do not add outlines, gradients, shadows, whiskers, or extra detail.
- Preserve the maskable safe area in `tfecat-maskable.svg`.

PWA assets include standard 192/512px icons, maskable 192/512px icons,
`apple-touch-icon.png`, a monochrome SVG, and favicon variants.

## Global layout

- Maximum content width: **1280px**.
- Mobile horizontal gutter: **24px**.
- Gutter from the `sm` breakpoint: **32px**.
- Main content begins **40px** below the header.
- Keep page content left-aligned with the logo and navigation.

### Header geometry

The header is intentionally constructed rather than using a Vuetify toolbar:

1. **20px** top padding.
2. **56px** brand/action row.
3. **20px** gap before primary navigation.
4. Navigation text plus **16px** bottom padding.
5. **4px** active indicator aligned to the bottom header edge.

Total app-bar height is **124px**. Do not reintroduce `v-toolbar` or `v-tabs`;
their internal sizing and opacity rules change this geometry.

The Install CLI button is 40px high with an 8px radius, monospace uppercase
text, and the MDI terminal icon. It must continue to open the existing install
dialog.

### Primary navigation

- Gap between links: **32px**.
- Labels never wrap.
- Active and hover text use `on-surface`.
- Inactive text uses the muted token.
- The active item has a **4px primary underline**.
- `Item catalog` is the homepage and default active destination.
- Order: **Item catalog**, **Trainers**, **Item audit**.

## Catalog components

### Filters

- Use a surface background with a quiet surface-variant border.
- Avoid elevation; structure comes from borders and spacing.
- Keep existing responsive field behavior.

### Search and table card

- Card radius: **12px**.
- Card border: surface variant.
- Search width: **360px** on larger screens and full width below 600px.
- Search uses the outlined, compact Vuetify field.
- Table header height: **52px**.
- Data row height: **56px**.
- Table headings use secondary-colored monospace uppercase labels.
- Alternate between surface and background; the difference should be subtle.
- Row hover is primary at roughly **9% opacity**.
- Footer uses the surface background and secondary text.

Do not return to neutral `#232323` zebra stripes. All table structure should
remain within the green-charcoal palette.

## Responsive behavior

The key mobile review width is **390px**.

- Brand, wordmark, and Install CLI action must fit on one row.
- All three navigation labels must remain on one line.
- Search becomes full width below 600px.
- Page title drops to `1.75rem` below 600px.
- Existing table column logic decides which columns are hidden below `md`.
- Filter fields become one per row below 450px.

Always inspect at 390px and at a desktop width before shipping header or table
changes.

## Accessibility and interaction

- Preserve semantic `nav`, links, labels, and `aria-current="page"`.
- Use `aria-label` on the brand home action.
- Maintain visible keyboard focus and adequate contrast.
- Do not communicate active state through color alone; keep the underline.
- Use MDI for interface icons. Do not use emoji as UI symbols.
- Keep the install dialog and item-detail dialog keyboard accessible.

## Implementation map

- `src/App.vue`: header, navigation, catalog layout, table, and local styling.
- `src/components/BrandMark.vue`: reusable logo mark.
- `src/plugins/vuetify.ts`: authoritative theme tokens.
- `public/icons/`: favicon and PWA assets.
- `package.json`: normal and Make-specific Vite commands.
- `.figma/make/`: Make lifecycle scripts in the Make workspace.

When working inside Figma Make, the GitHub checkout is under `tfecat/` and the
Make preview uses a materialized copy at the workspace root. Keep application
changes synchronized in both locations; commit GitHub changes from `tfecat/`.

## Review checklist

- Uses the documented theme tokens.
- Matches the 124px header geometry.
- Logo and navigation align with page content.
- Navigation remains one line at 390px.
- Table uses green-charcoal surfaces, not generic grey.
- Hover, focus, active, and disabled states are clear.
- `pnpm run build:make` passes in Make.
- Normal GitHub Pages behavior still uses the `/tfecat/` production base.
