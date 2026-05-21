# DESIGN.md — PGSH Design System

Visual reference screens are in [`design_images/`](design_images/).

This document is the source of truth for all design decisions. When in doubt about a color, spacing, or component variant — check here first.

---

## Color Tokens

### Brand palette

| Token | Value | Usage |
|---|---|---|
| `brand.navy` | `#0F4C81` | Primary brand color, sidebar header, key CTAs |
| `brand.sky` | `#0EA5E9` | Accent, active states, progress bars, links |
| `brand.navyDark` | `#0A3660` | Hover state of navy elements |
| `brand.skyLight` | `#E0F2FE` | Tinted backgrounds for sky-accented cards |

### Semantic colors

| Token | Value | Usage |
|---|---|---|
| `success` | `#10B981` | Validated status, positive metrics |
| `warning` | `#F59E0B` | Pending states, absence alerts, "soon" badges |
| `danger` | `#EF4444` | Rejected status, error states |
| `info` | `#0EA5E9` | Informational, planned states |

### Surface palette (light theme)

| Token | Value | Usage |
|---|---|---|
| `bg.page` | `#F8FAFC` | Page background |
| `bg.card` | `#FFFFFF` | Card/panel surface |
| `bg.subtle` | `#F1F5F9` | Subtle section backgrounds, table rows |
| `border` | `#E2E8F0` | Card borders, dividers, input borders |
| `borderFocus` | `#0EA5E9` | Focused input ring |

### Text palette

| Token | Value | Usage |
|---|---|---|
| `text.primary` | `#0F172A` | Headings, body text |
| `text.secondary` | `#475569` | Secondary labels, descriptions |
| `text.muted` | `#94A3B8` | Placeholder text, metadata, timestamps |
| `text.inverse` | `#FFFFFF` | Text on dark/colored backgrounds |

### Dark theme (Phase 7)

Dark theme surfaces will use Mantine's built-in dark color scheme. Key overrides:
- `bg.page` → `#0F172A`
- `bg.card` → `#1E293B`
- `border` → `#334155`

---

## Typography

### Font stack

```css
/* Latin (FR/EN) */
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;

/* Arabic (AR) */
font-family: 'Noto Sans Arabic', 'Plus Jakarta Sans', sans-serif;

/* Monospace (code, IDs, CNE numbers) */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

Both fonts are loaded from Google Fonts. Include in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale

| Role | Size | Weight | Usage |
|---|---|---|---|
| `display` | 2rem (32px) | 800 | Page hero headings |
| `h1` | 1.5rem (24px) | 700 | Page titles |
| `h2` | 1.25rem (20px) | 700 | Section headings |
| `h3` | 1.125rem (18px) | 600 | Card titles |
| `h4` | 1rem (16px) | 600 | Sub-headings |
| `body` | 0.9375rem (15px) | 400 | Body text |
| `small` | 0.875rem (14px) | 400 | Secondary text, labels |
| `xs` | 0.75rem (12px) | 500 | Badges, chips, metadata |
| `mono` | 0.875rem (14px) | 400 | CNE, IDs, codes |

---

## Spacing

Base unit: **4px**. All spacing uses multiples of 4.

| Token | Value | Mantine size |
|---|---|---|
| `xs` | 4px | `xs` |
| `sm` | 8px | `sm` |
| `md` | 16px | `md` |
| `lg` | 24px | `lg` |
| `xl` | 32px | `xl` |
| `2xl` | 48px | — |
| `3xl` | 64px | — |

---

## Border Radius

| Context | Value |
|---|---|
| Cards, panels | `12px` |
| Inputs, selects | `8px` |
| Buttons | `8px` |
| Badges, chips | `999px` (pill) |
| Avatars | `50%` (circle) |
| Modals | `16px` |
| Images | `8px` |

---

## Shadows

| Level | Usage | Value |
|---|---|---|
| `xs` | Subtle card lift | `0 1px 3px rgba(0,0,0,0.08)` |
| `sm` | Resting card | `0 2px 8px rgba(0,0,0,0.08)` |
| `md` | Hover state | `0 4px 16px rgba(0,0,0,0.10)` |
| `lg` | Modals, dropdowns | `0 8px 32px rgba(0,0,0,0.12)` |

Cards use `sm` shadow at rest, transition to `md` on hover.

---

## Component Patterns

### Cards

```
- Background: bg.card (#FFFFFF)
- Border: 1px solid border (#E2E8F0)
- Border radius: 12px
- Padding: 20px (md+)
- Shadow: sm at rest, md on hover
- Hover transition: shadow + border-color → borderFocus (200ms ease)
```

### Status badges

All badges use `variant="light"` (Mantine) with the semantic color. Style: pill shape (`radius="xl"`), `size="sm"`, weight 600.

| Status | Color | Label (FR) |
|---|---|---|
| `Pending` | `yellow` / warning | En attente |
| `Active` | `blue` / sky | En cours |
| `Validated` | `green` / success | Validée |
| `Failed` | `red` / danger | Échouée |
| `Withdrawn` | `gray` | Abandonnée |
| `Planned` | `gray` | Planifiée |
| `Completed` | `teal` | Terminée |
| `Rejected` | `red` | Rejetée |

### Stat cards

Small card variant: icon in a colored circle (24×24, `rem` units), large number (1.75rem 700), label below in text.muted. Used in dashboard grid.

### Gradient card header

Used on "Mon stage actuel" and featured cards:
```css
background: linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%);
color: white;
padding: 24px;
border-radius: 12px 12px 0 0;
```

### Form fields (read/edit)

Read mode: label in text.muted (12px), value in text.primary (15px), separated by a 1px bottom border on hover.
Edit mode: Mantine `TextInput` with standard border + focus ring in sky blue.

---

## Responsive Breakpoints

Mantine's default breakpoints (used throughout):

| Name | Min width | Layout change |
|---|---|---|
| `xs` | 576px | — |
| `sm` | 768px | Sidebar appears; bottom nav disappears |
| `md` | 992px | 2-col layouts |
| `lg` | 1200px | 3-col grids, wider sidebar |
| `xl` | 1400px | — |

**Mobile-first approach.** Design for 375px wide first, then add breakpoint overrides.

### Layout per breakpoint

| Breakpoint | Navigation | Content |
|---|---|---|
| `<sm` (mobile) | Bottom nav bar, no sidebar | Single column |
| `sm–md` (tablet) | Sidebar collapsed (icon-only) | 1–2 columns |
| `≥md` (desktop) | Sidebar expanded (260px) | 2–3 columns |

---

## Animation

Keep animations subtle and purposeful:

| Context | Animation |
|---|---|
| Page entrance | `opacity: 0 → 1` + `translateY(8px → 0)`, 200ms ease-out |
| Modal open | Mantine's default (scale + fade) |
| Sidebar collapse | Width transition 250ms ease |
| Card hover | Shadow + border-color 150ms ease |
| Skeleton shimmer | `@keyframes shimmer` left→right gradient, 1.5s infinite |
| Tab switch | Opacity 150ms |
| Toast entrance | Slide in from right, 250ms |

No parallax, no rotation, no bounce. Keep it clean.

---

## Iconography

All icons from **Tabler Icons** (`@tabler/icons-react`). Use size `20` for inline icons, `24` for standalone, `16` for dense UI (table rows, small badges).

Stroke width: `1.5` (Tabler default is fine).

Key icon–concept mapping:
| Concept | Icon |
|---|---|
| Dashboard | `IconLayoutDashboard` |
| Profile / User | `IconUser` |
| Stages / Rotations | `IconStethoscope` |
| History / Timeline | `IconTimeline` |
| Demands | `IconFileText` |
| Messages | `IconMessage` |
| Notifications | `IconBell` |
| Hospital | `IconBuildingHospital` |
| Calendar / Dates | `IconCalendar` |
| Validation / Check | `IconCircleCheck` |
| Warning / Absence | `IconAlertTriangle` |
| Info | `IconInfoCircle` |
| Edit | `IconPencil` |
| Delete | `IconTrash` |
| Download | `IconDownload` |
| Settings | `IconSettings` |
| Logout | `IconLogout` |
| Language | `IconLanguage` |

---

## Skeleton / Loading States

Skeleton components mirror the exact dimensions of the real content. Each has:
- `background: #E2E8F0` base
- Shimmer animation (lighter sweep, 1.5s)
- Same border-radius as the real element

Never show a spinner inside a card — show a skeleton matching the card's content structure.

---

## Empty States

Every list/table that can be empty has an empty state:
- Centered in the container
- SVG illustration (inline, < 5KB)
- Heading in `h3` style
- Short description in `text.secondary`
- Action button if applicable (e.g., "Créer un stage")

---

## Themes

Currently: **light theme only** (Phase 7 adds dark).

The light theme is the default and is fully designed. Dark theme color tokens are planned but not finalized — do not build for dark mode during Phase 1–2. Use Mantine's `colorScheme` system so the toggle is easy to add later.

When Arabic (`dir="rtl"`) is active:
- Mantine flips layout automatically
- Sidebar appears on the right
- Bottom nav icons remain (they're symmetric)
- Text alignment flips where appropriate
- Icon-only elements (buttons, badges) are unaffected
