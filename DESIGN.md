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

## Shell Layout (from `design_images/`)

### Sidebar (`AppShell.Navbar`)

```
Width:            220px
Background:       #FFFFFF
Border-right:     1px solid #E2E8F0

── Logo area (top) ──────────────────────────────
Avatar:           34×34, radius md, gradient (135deg #0F4C81 → #0EA5E9), "PS" in white 800
Title:            "PGSH", 14px 800, color navy.6
Subtitle:         "Stages Hospitaliers", 11px 500, muted

── "MENU" label ─────────────────────────────────
Text:             xs, 600, dimmed, uppercase, letter-spacing 0.8px

── Nav items ────────────────────────────────────
Height:           38px
Padding:          8px 10px
Border-radius:    8px
Icon:             18px, stroke 1.5
  • Inactive: color #94A3B8
  • Active:   color #0F4C81
Label:            14px 500 inactive / 600 active
Background:
  • Inactive: transparent
  • Hover:    #F8FAFC
  • Active:   #E8F1FB (navy[0])
Text color active: #0F4C81 (navy[6])
"Bientôt" badge: xs, warning color, light variant, xl radius (right side)

Nav items (in order):
  Tableau de bord   IconLayoutDashboard  /student (exact match)
  Mon Profil        IconUser             /student/profile
  Mes Stages        IconStethoscope      /student/stages
  Historique        IconTimeline         /student/history
  Demandes          IconFileText         /student/demands  [Bientôt]
  Messages          IconMessage          —                 [Bientôt]

── Bottom user card ─────────────────────────────
Border-top:       1px solid #E2E8F0
Avatar:           32×32, gradient background, initials
Name:             13px 600
Role:             11px, dimmed ("Étudiant")
Logout icon:      IconLogout, 16px, subtle action icon
```

### Header (`AppShell.Header`)

```
Height:           60px
Background:       #FFFFFF
Border-bottom:    1px solid #E2E8F0

Left:
  Burger (mobile only) + Breadcrumb:
    "PGSH" dimmed  /  "Page name" navy.6 600 sm

Right (left → right):
  IconSearch        18px, subtle gray action icon
  IconBell          18px, subtle gray action icon
  Language switcher:
    Three buttons: 🇫🇷 FR | 🇲🇦 AR | 🇬🇧 EN
    Active (FR):  background #E8F1FB, text navy, xs 600
    Inactive:     transparent, text muted, xs 600
  Avatar:           32×32, gradient background, initials, xl radius
```

### Main content area

```
Background:   #F8FAFC (bg.page)
Padding:      xl (32px) all sides
```

---

## Page Layouts (from `design_images/`)

### Dashboard Home (`dashboard-home.png`)

```
Greeting:
  "Hello, {name} 👋"  — display size (~28-32px), 800 weight
  Subtitle in text.muted

4-stat card row (SimpleGrid cols=4, gap md):
  Each stat card:
    • Icon in colored circle (24×24, variant=light, specific color per stat)
    • Large number (rem(28), 700)
    • Label below in text.muted (xs)
  Stats: Academic Year | Enrollment Status | Internships Completed | Absences

2-col section (gap md):
  Left (~60%): "Mon stage actuel" card — gradient header
  Right (~40%): "Activité récente" timeline list

Stage row card (full width, below 2-col):
  Compact horizontal layout with hospital + service + dates + CTA buttons
```

### Profile Page (`profile-page.png`, `Cursus.png`)

```
Layout: 2-column (280px fixed left | rest right)

Left panel (Card, no padding, radius lg):
  Header:          160px tall, gradient (135deg #0F4C81 → #0EA5E9)
  Avatar:          60×60, centered, gradient bg, initials white 700, circle
  Name:            16px 700, centered, mt sm
  CNE:             12px, dimmed, mono font
  Program badge:   navy outline, "Médecine — Année 6", xs, radius xl
  Action buttons:  3 icon buttons (edit / download / share), subtle, centered row
  Stats row:       "2/4 Stages" | "17.0 Moy." — sm numbers, xs labels below

Right panel:
  Tabs: Informations personnelles | Cursus académique | Documents
  
  Personal info tab — 2-col grid of field cells:
    Each cell:
      • Icon (16px, specific color per field type)
      • LABEL in uppercase muted xs
      • Value in text.primary sm
      • Card: white, bordered, radius md, padding sm md

  Academic record tab — same 2-col grid:
    Filière | Année | CNE | Apogée | Série bac | Année bac | Mention bac | Statut convention
    Each cell has a colored tinted icon circle (teal, blue, yellow, green per category)
    "À jour" green badge top-right of section
```

### Stages List (`stages-list.png`)

```
Page header:
  Title: "Mes Stages", h2
  Subtitle: "Suivez vos stages passés, en cours et à venir."

Filter tabs (SegmentedControl or custom pills):
  Tous (5) | En cours (1) | Terminés (2) | Planifiés (2)
  Count shown as number directly in the tab label

Stage cards (SimpleGrid cols=3, gap md):
  Card structure:
    Top: hospital building icon + hospital name (dimmed sm) | status badge (right)
    Service name: h3 weight, 16px 600
    Info row: calendar icon + date range ("15 mai → 15 juin 2026") | city | duration
    
    If "En cours":
      Progress bar (sky blue, thin ~6px) + "Progression 42%" label
    
    If "Terminés":
      Score display: "NOTE FINALE" label (xs dimmed) + "16.5 / 20" (xl 700 navy)
    
    Button row:
      "Détails"      — outline variant, sm
      "Évaluation →" — filled navy, sm
```

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
