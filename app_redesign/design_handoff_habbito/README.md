# Handoff: Habbito — Full Rebrand & Redesign

## Overview
Complete visual + UX redesign of the Zyron app (Expo + React Native + NativeWind/Tailwind). **Same features, navigation, hooks, data model and i18n** — only the design language and information hierarchy change. New brand: **Habbito**.

Direction: **calm, premium, kinetic**. Warm-neutral canvas, a single electric-lime energy accent, near-black ink, big soft-rounded surfaces, a floating dock nav, and gradient/mini-bar data viz. It is a deliberate, total break from "Dojo Poster" (dark slate + red + condensed Anton + skewed sharp shapes + brush wordmark). **No skew anywhere. No red. No all-caps poster type. No top-accent bars or red-dash motif.**

Covers all screens: Auth (login), Onboarding, Home, Routines (list + detail + **active workout**), Meals (diary + **add/photo-log**), Progress (+ history), Profile, Settings — light + dark.

## About the Design Files
The reference is an **HTML prototype**, not production code to copy:
- `prototype/Habbito.dc.html` — the full interactive prototype (all screens, both themes, working nav, 3 "Feel" tweaks). Open it in a browser, click through, flip the theme (moon/sun) to read every value in context. (It's a self-contained HTML file; `support.js` sits beside it.)

## Package contents
- `README.md` — this spec (self-sufficient; implement from this alone).
- `APPLY.md` — step-by-step migration guide for the Expo/RN codebase.
- `starters/colors.ts` — drop-in palette on your existing token keys.
- `starters/global.css.tokens.css` — `--hb-*` values (light + dark) + gluestack triplets + font swap.
- `starters/floating-tab-bar.tsx` — the floating lime-dot dock for expo-router.
- `prototype/Habbito.dc.html` (+ `support.js`) — the interactive reference.

The task is to **recreate this in the existing Expo/RN codebase** using its established patterns: NativeWind classes, `src/theme/colors.ts` tokens + `src/global.css`, existing components (`Card`, `Button`, `SegmentedControl`, `Chip`, `Fab`, `SectionHeader`, progress `Ring`, `Screen`, `Input`…), existing hooks/queries and i18n keys. Only presentational changes. New deps: two Google fonts + a rounded icon set.

## Migration order (do it in this sequence — each step reskins most of the app)
1. **Tokens** — rewrite `src/theme/colors.ts` (both palettes) + the `:root` / dark `@media` blocks in `src/global.css` with the values below. ~70% of the app reskins from this alone.
2. **Fonts** — add `@expo-google-fonts/schibsted-grotesk` + `@expo-google-fonts/hanken-grotesk`; load in the root font loader; point `--font-display` / `--font-sans` at them. Remove the EdoSZ wordmark + Anton.
3. **Shape reset** — in shared components bump radii (see scale), **delete every `transform: skewX(...)` and its counter-skew**, remove the 3px top-accent bar + 22×3 red-dash motif, soften shadows.
4. **Icons** — replace `@expo/vector-icons` (Ionicons, filled) with **`lucide-react-native`** (rounded, 1.75 stroke).
5. **Bottom nav** — rebuild `app/(tabs)/_layout.tsx` as a floating pill dock with a lime active-dot (custom `tabBar`).
6. **Screens** — port screen-by-screen (mapping table at the end). Hooks/logic untouched.

## Design Tokens

### Fonts
- **Schibsted Grotesk** (400–800) — NEW. Screen titles, card titles, ALL numerals. Mixed case, letter-spacing −0.01 to −0.03em on big sizes. → `--font-display`.
- **Hanken Grotesk** (400–700) — NEW. Body, labels, buttons. → `--font-sans` / `--font-body`.
- Remove **Anton** and **EdoSZ** entirely.
- Caps labels (used sparingly, never for headlines): Hanken 10–11px / 700 / letter-spacing 0.12–0.16em / uppercase.

### Colors — light (default)
| Token | Value | Use |
|---|---|---|
| backdrop | `#E6E3DA` | web gutter behind the app column |
| bg | `#F3F1EA` | screen background (warm paper) |
| surface | `#FFFFFF` | cards |
| sunken | `#EDEAE1` | insets, tracks, tiles |
| sunken2 | `#F6F4EE` | subtle tiles / thumbs |
| ink | `#1A1915` | primary text, numerals, dark feature cards |
| ink2 | `#5F5D54` | secondary text |
| ink3 | `#9C998E` | muted text, captions, inactive icons |
| line | `#E7E3D8` | hairline borders/dividers |
| line2 | `#D9D4C7` | stronger borders, dashed |
| lime | `#C4ED4B` | **accent fill** — CTAs, ring/bar progress, active states, chips, FAB |
| lime-ink | `#1A1915` | text/icon ON lime |
| lime-deep | `#5E7A0C` | lime-COLORED text/icon on light surfaces (lime is illegible as text on white) |
| lime-soft | `#EAF6C6` | selected-state tint, soft chips |
| blue | `#4E6BF0` | protein / weight-line data |
| amber | `#E39A2E` | carbs |
| rose | `#EC6A88` | fat |
| violet | `#8E7BF0` | **AI features** (replaces the old gold) |
| violet-soft | `#EEEAFB` | AI card bg |
| success | `#2E9F66` · warn `#D6971F` · error `#E1553C` | states (error is a warm coral, NOT #ef4444) |
| hero-from / hero-to | `#242019` → `#131109` | dark "feature" cards (energy card, workout, membership) |
| on-hero / on-hero-dim | `#F3F1EA` / `rgba(243,241,234,.58)` | text on hero cards |
| hero-track | `rgba(243,241,234,.10)` | tracks/dividers on hero cards |
| shadow | `0 6px 22px rgba(26,25,21,.07), 0 1px 3px rgba(26,25,21,.05)` | card shadow |
| shadow-lg | `0 20px 46px rgba(26,25,21,.16)` | dock, modals |

### Colors — dark
| Token | Value |
|---|---|
| backdrop `#0B0A07` · bg `#151410` · surface `#201E18` · sunken `#2A281F` · sunken2 `#26241D` |
| ink `#F3F1EA` · ink2 `#B3B0A4` · ink3 `#7C796D` · line `#302D24` · line2 `#3B382E` |
| lime `#CBF556` · lime-ink `#161510` · lime-deep `#CBF556` (bright accent reads as-is on dark) · lime-soft `#2C3312` |
| blue `#7A93FF` · amber `#EEAA4A` · rose `#F284A0` · violet `#A594FF` · violet-soft `#2A2540` |
| success `#37C07E` · warn `#E7AE3F` · error `#F26B52` |
| hero-from `#22201A` → hero-to `#0C0B07` · shadows deeper (see prototype) |

Canvas is **warm charcoal**, never slate. Accent semantics identical across themes.

### Spacing & shape
- Screen horizontal padding **20px**. Card gap **10–14px**; section gap **24–28px**.
- **Radius scale:** cards **24–30**, list items / inputs **16–18**, tiles / thumbs / icon boxes **12–14**, chips / pills / dock / FAB **999 (full)**. Nothing sharp. **No `border-radius: 0`.**
- Card = surface bg + `1px solid line` + soft shadow. **No top-accent bar.**
- **No skew.** Where Dojo Poster skewed (buttons, segments, badges, FAB, chart bars, day markers), Habbito uses rounded/pill shapes.

### Type scale
- Screen title (Schibsted 700): 26–29px, tracking −0.02em
- Hero numeral (Schibsted 800): 33–52px, tracking −0.03em
- Card title (Schibsted 700): 16–19px
- Stat numeral (Schibsted 700–800): 18–24px
- Body (Hanken 400–600): 13–15px · captions 11–12px · caps labels 10–11px/700/0.12–0.16em

## Shared Components (reskin specs)

**Primary button** — lime fill, `lime-ink` label, radius 16–18, height 54–56, Schibsted 700 16px, optional leading/trailing lucide icon; subtle lime glow (`0 8–14px …-8px lime`). Disabled: opacity .45.

**Secondary button** — surface bg, `1px line2`, ink label, radius 16–18.

**Card** — surface, `1px line`, radius 24–28, `shadow`. **Feature card** = `hero-from→hero-to` gradient, `on-hero` text, used for the energy card, active workout, membership.

**Segmented / filter** — pill row: active = ink fill + bg-colored label (or lime for on-state), inactive = surface + `1px line` + ink2. Radius 999.

**Chip / tag** — rounded pill, `sunken`/tinted bg + ink2 (or `lime-soft` + `lime-deep` when selected). AI chip = `violet-soft` + violet. **No sharp badges.**

**FAB** — lime rounded pill (icon + short label, e.g. "New", "Log food"), radius 999, lime glow. **Not a square, not skewed.**

**Bottom dock** — floating rounded bar (`left/right:16, bottom:14, radius 26`, surface, `shadow-lg`), 5 items **Home · Train · Fuel · Progress · You**; active = ink icon/label **+ a 5px lime dot above the icon**; inactive = ink3. Lucide icons: home, dumbbell, utensils, bar-chart, user.

**Progress viz** — (1) **multi-ring** (gradient strokes lime/blue/rose) on dark cards; (2) **capsule bars** (rounded track `sunken`/`hero-track` + colored fill, animate width via scaleX from left); (3) **mini-bars** for macros. Line chart: 2.5px lime-deep stroke + lime area gradient + end dot. Bar chart: rounded bars, history = sunken, current = lime.

**AI (violet family)** — surface/`violet-soft` card, violet sparkle icon, violet accents. Replaces every gold/`brandAccent` usage.

**Icons** — lucide-react-native, stroke 1.75, round caps/joins, `currentColor`. (Filled only for `play`.)

## Screens (ref: `Habbito.dc.html`)

1. **Login** — ring-mark + lowercase `habbito` wordmark; headline "Build the body, one habit at a time."; email + password inputs (lucide mail/lock/eye, radius 18); lime "Log in"; "or"; secondary "Create an account" → Onboarding.
2. **Onboarding** — 5 steps (About you → Body → Lifestyle → Goal → Training plan), one decision per screen; lime capsule progress bar; back + Skip; radio cards (selected = `lime` border + `lime-soft` fill + filled radio) and pill chips; footer "Continue" → "Start training". Same fields/validation as today.
3. **Home** — greeting; **energy-budget card** (feature card): "Energy left today" + "On track" pill, 52px remaining kcal, "eaten · burned · goal" line, lime capsule bar, Protein/Carbs/Fat mini-bars; two KPI tiles (streak, workouts this week); "Up next" featured routine card → detail; "Today's fuel" meal rows → Meals; always-present "Add dinner" (camera) → Meal-add.
4. **Routines (Train)** — title + count; filter pills (All/Strength/Cardio); **violet** AI-generate card; routine cards (thumb, title, focus, day chip + meta) → detail; lime "New" FAB.
5. **Routine detail** — gradient image hero (back/edit, lime "MONDAY · PUSH DAY" badge, title, meta); numbered exercise rows (num tile, name, `4 × 8 · 60 kg`, rest); sticky lime "Start workout" → Active workout.
6. **Active workout** (signature, immersive) — full hero-gradient screen; close + name + timer; lime progress bar + `2 / 6`; exercise demo tile w/ lime play; big name + target; **set pips** (done=lime, current=on-hero, todo=hero-track) + "Set N of M"; prev / **Complete set** (lime) / next; "Finish workout".
7. **Meals (Fuel)** — day nav (‹ Today ›); summary card (calorie ring + P/C/F capsule bars); meal cards (Breakfast/Lunch/Dinner/Snacks) with food rows + dashed "Add food" (camera); lime "Log food" FAB → Meal-add.
8. **Meal-add** (signature photo logging) — "Add to Lunch" header; **dark "Scan your meal"** card (lime camera, AI reads macros); search field; Recent/Frequent/My-meals pills; food result rows w/ lime `+`; sticky "Add to diary · N item · kcal".
9. **Progress** — Week/Month segmented; **This-week feature card** (sessions ring, streak chip, M–S markers [done=lime check, today=lime ring, planned=dashed], trained/burned/volume); Body-weight card (lime line chart, trend chip, Log weight); Strength card (lime bar chart, +8%); "Workout history" row → History.
10. **History** — stat tiles (sessions / trained / lifted); logs grouped This week / Last week (icon, name, when, volume).
11. **Profile (You)** — avatar + name/email + settings entry; 3 stat tiles (age/height/weight); dark goal card (lime target, "Lose weight · 2,200 kcal"); preference rows (activity/days/session); settings rows (appearance toggle / units / language); "Log out".
12. **Settings** — Preferences (appearance toggle, units, language, notifications switch); **Habbito Pro** feature card + Upgrade; Account (email, change password → existing flow); Log out.
13. **Loading/empty** — branded splash (spinning ring-mark + wordmark) on sign-in; dashed "Add …" affordances as empty states.

## Interactions & behavior
Unchanged: nav targets, haptics (`expo-haptics`), swipe/trash deletes, day nav, segmented switching, disabled states, offline/refetch-on-focus, dirty→enable Save. Motion: screen enter fade/slide ~300ms; rings draw 1–1.1s ease; bars grow (scaleX/scaleY) 0.6–1s; press scale ~0.97. Hit targets ≥44px. Respect the existing light/dark store — apply both palettes above.

## State
No new state. Reuse all existing stores/queries/hooks. Presentational only.

## Optional: theming controls (from the prototype)
The prototype exposes 3 "Feel" tokens you may wire to settings/remote-config if desired — all pure token overrides:
- **Accent energy** — lime / coral / violet / azure (override the `--lime*` family).
- **Surface mood** — warm paper / cool mist / mono (override neutral + hero tokens).
- **Depth** — soft / flat / bold (override `--shadow` / `--shadow-lg`).
Not required for parity; ship defaults (lime / warm paper / soft).

## Assets
- Fonts: Schibsted Grotesk + Hanken Grotesk (Google). Icons: lucide-react-native.
- Routine/exercise/meal imagery: styled placeholders in the prototype — swap in real photos.
- Remove: Anton, EdoSZ wordmark, red/skew/dash motifs, gold AI accent.
