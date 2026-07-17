# Handoff: Hokage Coaching — "Dojo Poster" Redesign

## Overview
Full visual redesign of the ZenFit/Hokage Coaching app (Expo + React Native + NativeWind/Tailwind). Same features, navigation, and layout order as the current app — only the visual language changes. Direction: **bold & athletic** — dark canvas, poster typography (Anton), skewed red accents, brush-script brand wordmark, gold reserved exclusively for AI features.

Covers all 5 tabs: Home, Routines, Meals, Progress, Profile — dark scheme primary, plus a light-scheme translation (shown on Home; the mapping table below extends it to every screen).

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. The task is to **recreate these designs in the existing Expo/React Native codebase** (`zenfit/`), using its established patterns: NativeWind classes, `src/theme/colors.ts` tokens, existing components (`Card`, `Button`, `SegmentedControl`, `Chip`, `Fab`, `SectionHeader`, progress `Ring`, etc.), Ionicons, and the existing i18n keys. Do not introduce new libraries except the Anton font.

- `Redesign Directions.html` — the approved design. Section "Turn 3" = the rollout (ids 3a–3e) + section "Turn 2" id 2a = approved Home (dark).
- `Current App.html` — recreation of the pre-redesign app, for before/after reference only.
- `assets/` — app icon, routine card images, EdoSZ brand font (all already exist in the codebase).

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final. Recreate pixel-perfectly with the codebase's existing component system. All values below are exact.

## Design Tokens

### Fonts
- **Anton** (Google Fonts, single weight 400) — NEW dependency, load via `expo-font` / `@expo-google-fonts/anton`. Used for: screen titles, section headers, card titles, ALL large numerals. Always `textTransform: uppercase`, letter-spacing 0–0.02em, line-height 0.95–1.05.
- **EdoSZ** — already in repo (`font/edo_sz/edosz.ttf`). Brand wordmark "Hokage Coaching" only. Never uppercase it (the font is already stylized).
- **Inter** (or system font stack already used) — body copy, labels, buttons.
- Label style (recurring): Inter 9–12px, weight 700–800, `letter-spacing: 0.08–0.18em`, uppercase.

### Colors — dark scheme (primary)
| Token | Value | Use |
|---|---|---|
| bg | `#0f172a` (slate-900) | screen background, tab bar |
| surface | `#1e293b` (slate-800) | cards |
| border | `#334155` (slate-700) | card borders, dividers, chart grid, progress tracks |
| text-primary | `#f8fafc` | headings, numerals |
| text-secondary | `#94a3b8` | body, labels |
| text-muted | `#64748b` | captions, inactive tabs, units |
| accent | `#ef4444` (red-400) | ALL brand/action: buttons, active segments, rings, ticks, wordmark |
| accent-dim | `rgba(239,68,68,0.08–0.14)` | selected-state fills, chips |
| ai-gold | `#fbbf24` / `rgba(251,191,36,0.14–0.16)` fill / `rgba(251,191,36,0.35)` border | AI features ONLY |
| info-blue | `#3b82f6` | protein, burned kcal, weight chart (legacy blue data color) |
| success | `#22c55e` | remaining kcal, positive trends |
| carbs-amber | `#f59e0b` | carbs macro |
| fat-rose | `#fb7185` | fat macro |
| header gradient | `linear-gradient(180deg,#1e293b 0%,#0f172a 100%)` | page header panel |
| skew ghost | `rgba(220,38,38,0.08)` | decorative skewed rectangle in headers |

### Colors — light scheme mapping
| Dark | Light |
|---|---|
| bg `#0f172a` | `#f8fafc` |
| surface `#1e293b` | `#ffffff` + shadow `0 1px 2px rgba(15,23,42,0.04)` |
| border `#334155` | `#e2e8f0` |
| text-primary `#f8fafc` | `#0f172a` |
| text-secondary `#94a3b8` | `#64748b` |
| text-muted `#64748b` | `#94a3b8` |
| accent `#ef4444` | `#dc2626` (red-600) |
| ai-gold `#fbbf24` | `#a16207` (yellow-700), fills `rgba(161,98,7,0.07–0.12)` |
| info-blue `#3b82f6` | `#2563eb` |
| success `#22c55e` | `#16a34a` |
| header gradient | `#ffffff → #f8fafc` + 1px bottom border `#e2e8f0` |
| skew ghost | `rgba(220,38,38,0.05)` |

### Spacing & shape
- Screen horizontal padding: **20px**. Vertical gap between cards: **12px**; between sections: **24–28px**.
- Card radius **20px** (large), **16px** (rows/list items), **12–14px** (small tiles, icon boxes). Chips/badges/skewed elements: **radius 0** (sharp).
- Card border: 1px solid border token. Signature top-accent: 3px bar across card top, red for X% of width, rest border color (used on stat/summary cards; the red portion ≈ progress).
- **Skew language**: primary buttons, active segmented-control segments, badges, week-day markers, bar-chart bars, FAB — `transform: skewX(-10deg)` (buttons/segments/badges), `-8deg` (FAB, day markers), `-6deg` (chart bars). Inner content counter-skewed (`skewX(+10deg)` etc.) so text/icons stay upright.
- Red dash motif: 22×3px red rectangle preceding the date/subtitle label under every screen title.

### Type scale (key sizes)
- Screen title (Anton): 32px
- Section header (Anton): 22px; card title (Anton): 16–17px
- Hero numeral (Anton): 26–34px; stat numeral (Anton): 18–20px
- Body: Inter 12–14px; captions 10–11px; labels 9–12px caps (spacing 0.08–0.18em)
- Tab labels: 9px, weight 700, caps, spacing 0.08em

## Shared Components

### Page header panel
Vertical gradient panel (tokens above), padding `top safe-area + ~16px` / 20px sides / 16–20px bottom. Contains, in order:
1. Optional brand row: EdoSZ wordmark 20–22px in accent red (left) + 44px icon button(s) (right, radius 12, surface bg, 1px border).
2. Anton screen title 32px, text-primary.
3. Red dash (22×3) + caps label 12px/700/0.18em text-secondary (date or context line).
4. Optionally the screen's primary control (segmented control, day nav, summary card) inside the panel bottom.
Decor: absolutely-positioned skewed rectangle (`skewX(-18deg)`, ~220×240–300px, skew-ghost color) off the top-right corner, clipped by the panel.

### Primary button ("skew button")
Red block, `skewX(-10deg)`, no radius, padding 14px 20px; label counter-skewed: caps 14px/800/0.1em white, optional leading icon. Compact variant: padding 11px 14px, label 11px. Disabled: opacity 0.45. Press feedback: existing `PressableScale`.

### Segmented control
Track: bg token, 1px border, radius 10–12, padding 3–4px. Active segment: red skew block (counter-skewed label, white caps 10–11px/800). Inactive: transparent, muted caps label. Count badges: small rect (no radius), `#1e293b`/`rgba(0,0,0,0.25)` bg.

### Tab bar
Bg = screen bg, 1px top border. 5 items: icon 23px + caps label 9px + **3px×20px red tick above the active item's icon** (the tick replaces color-only signaling; inactive tick transparent). Active color accent red; inactive text-muted. Filled Ionicons: home, barbell, restaurant, bar-chart, person.

### FAB
56×56 red square, `skewX(-8deg)`, icon counter-skewed 28px white `add`; shadow `0 12px 24px -8px rgba(239,68,68,0.6)`. Position: right 20, above tab bar.

### AI card (gold family — AI only)
Surface card, radius 20, **border `rgba(251,191,36,0.35)`**, decorative 90px gold-tinted circle off top-right. 44px radius-12 gold-tinted icon box with `sparkles` gold icon; Anton title 16–17px; 12px secondary caption; red skew button ("Generate with AI" full-width, or compact "Generate" trailing).

### Chips/badges
Sharp rectangles (radius 0), tinted bg + colored caps text 10px/800: AI chip (gold, sparkles-outline icon), schedule chip (red tint, e.g. "EVERY MONDAY"), streak chip (gold, flame icon), trend chip (green tint, trending-up/down icon).

### Stat ring
SVG ring, stroke 10, track = border token, progress = accent red, round cap, from 12 o'clock. Center: Anton numeral + caps label 8.5–9px.

## Screens

### 1. Home (ref: 2a dark / 3e light)
Order: header (brand row + "HEY, ALEX." + red dash + date) → **Fuel summary card**: top-accent bar (red % = consumed/goal); left 118px ring (progress = consumed/goal, center = consumed numeral 28px + "CONSUMED"); right column 3 rows separated by 1px dividers — GOAL 2,200 (primary), BURNED 320 (info-blue), LEFT 1,050 (success), each caps-label left + Anton 20px right → **YOUR ROUTINES** section (Anton 22 + red caps "SEE ALL"): full-width image card h216 r20, image + gradient `rgba(15,23,42,0) 20% → rgba(15,23,42,0.92)`, red skew badge "READY TO START", Anton 30px white title, 13px `#cbd5e1` subtitle, 44px play button top-right (dark: `rgba(15,23,42,0.55)` bg + `rgba(248,250,252,0.25)` border, white icon; light: `rgba(255,255,255,0.92)` bg, red icon); carousel: horizontal pager, page dots = 18×4 red bar (active) + 4×4 squares → **AI card** (full-width button variant) → **TODAY'S FUEL** section: meal rows (r16, 1px border): meal icon (cafe-outline/restaurant-outline) red 20px, name 14/700 + "N items" 11px muted, right Anton 20px kcal + 10px "kcal" → recent activity row: same pattern, checkmark-circle success. Tab: Home active.
Copy: subtitle under greeting (light shows "Push day. Let's earn dinner." energy line as optional flavor — keep i18n).

### 2. Routines (ref: 3a)
Header panel: brand row → "ROUTINES" → red dash + "5 PLANS ON DECK" → segmented control (Coach plans · 2 / My Routines · 3), active = red skew.
List (12px gaps): **AI card** (compact trailing "GENERATE" button) → **routine cards**: surface r20, horizontal; left 96px image column, full-bleed, with fade-to-surface gradient `linear-gradient(90deg, transparent 55%, surface 100%)`; content: Anton 17px title, 12px secondary subtitle, chip row (AI gold chip + red schedule chip); trash-outline 17px text-muted top-right (8px padding hit area — keep ≥44px effective target). Images via existing `routine-image.ts` mapping. FAB. Tab: Routines active.

### 3. Meals — diary (ref: 3b)
Header panel: day nav — 44px chevron buttons (next-day disabled = opacity 0.35) flanking center Anton 24px "TODAY" + caps 10px date → **Day total card** inside panel: top-accent (red % = consumed/goal), "DAY TOTAL" label, `Anton 32px 1,470` + `Anton 17px muted "/ 2,200 kcal"`, right "730 LEFT" 12px/800 success; 8px progress bar (sharp, track border-token, fill red, width %); divider; 3-column macro row (1px separators): Anton 19px value + caps 9px label — Protein info-blue, Carbs amber, Fat rose.
Body: per meal (breakfast/lunch/dinner/snack): header row `Anton 18px MEAL NAME` + 11px/700 muted kcal → food rows (r16): name 14/700, serving 11px muted, macro line `P 12g / C 58g / F 9g` (11px/700 in macro colors); right Anton 20px kcal + caps 9px "KCAL"; trash-outline 16px muted → add slot: dashed 2px border-token r16 — compact: red `add` icon + caps 11px/800 red "ADD FOOD"; empty meal: taller (18px pad), red skew button "LOG DINNER" + 11px muted "Nothing logged yet". Tab: Meals active. (FAB optional — add slots cover the action.)

### 4. Progress (ref: 3c)
Header panel: "PROGRESS" + red dash + "WEEK 29 · 2026"; right-aligned Week/Month segmented (compact, active red skew).
**This-week hero card**: top-accent (red % = sessions done/planned); 104px ring 3/4 center Anton 26 + "SESSIONS"; right: Anton 17 "THIS WEEK", 12px secondary copy, gold streak chip (flame, "STREAK · 5 WEEKS"); week row M–S: 30×30 skewed (-8deg) markers — done = red fill + white check (counter-skewed), today = 2px red border, planned = 1px dashed muted, rest = 1px border-token; footer 3-col stats (1px separators): Anton 18px + caps 9px muted — 4H 05M TRAINED / 1,240 KCAL BURNED / 12,400 KG VOLUME.
**Body weight card**: Anton 17 "BODY WEIGHT" + green trend chip "−0.8 KG / 30D"; Anton 34 `72.4` + "kg"; caption `BMI 22.9 · Goal: lose weight` 10px muted; line chart — grid 1px border-token, line **red 2.5px**, area `rgba(239,68,68,0.12)`, end dot r4.5 red with bg-color 2px stroke; x-labels caps 9px; divider; centered red action `+ LOG WEIGHT` (caps 11/800).
**Strength & volume card**: Anton 17 title + "8 WEEKS" caps; Anton 26 `12,400` + "kg this week" + green "+8%" chip; bar chart h70, 8 bars flex gap 7, `skewX(-6deg)`, history = border-token, current week = red; footnote caps 9px muted "ESTIMATED FROM YOUR PLAN". Tab: Progress active.

### 5. Profile (ref: 3d)
Header panel: "PROFILE" + red dash + "YOUR DATA & TRAINING PREFS".
**Personal data card**: Anton 17 title; 3 tiles (bg = screen bg, 1px border, r14): caps 9px label / Anton 24 value / 10px unit — the "edited/highlight" tile may use red border + red label (shown on Weight); Sex segmented (Male active red skew / Female).
**Daily activity card**: 3 radio rows (r14): default = screen-bg fill + border-token; selected = red border + `rgba(239,68,68,0.08)` fill; radio 16px circle, selected = red ring + 7px red dot; title 13/700, caption 11px muted. Profession: 2 buttons (r12, icon 16 + caps 11/800): selected = red border/tint/red text (desktop-outline "DESK"), default (barbell-outline "PHYSICAL").
**Nutrition goal card**: Anton 17 title + 11px muted caption; recommended banner: r16, red 40%-alpha border + red 8%-tint bg, `flash` red 20px, caps 9px red "RECOMMENDED", Anton 22 "2,200 KCAL", trailing compact red skew "USE IT".
Sticky footer above tab bar (1px top border, screen-bg): full-width red skew "SAVE CHANGES" (disabled opacity 0.45 until dirty). Tab: Profile active.

## Interactions & Behavior
- All existing behavior is unchanged: navigation targets, haptics (`expo-haptics` on press), swipe-to-delete/trash actions, carousel paging (inactive slide: scale 0.9 / opacity 0.6), segmented switching, disabled states.
- Press feedback: existing `PressableScale` (scale ~0.97).
- Segmented/tab transitions: 150–200ms ease-out on the red block position; ring/bar/progress animate on mount 400–600ms ease-out.
- Hit targets ≥44px (trash icons: expand pressable padding).
- Empty states: dashed-border slots with red action, as specced in Meals.
- Theme: respect existing light/dark store (`useThemeScheme`); apply the mapping table — structure identical in both schemes.

## State Management
No new state. Reuse existing stores/queries: nutrition day totals + goal, routines list (coach/mine), diary entries per meal, weekly sessions/streak, weight history, profile form (dirty → enable Save). Only presentational changes.

## Assets
- `assets/icon.png` — app icon (from `zenfit/assets/images/app-icon/icon.png`)
- `assets/strength_card.jpg`, `assets/cardio_card.jpg` — routine imagery (from `zenfit/assets/images/routines/`; full set + mapping already in repo, `src/utils/routine-image.ts`)
- `assets/edosz.ttf` — EdoSZ wordmark font (already in repo, `zenfit/font/edo_sz/`)
- Anton font — add from Google Fonts (`@expo-google-fonts/anton`)
- Icons — Ionicons (already in repo)

## Screenshots
`screenshots/` — PNG of each approved screen: `2a-home-dark`, `3a-routines-dark`, `3b-meals-dark`, `3c-progress-dark`, `3d-profile-dark`, `3e-home-light`.

## Files
- `Redesign Directions.html` — approved design. Turn-3 section: `#3a` Routines, `#3b` Meals, `#3c` Progress, `#3d` Profile (dark), `#3e` Home light. Turn-2 `#2a`: approved Home dark. (`#2b`/`#2c` = rejected explorations; ignore.)
- `Current App.html` — baseline recreation of the current app (before), for comparison.
- `assets/` — fonts + imagery listed above.
