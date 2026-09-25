// Moves Zyron's users -- accounts (passwords included), profiles and all their
// data -- from the OLD shared Supabase project to Zyron's NEW project.
//
// Pure logic: `oldDb` / `newDb` are anything with query(sql, params) -> { rows }
// (a pg Client in production, PGlite in tests); `download` / `upload` move
// Storage files. migrate.mjs wires up the real connections.
//
// Guarantees:
//   * The OLD project is only READ, inside a read-only snapshot transaction.
//   * The NEW project is written in ONE transaction -- all rows or none.
//   * Re-runnable: rows already copied are skipped (ON CONFLICT DO NOTHING).
//   * Ids are kept, so logins, Storage paths (<userId>/...) and every
//     reference between rows survive. The two exceptions are handled:
//     exercises/bodyparts were seeded with random ids per project, so they are
//     matched by name; references to anything NOT migrated (the Hokage coach,
//     templates it authored) are cleared instead of pointing nowhere.

const J = (v) => JSON.stringify(v);
/** `<col> in (<uuid list>)` that works the same on pg and PGlite. */
const IN = (col, n) => `${col} in (select x::uuid from jsonb_array_elements_text($${n}::jsonb) x)`;

const OLD_HOST_RE = /^https:\/\/([a-z0-9]+)\.supabase\.co\//;

/** Rows as plain objects, one per table row, via to_jsonb. */
async function rowsOf(db, table, where, params) {
  const res = await db.query(`select to_jsonb(t) as r from ${table} t where ${where}`, params);
  return res.rows.map((x) => (typeof x.r === 'string' ? JSON.parse(x.r) : x.r));
}

async function tableExists(db, schema, table) {
  const r = await db.query(
    `select 1 from information_schema.tables where table_schema = $1 and table_name = $2`, [schema, table]);
  return r.rows.length > 0;
}

/** Columns we may INSERT into (skips generated / identity-always columns). */
async function insertableColumns(db, schema, table) {
  const r = await db.query(
    `select column_name from information_schema.columns
      where table_schema = $1 and table_name = $2
        and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS'
      order by ordinal_position`, [schema, table]);
  return r.rows.map((x) => x.column_name);
}

/* ============================== PLAN ============================== */

export async function plan({ oldDb, newDb, include = [], exclude = [], oldSupabaseUrl, newSupabaseUrl }) {
  const inc = include.map((e) => e.toLowerCase());
  const exc = exclude.map((e) => e.toLowerCase());
  const problems = [];

  // ---- sanity: are these the right two projects? -------------------------
  const appDefault = async (db) => (await db.query(
    `select column_default as d from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'app'`)).rows[0]?.d ?? null;
  const oldApp = await appDefault(oldDb);
  const newApp = await appDefault(newDb);
  if (oldApp == null) problems.push('OLD project has no profiles.app column -- already converted to Hokage-only, or not the shared project.');
  else if (!String(oldApp).includes('hokage')) problems.push(`OLD project's profiles.app default is ${oldApp}; expected the shared project ('hokage').`);
  if (newApp == null || !String(newApp).includes('zyron')) {
    problems.push(`NEW project's profiles.app default is ${newApp ?? 'missing'}; run zenfit/supabase/zyron_database_setup.sql there first.`);
  }
  if (oldSupabaseUrl && newSupabaseUrl && oldSupabaseUrl.replace(/\/$/, '') === newSupabaseUrl.replace(/\/$/, '')) {
    problems.push('OLD and NEW Supabase URLs are the same project.');
  }
  if (problems.length) return { problems };

  // One consistent, read-only snapshot of the OLD project.
  await oldDb.query('begin transaction isolation level repeatable read read only');
  try {
    // ---- who moves ---------------------------------------------------------
    const people = (await oldDb.query(
      `select p.id, p.email, p.display_name, p.role, p.app, p.account_type
         from public.profiles p
        where (p.app = 'zyron' or p.account_type = 'solo'
               or lower(p.email) in (select jsonb_array_elements_text($1::jsonb)))
          and not coalesce(lower(p.email) in (select jsonb_array_elements_text($2::jsonb)), false)
        order by p.role desc, p.created_at`, [J(inc), J(exc)])).rows;
    const missingIncludes = inc.filter((e) => !people.some((p) => (p.email ?? '').toLowerCase() === e));
    if (missingIncludes.length) problems.push(`--include emails not found in the OLD project: ${missingIncludes.join(', ')}`);
    const U = people.map((p) => p.id);
    const C = people.filter((p) => p.role === 'coach').map((p) => p.id);
    const uSet = new Set(U);

    // ---- rows ----------------------------------------------------------------
    const R = {};
    R['auth.users'] = await rowsOf(oldDb, 'auth.users', IN('id', 1), [J(U)]);
    R['auth.identities'] = (await tableExists(oldDb, 'auth', 'identities'))
      ? await rowsOf(oldDb, 'auth.identities', IN('user_id', 1), [J(U)]) : [];
    R['public.profiles'] = await rowsOf(oldDb, 'public.profiles', IN('id', 1), [J(U)]);

    // Owned by a migrating user, or a library template authored by a migrating coach.
    const ownedOrTemplate = (col = 'user_id') =>
      `(${IN(col, 1)} or (${col} is null and ${IN('assigned_by', 2)}))`;
    R['public.routines'] = await rowsOf(oldDb, 'public.routines', ownedOrTemplate(), [J(U), J(C)]);
    const routineIds = R['public.routines'].map((r) => r.id);
    R['public.routine_exercises'] = await rowsOf(oldDb, 'public.routine_exercises', IN('routine_id', 1), [J(routineIds)]);
    R['public.workout_logs'] = await rowsOf(oldDb, 'public.workout_logs', IN('user_id', 1), [J(U)]);

    R['public.programs'] = await rowsOf(oldDb, 'public.programs', ownedOrTemplate(), [J(U), J(C)]);
    const programIds = R['public.programs'].map((r) => r.id);
    R['public.program_days'] = await rowsOf(oldDb, 'public.program_days', IN('program_id', 1), [J(programIds)]);
    R['public.program_exercises'] = await rowsOf(oldDb, 'public.program_exercises', IN('program_day_id', 1),
      [J(R['public.program_days'].map((r) => r.id))]);
    R['public.program_weeks'] = await rowsOf(oldDb, 'public.program_weeks', IN('program_id', 1), [J(programIds)]);
    R['public.workout_set_logs'] = await rowsOf(oldDb, 'public.workout_set_logs', IN('user_id', 1), [J(U)]);
    R['public.program_exercise_completions'] = await rowsOf(oldDb, 'public.program_exercise_completions', IN('user_id', 1), [J(U)]);

    R['public.nutrition_plans'] = await rowsOf(oldDb, 'public.nutrition_plans', ownedOrTemplate(), [J(U), J(C)]);
    const nPlanIds = R['public.nutrition_plans'].map((r) => r.id);
    R['public.nutrition_plan_targets'] = await rowsOf(oldDb, 'public.nutrition_plan_targets', IN('plan_id', 1), [J(nPlanIds)]);
    R['public.nutrition_plan_meals'] = await rowsOf(oldDb, 'public.nutrition_plan_meals', IN('plan_id', 1), [J(nPlanIds)]);
    R['public.nutrition_plan_options'] = await rowsOf(oldDb, 'public.nutrition_plan_options', IN('plan_meal_id', 1),
      [J(R['public.nutrition_plan_meals'].map((r) => r.id))]);
    R['public.nutrition_plan_option_items'] = await rowsOf(oldDb, 'public.nutrition_plan_option_items', IN('option_id', 1),
      [J(R['public.nutrition_plan_options'].map((r) => r.id))]);

    R['public.supplement_plans'] = await rowsOf(oldDb, 'public.supplement_plans', ownedOrTemplate(), [J(U), J(C)]);
    R['public.supplement_plan_items'] = await rowsOf(oldDb, 'public.supplement_plan_items', IN('plan_id', 1),
      [J(R['public.supplement_plans'].map((r) => r.id))]);

    R['public.meals'] = await rowsOf(oldDb, 'public.meals', IN('user_id', 1), [J(U)]);
    R['public.meal_items'] = await rowsOf(oldDb, 'public.meal_items', IN('meal_id', 1), [J(R['public.meals'].map((r) => r.id))]);
    R['public.body_measurements'] = await rowsOf(oldDb, 'public.body_measurements', IN('user_id', 1), [J(U)]);
    R['public.memberships'] = await rowsOf(oldDb, 'public.memberships', IN('client_id', 1), [J(U)]);

    // ---- exercises: matched by name (random ids per project) ----------------
    const usedExerciseIds = [...new Set([
      ...R['public.routine_exercises'].map((r) => r.exercise_id),
      ...R['public.program_exercises'].map((r) => r.exercise_id),
    ].filter(Boolean))];
    const oldExercises = (await oldDb.query(
      `select to_jsonb(e) as r, bp.name as body_part_name
         from public.exercises e left join public.bodyparts bp on bp.id = e.body_part_id
        where ${IN('e.id', 1)}`, [J(usedExerciseIds)])).rows
      .map((x) => ({ ...(typeof x.r === 'string' ? JSON.parse(x.r) : x.r), body_part_name: x.body_part_name }));
    const newCatalog = new Map((await newDb.query(`select id, lower(name) as n from public.exercises`)).rows.map((x) => [x.n, x.id]));
    const newBodyparts = new Map((await newDb.query(`select id, name from public.bodyparts`)).rows.map((x) => [x.name, x.id]));
    const exerciseMap = new Map();
    const exercisesToCopy = [];
    for (const e of oldExercises) {
      const hit = newCatalog.get(e.name.toLowerCase());
      if (hit) exerciseMap.set(e.id, hit);
      else {
        exerciseMap.set(e.id, e.id);   // copied with its own id
        const { body_part_name, ...row } = e;
        exercisesToCopy.push({ ...row, body_part_id: body_part_name ? (newBodyparts.get(body_part_name) ?? null) : null });
      }
    }

    // ---- storage ---------------------------------------------------------------
    const storageOf = async (bucket, where, params) => (await oldDb.query(
      `select name, metadata from storage.objects where bucket_id = '${bucket}' and ${where} order by name`, params)).rows
      .map((o) => ({ bucket, name: o.name, metadata: typeof o.metadata === 'string' ? JSON.parse(o.metadata) : o.metadata }));
    const mealPhotos = await storageOf('meal-photos',
      `split_part(name, '/', 1) in (select jsonb_array_elements_text($1::jsonb))`, [J(U)]);
    const exerciseMedia = await storageOf('exercise-media', 'true', []);

    // ---- conflicts in the NEW project ---------------------------------------------
    const emails = people.map((p) => (p.email ?? '').toLowerCase()).filter(Boolean);
    const existing = (await newDb.query(
      `select id, lower(email) as email from auth.users
        where ${IN('id', 1)} or lower(email) in (select jsonb_array_elements_text($2::jsonb))`, [J(U), J(emails)])).rows;
    const alreadyMigrated = existing.filter((x) => uSet.has(x.id)).map((x) => x.email);
    const emailTaken = existing.filter((x) => !uSet.has(x.id)).map((x) => x.email);
    if (emailTaken.length) {
      problems.push(`These emails already have a DIFFERENT account in the NEW project (they signed up again?): ${emailTaken.join(', ')}. `
        + 'Delete that new account first, or --exclude them.');
    }

    // ---- who counts as coach-managed (Zyron: account_type) ----------------------
    const coachContent = new Set([
      ...R['public.routines'].filter((r) => r.user_id && r.assigned_by).map((r) => r.user_id),
      ...R['public.meals'].filter((r) => r.assigned_by).map((r) => r.user_id),
      ...R['public.programs'].filter((r) => r.user_id).map((r) => r.user_id),
      ...R['public.nutrition_plans'].filter((r) => r.user_id).map((r) => r.user_id),
      ...R['public.supplement_plans'].filter((r) => r.user_id).map((r) => r.user_id),
      ...R['public.memberships'].map((r) => r.client_id),
    ]);

    const nonEmail = R['auth.identities'].filter((i) => i.provider && i.provider !== 'email').map((i) => `${i.provider}`);

    return {
      problems,
      people: people.map((p) => ({ ...p, coachManaged: coachContent.has(p.id) })),
      U, C, rows: R, exerciseMap: Object.fromEntries(exerciseMap), exercisesToCopy,
      coachContent: [...coachContent], alreadyMigrated,
      storage: { mealPhotos, exerciseMedia },
      notes: nonEmail.length ? [`Non-email sign-in providers present (${[...new Set(nonEmail)].join(', ')}): configure them in the NEW project too.`] : [],
      oldHostRef: (oldSupabaseUrl ?? '').match(OLD_HOST_RE)?.[1] ?? null,
    };
  } finally {
    await oldDb.query('rollback');
  }
}

/* ============================== APPLY (database) ============================== */

/** Rewrites references so every row points only at migrated rows (or null). */
export function transformRows(p) {
  const R = structuredClone(p.rows);
  const U = new Set(p.U);
  const ids = (t) => new Set(R[t].map((r) => r.id));
  const routines = ids('public.routines');
  const programs = ids('public.programs');
  const programExercises = ids('public.program_exercises');
  const nPlans = ids('public.nutrition_plans');
  const sPlans = ids('public.supplement_plans');
  const options = ids('public.nutrition_plan_options');
  const coachManaged = new Set(p.coachContent);
  const exMap = p.exerciseMap;
  const keepUser = (id) => (id != null && U.has(id) ? id : null);
  const keepIn = (set) => (id) => (id != null && set.has(id) ? id : null);

  for (const r of R['public.profiles']) {
    r.app = 'zyron';
    if (r.role !== 'coach') r.account_type = coachManaged.has(r.id) ? 'coached' : 'solo';
  }
  for (const r of R['public.routines']) { r.assigned_by = keepUser(r.assigned_by); r.template_id = keepIn(routines)(r.template_id); }
  const routineOwner = new Map(R['public.routines'].map((r) => [r.id, r.user_id]));
  for (const r of R['public.routine_exercises']) {
    r.exercise_id = exMap[r.exercise_id] ?? r.exercise_id;
    if (r.user_id != null && !U.has(r.user_id)) r.user_id = routineOwner.get(r.routine_id) ?? null;
  }
  for (const r of R['public.workout_logs']) r.routine_id = keepIn(routines)(r.routine_id);
  for (const t of ['public.programs', 'public.nutrition_plans', 'public.supplement_plans']) {
    const own = t === 'public.programs' ? programs : t === 'public.nutrition_plans' ? nPlans : sPlans;
    for (const r of R[t]) { r.assigned_by = keepUser(r.assigned_by); r.template_id = keepIn(own)(r.template_id); }
  }
  for (const r of R['public.program_exercises']) if (r.exercise_id) r.exercise_id = exMap[r.exercise_id] ?? r.exercise_id;
  for (const t of ['public.workout_set_logs', 'public.program_exercise_completions']) {
    for (const r of R[t]) r.program_exercise_id = keepIn(programExercises)(r.program_exercise_id);
  }
  for (const r of R['public.meals']) r.assigned_by = keepUser(r.assigned_by);
  for (const r of R['public.meal_items']) r.plan_option_id = keepIn(options)(r.plan_option_id);
  for (const r of R['public.memberships']) r.coach_id = keepUser(r.coach_id);
  return R;
}

const ORDER = [
  // [table, how]; self-referencing template_id is inserted null, then set.
  ['auth.users', 'insert'], ['auth.identities', 'insert'], ['public.profiles', 'upsert'],
  ['public.exercises', 'insert'],
  ['public.routines', 'insert'], ['public.routine_exercises', 'insert'], ['public.workout_logs', 'insert'],
  ['public.programs', 'insert'], ['public.program_days', 'insert'], ['public.program_exercises', 'insert'],
  ['public.program_weeks', 'insert'], ['public.workout_set_logs', 'insert'], ['public.program_exercise_completions', 'insert'],
  ['public.nutrition_plans', 'insert'], ['public.nutrition_plan_targets', 'insert'], ['public.nutrition_plan_meals', 'insert'],
  ['public.nutrition_plan_options', 'insert'], ['public.nutrition_plan_option_items', 'insert'],
  ['public.supplement_plans', 'insert'], ['public.supplement_plan_items', 'insert'],
  ['public.meals', 'insert'], ['public.meal_items', 'insert'],
  ['public.body_measurements', 'insert'], ['public.memberships', 'insert'],
];
const SELF_REF = { 'public.routines': 'template_id', 'public.programs': 'template_id',
  'public.nutrition_plans': 'template_id', 'public.supplement_plans': 'template_id' };

export async function applyDb({ newDb, plan: p, log = () => {} }) {
  const R = transformRows(p);
  R['public.exercises'] = p.exercisesToCopy;
  const counts = {};
  await newDb.query('begin');
  try {
    // Updating a profile's weight logs a "today" measurement (on_profile_weight_change);
    // importing profiles must not invent one. Disabled for this transaction only.
    let weightTriggerOff = false;
    try {
      await newDb.query('savepoint weight_trigger');
      await newDb.query('alter table public.profiles disable trigger on_profile_weight_change');
      await newDb.query('release savepoint weight_trigger');
      weightTriggerOff = true;
    } catch {
      await newDb.query('rollback to savepoint weight_trigger');
    }

    for (const [table, how] of ORDER) {
      const rows = R[table] ?? [];
      if (!rows.length) { counts[table] = { source: 0, inserted: 0 }; continue; }
      const [schema, name] = table.split('.');
      const cols = (await insertableColumns(newDb, schema, name)).filter((c) => c in rows[0]);
      const selfRef = SELF_REF[table];
      const payload = selfRef ? rows.map((r) => ({ ...r, [selfRef]: null })) : rows;
      const colList = cols.map((c) => `"${c}"`).join(', ');
      const conflict = how === 'upsert'
        ? `on conflict (id) do update set ${cols.filter((c) => c !== 'id').map((c) => `"${c}" = excluded."${c}"`).join(', ')}`
        : 'on conflict do nothing';
      const res = await newDb.query(
        `with ins as (insert into ${table} (${colList})
                      select ${colList} from jsonb_populate_recordset(null::${table}, $1::jsonb)
                      ${conflict} returning 1)
         select count(*)::int as n from ins`, [J(payload)]);
      counts[table] = { source: rows.length, inserted: Number(res.rows[0].n) };
      if (selfRef) {
        const refs = rows.filter((r) => r[selfRef] != null).map((r) => ({ id: r.id, ref: r[selfRef] }));
        if (refs.length) {
          await newDb.query(
            `update ${table} t set ${selfRef} = x.ref
               from jsonb_to_recordset($1::jsonb) as x(id uuid, ref uuid)
              where t.id = x.id and t.${selfRef} is distinct from x.ref`, [J(refs)]);
        }
      }
      log(`  ${table.padEnd(38)} ${String(counts[table].inserted).padStart(5)} / ${rows.length}`);
    }

    if (!weightTriggerOff) {
      // Fallback when ALTER TABLE wasn't allowed: drop only the rows the trigger invented.
      const keep = R['public.body_measurements'].map((r) => r.id);
      await newDb.query(
        `delete from public.body_measurements
          where ${IN('user_id', 1)} and measured_on = current_date
            and not (id in (select x::uuid from jsonb_array_elements_text($2::jsonb) x))`, [J(p.U), J(keep)]);
    } else {
      await newDb.query('alter table public.profiles enable trigger on_profile_weight_change');
    }
    await newDb.query('commit');
  } catch (e) {
    await newDb.query('rollback');
    throw e;
  }
  return counts;
}

/* ============================== STORAGE ============================== */

export async function copyStorage({ plan: p, download, upload, withExerciseMedia = true, log = () => {} }) {
  const objects = [...p.storage.mealPhotos, ...(withExerciseMedia ? p.storage.exerciseMedia : [])];
  const done = { 'meal-photos': [], 'exercise-media': [] };
  const failed = [];
  for (const o of objects) {
    try {
      const bytes = await download(o.bucket, o.name);
      await upload(o.bucket, o.name, bytes, o.metadata?.mimetype ?? 'application/octet-stream');
      done[o.bucket].push(o.name);
    } catch (e) {
      failed.push(`${o.bucket}/${o.name}: ${e.message}`);
    }
  }
  log(`  meal-photos     ${done['meal-photos'].length} / ${p.storage.mealPhotos.length}`);
  if (withExerciseMedia) log(`  exercise-media  ${done['exercise-media'].length} / ${p.storage.exerciseMedia.length}`);
  return { done, failed };
}

/** Points video_url at the NEW project -- only for GIFs that were actually copied. */
export async function rewriteVideoUrls({ newDb, oldSupabaseUrl, newSupabaseUrl, copiedNames }) {
  if (!copiedNames.length) return 0;
  const from = `${oldSupabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/exercise-media/`;
  const to = `${newSupabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/exercise-media/`;
  const res = await newDb.query(
    `with up as (
       update public.exercises
          set video_url = $2::text || substr(video_url, length($1::text) + 1), updated_at = now()
        where video_url like $1::text || '%'
          and substr(video_url, length($1::text) + 1) in (select jsonb_array_elements_text($3::jsonb))
       returning 1)
     select count(*)::int as n from up`, [from, to, J(copiedNames)]);
  return Number(res.rows[0].n);
}

/** Per-table row counts in the NEW project for the migrated users. */
export async function verify({ newDb, plan: p }) {
  const out = {};
  const q = async (label, sql, params) => { out[label] = Number((await newDb.query(sql, params)).rows[0].n); };
  await q('auth.users', `select count(*)::int n from auth.users where ${IN('id', 1)}`, [J(p.U)]);
  await q('public.profiles', `select count(*)::int n from public.profiles where ${IN('id', 1)}`, [J(p.U)]);
  for (const t of ['routines', 'workout_logs', 'meals', 'body_measurements', 'programs', 'nutrition_plans',
    'supplement_plans', 'workout_set_logs', 'program_exercise_completions']) {
    await q(`public.${t}`, `select count(*)::int n from public.${t} where ${IN('user_id', 1)}`, [J(p.U)]);
  }
  await q('public.memberships', `select count(*)::int n from public.memberships where ${IN('client_id', 1)}`, [J(p.U)]);
  return out;
}
