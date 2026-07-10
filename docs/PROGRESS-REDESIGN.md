# Progress Screen Redesign — Implementation Spec

Rebuild `app/(tabs)/progress/index.tsx` to match the approved mockup (`Progreso — Rediseño.dc.html`) exactly.
Stack: Expo + expo-router + NativeWind + Supabase + react-query. Language: **Spanish**. Theme: **dark only**.

> ⚠️ Table/column names below are based on a review of the repo (`supabase-schema.sql`, migrations, hooks).
> Before applying, verify each name against the actual schema and adjust — do NOT invent columns.

---

## 0 · Scope & phases

| Phase | Needs schema change? | Delivers |
|---|---|---|
| **P0** | No | Toggle, hero compliance ring, nutrition card, muscle groups, rule-based insight banner, achievement chips, collapsed history, skeleton + empty states |
| **P1** | Yes (migration A) | Weight card with 8-week trend |
| **P2** | Yes (migration B) | Real volume, PRs, estimated 1RM |
| **P3** | Yes (migration C) | Coach IA weekly LLM summary |

Ship P0 first — it requires zero migrations. Where P1/P2 data doesn't exist yet, render that card's **empty state** (specified below), never hide the card silently.

---

## 1 · Design tokens

All values map 1:1 to Tailwind slate + the existing red primary. Use NativeWind classes where possible.

```
Screen background      #0f172a   slate-900
Card background        #1e293b   slate-800
Card border            #334155   slate-700   (1px)
Card radius            16        rounded-2xl
Card padding           16        p-4
Gap between cards      12        gap-3
Screen padding         16 horizontal
Inner track/inset bg   #0f172a   slate-900 (bars, pills-on-card)
Divider inside cards   rgba(51,65,85,0.6)  ≈ slate-700/60

Text primary           #f8fafc   slate-50
Text body              #cbd5e1   slate-300
Text secondary         #94a3b8   slate-400
Text muted             #64748b   slate-500

Brand red (action/today/active)  #ef4444   red-500
Data series (charts)             #3b82f6   blue-500
Positive / on-target             #22c55e   green-500
Warning / AI accent              #f59e0b amber-500 · #fbbf24 amber-400
Macro fat                        #fb7185   rose-400

Tinted backgrounds (15% alpha):
  green pill  rgba(34,197,94,0.15)
  amber pill  rgba(245,158,11,0.15)
  gold tile   rgba(251,191,36,0.16)
  blue area   rgba(59,130,246,0.12)
```

**Color discipline (hard rule):** red = brand/action/today only · blue = data series · green = positive/on-target · amber = warnings + AI · never decorative. This fixes the current bug where the duration pill mixes a green background with blue text.

Numerals: use `fontVariant: ['tabular-nums']` on all metric values.

---

## 2 · File changes

```
NEW  src/utils/progress.ts                    pure calculation functions (unit-test these)
NEW  src/hooks/use-progress-dashboard.ts      react-query aggregation hook
NEW  src/components/progress/
       hero-card.tsx          compliance ring + day dots/week pills + stat trio
       weight-card.tsx        (P1)
       strength-card.tsx      volume bars + PR list
       nutrition-card.tsx     kcal bars vs goal + trio + macro bar
       muscles-card.tsx       horizontal bars + imbalance banner
       insight-card.tsx       rule-based (P0) / LLM (P3)
       achievement-chips.tsx
       history-section.tsx    collapsible; reuses existing log card + delete
       skeleton-card.tsx
       period-toggle.tsx      Semana | Mes
       ring.tsx  bar-chart.tsx  line-chart.tsx   (SVG primitives)
EDIT app/(tabs)/progress/index.tsx            recompose as list of the above
KEEP src/hooks/use-progress.ts                still powers history list + delete + log form
KEEP FAB + inline log form                    unchanged behavior
```

Charts: `react-native-svg` (add if not already a dependency — expo install react-native-svg). Vertical/horizontal bars may be plain `View`s; the ring and the weight line require SVG. **No chart library.**

State: one `periodo: 'semana' | 'mes'` at screen level, passed to every card.

---

## 3 · Calculations — `src/utils/progress.ts`

Pure, synchronous, unit-testable. Reuse `src/utils/dates.ts` helpers and `src/utils/calories.ts` (Mifflin-St Jeor BMR → TDEE → goal target; workout kcal estimate) — do not duplicate.

```ts
// Types are sketches — align with src/types/database.ts

/** Sessions done vs plan for the period.
 *  plan/week = profiles.days_per_week (fallback: available_days.length, then 3)
 *  month plan = daysPerWeek * weeks elapsed in current month (round) */
export function compliance(logs: WorkoutLog[], daysPerWeek: number, periodo: Periodo, now = new Date()): { done: number; plan: number }

/** Weekly streak: consecutive ISO weeks (ending current or last week) with done >= plan.
 *  Current week counts as alive if still achievable (remaining days >= plan - done). */
export function weeklyStreak(logs: WorkoutLog[], daysPerWeek: number, now = new Date()): number

/** Mon..Sun for the hero dots. mode: 'done' | 'today' | 'plan' | 'rest'
 *  'plan' = future day, user still needs it to hit daysPerWeek (mark earliest remaining days) */
export function weekDayDots(logs: WorkoutLog[], daysPerWeek: number, now = new Date()): DayDot[]

/** Month view: one pill per week of current month, "3/4" format */
export function monthWeekPills(logs: WorkoutLog[], daysPerWeek: number, now = new Date()): { label: string; done: number; plan: number }[]

/** ESTIMATED volume (P0): for each log, sum sets*reps*weight_kg of the routine_exercises
 *  whose exercise matches a completed-exercise entry of that log. Weight null → skip (bodyweight).
 *  NOTE: logs store completed exercise NAMES — match against routine plan by name. */
export function estimatedVolume(logs: WorkoutLogWithCompleted[], plans: RoutineExercise[]): number

/** 8 weekly volume totals, oldest→newest, for the bar chart */
export function volumeSeries8w(logs: WorkoutLogWithCompleted[], plans: RoutineExercise[], now = new Date()): number[]

/** kcal burned via existing estimator in calories.ts applied to duration_min (+ profile weight) */
export function burnedKcal(logs: WorkoutLog[], profile: Profile): number

/** Sets per body_part in window (14d week-view / 30d month-view), sorted desc.
 *  completed exercise name → exercises catalog (by id if stored, else name) → body_part.
 *  Unmatched names → bucket "Otros" (render last, never amber). */
export function muscleDistribution(logs: WorkoutLogWithCompleted[], catalog: Exercise[], plans: RoutineExercise[], windowDays: 14 | 30): { nombre: string; sets: number }[]

/** Imbalance rule: any group < 25% of max group → flag; also any group with 0 sets
 *  in >= 10 days → recency flag. Returns the single most important flag or null. */
export function muscleAlert(dist: ..., logs: ..., upcomingRoutines: Routine[]): { grupo: string; dias: number; sugerencia?: string } | null

/** Nutrition aggregates over 7 or 30 days from meal_items:
 *  perDay kcal[], avgKcal, avgProtein, adherentDays (|kcal-goal| <= 10% on days with >=1 meal),
 *  loggedDays, macroPct {prot, carb, fat} from grams*4/4/9 */
export function nutritionStats(meals: MealWithItems[], goalKcal: number, days: 7 | 30, now = new Date()): NutritionStats

/** Achievement chips (only render if value > 0):
 *  racha (weeks) · milestones 10/25/50/100 workouts · lifetime tonnage (t) · PRs this month (P2) */
export function achievements(...): Chip[]

/** Rule-based insights, deterministic, no LLM (P0). Priority order:
 *  1 muscle recency/imbalance · 2 plateau (P2) · 3 protein < 1.4g/kg avg ·
 *  4 adherence < 50% · 5 one-session-left encouragement. Return top 1. */
export function ruleInsights(...): Insight | null

/** P2 — Epley estimated 1RM */
export const e1rm = (weightKg: number, reps: number) => weightKg * (1 + reps / 30);
```

Calorie goal: `profiles.calorie_goal` if set, else compute via `calories.ts` from profile (sex, age, height, weight, activity, goal).

---

## 4 · Data hook — `src/hooks/use-progress-dashboard.ts`

```ts
export function useProgressDashboard(periodo: Periodo) {
  // react-query, key: ['progress-dashboard', userId]
  // staleTime 5 min; invalidate on workout-log / meal / weight mutations
  // Parallel fetches (Promise.all), all scoped to user:
  //   workout_logs  last 90 days  (with completed exercises)
  //   routine_exercises for the routines referenced by those logs
  //   exercises catalog (id, name, body_part) — cacheable, rarely changes
  //   meals + meal_items last 30 days
  //   profile
  //   body_measurements last 60 days     (P1 — skip if table absent)
  //   ai_insights current week           (P3 — skip if table absent)
  // Then run utils/progress.ts and return one flat view-model:
  return { isLoading, isEmpty /* no logs AND no meals ever */, hero, peso, fuerza, nutricion, musculos, insight, logros };
}
```

Keep it dumb: all math in `utils/progress.ts`. If later slow, consolidate into one `get_progress_dashboard` RPC without touching the UI (P4).

---

## 5 · Screen composition (top → bottom)

`ScrollView` (or SectionList), screen bg `#0f172a`, horizontal padding 16, `gap 12`, bottom spacer 72 (clears FAB).

Header stays: title **Progreso** (24/700) + 40px round settings button (bg `#1e293b`, border `#334155`, `settings-outline` 20 `#cbd5e1`).

### 5.1 Period toggle — `period-toggle.tsx`
Container: bg `#1e293b`, border `#334155`, radius 16, padding 4, row.
Segments flex-1, radius 12, paddingVertical 10, centered, text 14/600.
Active: bg `#ef4444`, text white. Inactive: transparent, text `#94a3b8`.
Labels: `Semana` · `Mes`. Hidden while loading and in first-run empty state.

### 5.2 Hero — compliance ring — `hero-card.tsx`
**Why:** answers "¿voy bien esta semana?" against the plan the user already declared (`days_per_week`). First because it's the most frequent question.

Card row: **ring 88×88** (left) + text column.
- Ring SVG: r=36, strokeWidth=8, track `#334155`; progress arc `strokeLinecap="round"`, rotated −90°, `strokeDasharray = C*frac, C`. Color: `#ef4444`; `#22c55e` when done ≥ plan; `#334155` at 0.
- Center: `3/4` (20/800) over `SESIONES` (9/500, uppercase, letterSpacing 0.4, `#94a3b8`).
- Title 15/700: `Esta semana` / `Este mes (julio)`.
- Sub 13 `#94a3b8` lh1.45, dynamic: `Te falta 1 sesión para cumplir tu plan — programada el sábado.` (derive day from available_days) / month: `14 de 17 sesiones del plan mensual. Mejor mes: junio (16).`
- Streak pill: amber tint bg, radius full, padding 4×10, `flame` 13 `#f59e0b` + `Racha: 5 semanas` (12/600 `#f59e0b`). Hide if streak 0.

**Week view — day dots row** (7, gap 6, labels L M X J V S D 10/600):
30px circles — done: bg `#ef4444` + white `checkmark` 14 · today: border 2 solid `#ef4444` (label `#f8fafc`) · planned-remaining: border 1.5 **dashed** `#64748b` · rest: border 1.5 solid `#334155`.

**Month view — week pills row** (gap 8): flex-1, bg `#0f172a`, border `#334155` (current week `#ef4444`), radius 12, paddingVertical 8; `Sem 1` 10/500 `#64748b` over `4/4` 13/700 (green when complete, else `#f8fafc`).

**Stat trio** under top divider, 3 equal columns split by 1px dividers:
icon 13 `#3b82f6` + value 16/700 + label 11 `#64748b`.
`time-outline` → `2 h 55 m` / `entrenados` · `flame-outline` → `1.240` / `kcal quemadas` · `barbell-outline` → `8.420` / `kg de volumen`.
Number formatting: Spanish locale (dot thousands, comma decimals).

### 5.3 Weight card (P1) — `weight-card.tsx`
**Why:** the outcome metric for the profile goal; weekly-cadence answer to "¿está funcionando?".

- Header: `Peso corporal` 15/700 + trend pill (green tint bg, `trending-down` 12 + `−1,3 kg / 30 días` 12/600). **Delta color is goal-aware:** loss green when goal=perder peso; gain green when goal=ganar músculo; else neutral gray. Delta = 7-day rolling avg now vs 30 days ago.
- Value row: `78,4` 28/800 + `kg` 14 `#94a3b8`; right caption 12 `#64748b`: `IMC 25,6 · Meta: perder peso` (BMI from height; goal label from profile).
- Line chart, height 104: 3 gridlines `rgba(51,65,85,0.5)`; series = weekly averages, 8 weeks; line `#3b82f6` w2.5 round joins; area fill `rgba(59,130,246,0.12)`; last point r4.5 fill blue, stroke `#1e293b` w2.5. X-captions 10 `#64748b`: `15 may` · `8 semanas` · `hoy` (bold-ish `#94a3b8`).
- Footer CTA under divider, centered: `add` 15 + `Registrar peso` 13/600 `#ef4444` → opens bottom-sheet quick log (numeric input, defaults to last value, upserts today's `body_measurements` row).
- **Empty state** (in-card): 48px circle (bg `#0f172a` border `#334155`) with `scale-outline` 22 `#64748b`; text 13 `#94a3b8` centered: `Registra tu peso para ver tu tendencia y tu avance hacia la meta.`; CTA row stays.

### 5.4 Strength & volume — `strength-card.tsx`
**Why:** makes progressive overload visible; PRs are the celebration moments.

- Header: `Fuerza y volumen` 15/700 + `8 semanas` 11 `#64748b`. (Card renders in both periods.)
- Value row: `8.420` 22/800 + `kg esta semana` 13 `#94a3b8` + right delta `trending-up` 12 + `+6%` 12/600 green (vs previous week; red-free — use gray if negative to avoid alarm: `#94a3b8`).
- Bars: 8 columns, gap 8, area height 72; height ∝ value; radius top 5 bottom 2; `#3b82f6`; **last bar opacity 1, others 0.5**.
- P0 note: volume is *estimated* (plan sets×reps×weight over completed exercises). Add caption `estimado según tu plan` 10 `#64748b` next to the value until P2 ships real sets; then remove.
- Divider, then `RÉCORDS PERSONALES` 12/600 uppercase `#94a3b8` (P2). Row: 32px tile radius 10 gold-tint bg + `medal-outline` 16 `#fbbf24` · name 14/600 + mark 12 `#94a3b8` (`82,5 kg × 5`, `1RM est. 96 kg`) · right: delta pill green tint (`+2,5 kg` / `Nuevo` 12/700) over `hace 2 días` 10 `#64748b`. Max 3 rows, most recent first.
- **P2 pending state** for the PR block only: single line 12 `#64748b`: `Registra tus series para desbloquear récords y 1RM estimado.`

### 5.5 Nutrition — `nutrition-card.tsx`
**Why:** kcal + protein adherence explains the weight trend; already fully computable from `meal_items`.

- Header: `Nutrición` 15/700 + `Últimos 7 días` / `Últimos 30 días` 11 `#64748b`.
- Chart, height 96: one bar per day (gap 8 week / 3 month); bar color `#3b82f6`, **amber `#f59e0b` when kcal > 110% of goal**; days with no meals → no bar (do not render zero-height as failure).
  Dashed goal line 1.5 `#94a3b8` at goal height, label `meta 2.200` 9/600 `#94a3b8` on card bg, right-aligned.
  Week view only: day letters row (S D L M X J V pattern from real dates) 10/500 `#64748b`, today `#f8fafc`.
- Stat trio (same pattern as hero): `2.146` / `kcal promedio` · `132 g` / `proteína/día` · `5/7` **green** / `días en meta` (±10%, only logged days).
- Macro bar: height 8, radius full, segments protein `#3b82f6` / carbs `#f59e0b` / fat `#fb7185` by % kcal (P×4, C×4, F×9). Legend: 8px dots radius 3 + `Proteína 26%` etc 11 `#94a3b8`.
- **Empty state:** circle icon `nutrition-outline`, text `Registra tus comidas para ver tus calorías, proteína y adherencia a la meta.`, link `Registrar comida →` 13/600 red → navigates to Comidas tab.

### 5.6 Muscle groups — `muscles-card.tsx`
**Why:** diagnosis — turns raw logs into "what am I neglecting", free of any LLM.

- Header: `Grupos musculares` 15/700 + `Últimos 14 días` / `Últimos 30 días` 11.
- Rows (gap 9): label width 66, 12/500 `#cbd5e1` · track flex-1 height 10 radius full bg `#0f172a` · fill radius full, width = sets/maxSets, `#3b82f6`, **amber when < 25% of max** · right value `24 sets` 11 `#94a3b8` width 56 right-aligned, tabular.
- Sorted desc. Body-part names mapped to Spanish: Pecho, Espalda, Hombros, Brazos, Core, Piernas (+ Otros last if unmatched names exist).
- Alert banner (from `muscleAlert`, hide if null): amber tint bg, radius 12, padding 10×12, `pulse-outline` 15 `#f59e0b`, text 12 `#fbbf24` lh1.45: `**Piernas** lleva 12 días sin estímulo — tu rutina del sábado la incluye.` (bold group name; suggestion clause only when an upcoming routine covers it).

### 5.7 Coach IA — `insight-card.tsx`
**Why:** narrative synthesis + 2 concrete actions; the Monday reason to open the app.

- Card border: `rgba(251,191,36,0.35)` (only card with a tinted border).
- Header: 28px tile radius 9 gold-tint + `sparkles` 15 `#fbbf24` · `Análisis de tu semana` 15/700 · right `IA` 10/600 `#fbbf24` letterSpacing 0.4.
- Body 13 `#cbd5e1` lh1.55, exactly 3 sentences.
- Action chips (wrap, gap 8): border `#334155` radius full padding 6×12, icon 13 (blue barbell / green nutrition) + text 12/500 `#cbd5e1`.
- **P0:** feed from `ruleInsights()` (deterministic). **P3:** replace body with cached `ai_insights.summary` + `actions`; card hidden when no cache and no rule fires. LLM receives computed aggregates as structured context and **narrates only — never invents numbers**.

### 5.8 Achievement chips — `achievement-chips.tsx`
Horizontal `ScrollView`, gap 8, no card wrapper. Chip: bg `#1e293b`, border `#334155`, radius full, padding 7×12, icon 14 + text 12/600 `#cbd5e1`, nowrap.
Set: `flame` amber `Racha de 5 semanas` · `trophy-outline` gold `50 entrenamientos` · `barbell-outline` blue `24 t levantadas` · `medal-outline` gold `3 récords en julio` (P2). Chips with value 0 don't render; row hides if all empty. No badge art, no dedicated screen, no new table.

### 5.9 History (collapsed) — `history-section.tsx`
**Why:** preserves 100% of the current screen's function (view/delete logs) without letting admin dominate.

- Card. Header row (padding 14×16, tappable): `Historial` 15/700 + count pill (`52` 11/600 `#94a3b8` on bg `#0f172a` radius full padding 2×8) + right chevron `#94a3b8` rotating 180° (`chevron-down`).
- Collapsed by default; persist open/closed in AsyncStorage.
- Expanded rows (divider-separated, padding 11×0): name 14/600 · `jue, 9 jul · 2 ejercicios` 12 `#94a3b8` · duration pill (**green tint bg + green text** — bug fix; or use blue/blue; never mixed) · `trash-outline` 16 `#ef4444` with existing confirm-delete.
- Show latest 5 + centered `Ver todo el historial` 13/600 red → pushes a plain full-list screen (reuse current FlatList as `progress/history.tsx`).
- Expanded **empty state** = current empty state verbatim (56px circle + `Sin entrenamientos registrados` + red button `Registrar un Entrenamiento`).

### 5.10 FAB + log form
Unchanged: red 56px FAB bottom-right (bottom offset clears tab bar), opens the existing inline form (routine chips → duration → notes). Keep as-is.

---

## 6 · Loading & first-run states

**Loading:** never a spinner. Skeleton mirrors real layout: toggle bar 44px + hero skeleton (88px circle + 3 text lines) + 3 card skeletons (title line, body block 96/72/96, caption line). Blocks `#1e293b`, inner shapes `#334155`, opacity pulse 0.45↔0.9, 1.6s, staggered ~100ms (Reanimated or `Animated.loop`).

**First-run (no logs AND no meals ever):** dashboard renders, not a void —
- Hero at `0/4`: title `Empieza tu plan`, sub `Tu plan es de 4 sesiones por semana. Aún no registras entrenamientos.`, link `Registrar mi primer entrenamiento →` red 13/600. No streak pill, no dots.
- Weight + nutrition cards show their in-card empty states (§5.3, §5.5).
- Strength, muscles, IA, chips: hidden. Toggle hidden. History collapsed with its empty state inside.

---

## 7 · SQL migrations (Supabase)

Follow the existing RLS-per-user pattern (`auth.uid() = user_id` policies on all three).

```sql
-- A (P1) · body measurement history — profiles.weight_kg is overwritten today
create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,2),
  body_fat_pct numeric(4,1),
  waist_cm numeric(5,1), chest_cm numeric(5,1),
  arm_cm numeric(4,1),  thigh_cm numeric(5,1),
  unique (user_id, measured_on)          -- upsert: one row/day
);
create index on body_measurements (user_id, measured_on);
alter table profiles add column target_weight_kg numeric(5,2);
-- trigger: profiles.weight_kg update → upsert today's body_measurements row (and back)
-- backfill: insert one row per user from current profiles.weight_kg

-- B (P2) · real per-set logging → real volume, PRs, e1RM
create table workout_log_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_id uuid references exercises(id),
  set_number int not null,
  reps int, weight_kg numeric(6,2), rpe numeric(3,1)
);
create index on workout_log_sets (workout_log_id);
-- trigger on insert: e1RM = weight*(1+reps/30) > historical max → flag PR

-- C (P3) · cached weekly AI insight — one LLM call/user/week
create table ai_insights (
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  summary text not null,
  actions jsonb not null default '[]',
  created_at timestamptz default now(),
  primary key (user_id, week_start)
);
-- edge function `weekly-insight`, cron Mon 06:00: aggregates → LLM → validate JSON → upsert
```

Indexes on existing tables if missing: `workout_logs (user_id, date)`, `meals (user_id, date)`.

P2 logging UX: in the log flow each completed exercise expands to set rows **prefilled from the routine plan** — confirm-all is one tap; edit only when reality differed. Logging must stay ≈2 taps.

---

## 8 · Copy — add to `src/i18n/es.ts`

```
progreso.semana = "Semana"                    progreso.mes = "Mes"
progreso.estaSemana = "Esta semana"           progreso.esteMes = "Este mes ({mes})"
progreso.sesiones = "sesiones"                progreso.racha = "Racha: {n} semanas"
progreso.faltaSesion = "Te falta 1 sesión para cumplir tu plan — programada el {dia}."
progreso.faltanSesiones = "Te faltan {n} sesiones para cumplir tu plan."
progreso.planCumplido = "Plan cumplido. {n} de {plan} sesiones — buen trabajo."
progreso.entrenados = "entrenados"            progreso.kcalQuemadas = "kcal quemadas"
progreso.kgVolumen = "kg de volumen"
progreso.pesoCorporal = "Peso corporal"       progreso.registrarPeso = "Registrar peso"
progreso.emptyPeso = "Registra tu peso para ver tu tendencia y tu avance hacia la meta."
progreso.fuerzaVolumen = "Fuerza y volumen"   progreso.kgEstaSemana = "kg esta semana"
progreso.records = "Récords personales"       progreso.nuevo = "Nuevo"
progreso.emptyRecords = "Registra tus series para desbloquear récords y 1RM estimado."
progreso.nutricion = "Nutrición"              progreso.meta = "meta {n}"
progreso.kcalPromedio = "kcal promedio"       progreso.proteinaDia = "proteína/día"
progreso.diasEnMeta = "días en meta"
progreso.emptyNutricion = "Registra tus comidas para ver tus calorías, proteína y adherencia a la meta."
progreso.registrarComida = "Registrar comida →"
progreso.gruposMusculares = "Grupos musculares"
progreso.sinEstimulo = "{grupo} lleva {n} días sin estímulo — tu rutina del {dia} la incluye."
progreso.analisisSemana = "Análisis de tu semana"
progreso.historial = "Historial"              progreso.verTodo = "Ver todo el historial"
progreso.empiezaPlan = "Empieza tu plan"
progreso.emptyHero = "Tu plan es de {n} sesiones por semana. Aún no registras entrenamientos."
progreso.primerEntreno = "Registrar mi primer entrenamiento →"
progreso.ultimos7 = "Últimos 7 días"  progreso.ultimos14 = "Últimos 14 días"
progreso.ultimos30 = "Últimos 30 días"  progreso.ochoSemanas = "8 semanas"
```

Dates/numbers: Spanish locale everywhere (`jue, 9 jul` · `8.420` · `78,4`).

---

## 9 · QA checklist

- [ ] Toggle re-scopes: hero (dots↔pills, 3/4↔14/17), nutrition (7↔30 bars, labels only in week), muscles caption (14↔30 días)
- [ ] Ring: 0% renders track only; 100% turns green; >100% clamps
- [ ] Streak survives rest days (weekly, not daily) and hides at 0
- [ ] Day dots: done/today/planned/rest all distinguishable; today ring red
- [ ] Nutrition: unlogged days show no bar and don't count against adherence; >110% bars amber; goal line matches profile target
- [ ] Muscle bars: amber only when < 25% of max; `Otros` bucket never amber
- [ ] Weight delta color follows profile goal direction
- [ ] Volume caption `estimado según tu plan` present in P0, removed in P2
- [ ] History: collapse persists, delete works with confirm, count pill correct, empty state intact
- [ ] First-run: no blank screen — hero 0/plan + per-card CTAs
- [ ] Skeleton on load, never a spinner; no layout jump when data lands
- [ ] All metric numbers tabular-nums, Spanish locale
- [ ] Red reserved for brand/action/today; duration pill no longer green-bg/blue-text
- [ ] FAB does not cover history expand tap targets (bottom spacer 72)
