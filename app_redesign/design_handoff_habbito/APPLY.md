# APPLY — porting Habbito into your Expo/RN app

Concrete steps to get the redesign into `zenfit/` (Hokage → Habbito). Reference the live prototype `../Habbito.dc.html` and the spec `README.md`. Order matters — each step reskins a large chunk.

Starter files in `starters/` are ready to paste. All business logic, hooks, queries, i18n and data stay untouched.

---

## 1. Tokens (reskins ~70% instantly)
- Replace `src/theme/colors.ts` with **`starters/colors.ts`**.
- Paste the values from **`starters/global.css.tokens.css`** over the matching `--hb-*` declarations in `src/global.css` (both the `:root` light block and the dark `@media` block). Leave the `@theme inline` var() chains as-is.
- Mirror the gluestack RGB triplets in `components/ui/gluestack-ui-provider/config.ts` (same `--primary`, `--card`, `--background`… values).

**Two systemic component notes** (the tokens can't do these alone):
1. **Lime needs ink text.** `brandPrimary` is now a bright-lime *fill*. In your `Button` (primary variant), `Fab`, and any `bg-brand-primary` element, set the label/icon color to `brand-light` (ink) instead of white. gluestack `--primary-foreground` is already ink.
2. **Lime is illegible as text on light.** Search for `text-brand-primary` (and Ionicons `color={colors.brandPrimary}` used as a foreground on light surfaces) and switch to `text-brand-primary-dark` / `colors.brandPrimaryDark` (= lime-deep). On dark, both are the same bright lime, so this only matters in light mode.

## 2. Fonts
```bash
npx expo install @expo-google-fonts/schibsted-grotesk @expo-google-fonts/hanken-grotesk
```
- Load the faces where you currently load Inter/Anton (root `useFonts`): `HankenGrotesk_400Regular/500Medium/600SemiBold/700Bold/800ExtraBold` and `SchibstedGrotesk_600SemiBold/700Bold/800ExtraBold`.
- In `src/global.css`: set `--font-sans: HankenGrotesk_400Regular` and `--font-display: SchibstedGrotesk_700Bold` in all three font blocks (`:root`, `@media android`, `@media ios`); update the `.font-normal…font-extrabold` weight→face map to Hanken faces.
- Replace `.font-anton` (titles/numerals) with `.font-display` (Schibsted); **delete** the EdoSZ brush `.font-display` and the "The Hokage Coaching" wordmark → lowercase `habbito` in Schibsted 800.

## 3. Shape reset (shared components)
In `Card`, `Button`, `SegmentedControl`, `Chip`, `Fab`, `SectionHeader`, headers:
- **Delete every `transform: [{ skewX }]`** and its counter-skew. This is the biggest visual change.
- Bump radii → cards 24-28, rows/inputs 16-18, tiles 12-14, buttons/chips/FAB **full (999)**.
- Remove the **3px red top-accent bar** and the **22×3 red dash** motif wherever they appear (Card `topAccent`, `DashLabel`, `HeaderPanel` skew rectangle).
- Soften shadows to the `shadow`/`shadow-lg` values in the spec; make `HeaderPanel` a flat surface→bg (no skew ghost).

## 4. Icons
```bash
npx expo install lucide-react-native react-native-svg   # svg already present
```
Swap `@expo/vector-icons` Ionicons → `lucide-react-native` (rounded, `strokeWidth={1.9}`). Rough map: `home→Home`, `barbell→Dumbbell`, `restaurant→Utensils`, `bar-chart→BarChart3`, `person→User`, `add→Plus`, `chevron-forward→ChevronRight`, `flame→Flame`, `camera→Camera`, `checkmark→Check`, `sparkles→Sparkles`.

## 5. Bottom nav
Drop **`starters/floating-tab-bar.tsx`** into `src/components/`, then in `app/(tabs)/_layout.tsx` pass `tabBar={(props) => <FloatingTabBar {...props} />}` and delete the old `TabIcon` (red-tick). Add ~96px bottom padding to scroll content so it clears the dock.

## 6. Screens
Port screen-by-screen from the `README.md` mapping + the prototype. Priority order: Home → Routines/detail → **Active workout** (new: `app/(tabs)/routines/[id]` gains a focused in-set mode) → Meals/add → Progress/history → Profile/Settings → Auth/Onboarding. AI cards: recolor gold → `brandAccent` (violet).

---

## Fastest route
Do **steps 1-2** first and run the app — you'll immediately see Habbito colors + type across every screen (still with old shapes). Then 3-5 for the feel, then 6 to match the prototype exactly.

Want me to prep a **Claude Code handoff package** (option c) so an agent runs steps 3-6 against the repo directly? Say the word.

## Screen map (project ↔ repo)
| Screen | Repo file |
|---|---|
| Home | `app/(tabs)/index.tsx` |
| Routines | `app/(tabs)/routines/index.tsx` |
| Routine detail / Active workout | `app/(tabs)/routines/[id].tsx` |
| Meals diary | `app/(tabs)/meals/index.tsx` |
| Meal add | `app/(tabs)/meals/create.tsx` |
| Progress + history | `app/(tabs)/progress/index.tsx`, `history.tsx` |
| Profile | `app/(tabs)/profile.tsx` |
| Settings | `app/(tabs)/settings.tsx` |
| Login / Onboarding | `app/(auth)/login.tsx`, `app/(onboarding)/index.tsx` |
| Tokens | `src/theme/colors.ts`, `src/global.css` |
| Tab bar | `app/(tabs)/_layout.tsx` |
