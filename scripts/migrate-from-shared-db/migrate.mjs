#!/usr/bin/env node
// Moves Zyron's users (accounts + passwords, profiles, routines, meals, logs,
// measurements, plans, memberships, meal photos) from the OLD shared Supabase
// project into Zyron's NEW project, and copies the exercise GIFs.
//
// SETUP (once):
//   cd zenfit/scripts/migrate-from-shared-db
//   npm install
//   copy .env.example .env      -> fill it in (never commit it; .gitignore covers it)
//
// RUN:
//   node --env-file=.env migrate.mjs                 # dry run: shows what would move, writes nothing
//   node --env-file=.env migrate.mjs --apply         # do it
//
// OPTIONS:
//   --include=a@x.com,b@y.com   also move these (e.g. Zyron users still tagged app='hokage')
//   --exclude=a@x.com           leave these behind (e.g. a Hokage client who once opened Zyron)
//   --no-storage                database only (no meal photos / exercise GIFs)
//   --no-exercise-media         skip the exercise GIFs + video_url rewrite
//
// The OLD project is only ever read. Run this BEFORE the Hokage conversion
// (hokage-coaching-app/supabase/scripts/convert_shared_db_to_hokage_only.sql),
// which deletes these users from the old project. Safe to re-run.
import fs from 'node:fs';
import pg from 'pg';
import { plan, applyDb, copyStorage, rewriteVideoUrls, verify } from './core.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(`--${f}`);
const list = (f) => (args.find((a) => a.startsWith(`--${f}=`))?.slice(f.length + 3) ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const APPLY = has('apply');
const STORAGE = !has('no-storage');
const MEDIA = STORAGE && !has('no-exercise-media');

const env = process.env;
const required = ['OLD_DB_URL', 'NEW_DB_URL', 'OLD_SUPABASE_URL', 'NEW_SUPABASE_URL', ...(APPLY && STORAGE ? ['NEW_SECRET_KEY'] : [])];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(', ')}  (see .env.example)`);
  process.exit(1);
}

// Supabase's pooler presents Supabase's own CA. Verify it when the cert is
// given (Dashboard -> Database -> SSL Configuration -> Download certificate).
const ssl = env.SUPABASE_CA_CERT
  ? { ca: fs.readFileSync(env.SUPABASE_CA_CERT, 'utf8'), rejectUnauthorized: true }
  : { rejectUnauthorized: false };
const client = (url) => {
  const u = new URL(url);
  const noSsl = u.searchParams.get('sslmode') === 'disable';   // local databases only
  u.searchParams.delete('sslmode');   // would override the ssl option above
  return new pg.Client({ connectionString: u.toString(), ssl: noSsl ? false : ssl });
};

const encodePath = (name) => name.split('/').map(encodeURIComponent).join('/');
const base = (url) => url.replace(/\/$/, '');
async function download(bucket, name) {
  // Both buckets are public: no key needed on the old project.
  const res = await fetch(`${base(env.OLD_SUPABASE_URL)}/storage/v1/object/public/${bucket}/${encodePath(name)}`);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
async function upload(bucket, name, bytes, contentType) {
  const key = env.NEW_SECRET_KEY;
  // New-style secret keys (sb_secret_...) go in `apikey` only; legacy service_role JWTs in both headers.
  const auth = key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
  const res = await fetch(`${base(env.NEW_SUPABASE_URL)}/storage/v1/object/${bucket}/${encodePath(name)}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

const oldDb = client(env.OLD_DB_URL);
const newDb = client(env.NEW_DB_URL);
// A dropped connection surfaces as the failing query's error; don't also crash on the event.
oldDb.on('error', (e) => console.error(`OLD project connection error: ${e.message}`));
newDb.on('error', (e) => console.error(`NEW project connection error: ${e.message}`));

async function main() {
  const p = await plan({
    oldDb, newDb, include: list('include'), exclude: list('exclude'),
    oldSupabaseUrl: env.OLD_SUPABASE_URL, newSupabaseUrl: env.NEW_SUPABASE_URL,
  });
  if (p.problems.length) {
    console.error('\nCannot continue:\n' + p.problems.map((x) => `  - ${x}`).join('\n'));
    return 1;
  }

  console.log(`\nUsers to move (${p.people.length}):`);
  for (const u of p.people) {
    const type = u.role === 'coach' ? 'coach' : u.coachManaged ? 'coached' : 'solo';
    const again = p.alreadyMigrated.includes((u.email ?? '').toLowerCase()) ? '  (already in new project)' : '';
    console.log(`  ${(u.email ?? u.id).padEnd(38)} ${type.padEnd(8)} was app=${u.app}${again}`);
  }
  console.log('\nRows:');
  for (const [t, rows] of Object.entries(p.rows)) if (rows.length) console.log(`  ${t.padEnd(38)} ${rows.length}`);
  const matched = Object.keys(p.exerciseMap).length - p.exercisesToCopy.length;
  console.log(`  exercises: ${matched} matched to the new catalog by name, ${p.exercisesToCopy.length} copied`
    + (p.exercisesToCopy.length ? ` (${p.exercisesToCopy.map((e) => e.name).join(', ')})` : ''));
  console.log(`\nStorage: ${p.storage.mealPhotos.length} meal photos, ${p.storage.exerciseMedia.length} exercise GIFs`
    + (STORAGE ? '' : '  (skipped: --no-storage)'));
  for (const n of p.notes) console.log(`\nNote: ${n}`);

  if (!APPLY) {
    console.log('\nDry run -- nothing was written. Re-run with --apply to move them.');
    return 0;
  }

  console.log('\nCopying rows (inserted / source):');
  await applyDb({ newDb, plan: p, log: console.log });

  if (STORAGE) {
    console.log('\nCopying files:');
    const s = await copyStorage({ plan: p, download, upload, withExerciseMedia: MEDIA, log: console.log });
    if (MEDIA) {
      const n = await rewriteVideoUrls({ newDb, oldSupabaseUrl: env.OLD_SUPABASE_URL,
        newSupabaseUrl: env.NEW_SUPABASE_URL, copiedNames: s.done['exercise-media'] });
      console.log(`  video_url now pointing at the new project: ${n} exercises`);
    }
    if (s.failed.length) {
      console.log(`\n${s.failed.length} file(s) failed -- re-run with --apply to retry (already-copied rows are skipped):`);
      for (const f of s.failed.slice(0, 20)) console.log(`  ${f}`);
    }
  }

  console.log('\nIn the NEW project now (rows owned by the moved users; coach library templates not counted):');
  for (const [t, n] of Object.entries(await verify({ newDb, plan: p }))) console.log(`  ${t.padEnd(38)} ${n}`);

  const clients = p.people.filter((u) => u.role !== 'coach').map((u) => u.id);
  console.log(`
Done. They sign in to Zyron (pointed at the new project) with the SAME email and password.

Next, in the OLD project: remove the Zyron coach account(s) (${p.people.filter((u) => u.role === 'coach').map((u) => u.email).join(', ') || 'none'}),
then run convert_shared_db_to_hokage_only.sql with:
  v_confirm_delete uuid[] := '{${clients.join(',')}}';`);
  return 0;
}

// Always close both connections cleanly, whatever happened.
let code = 1;
try {
  await oldDb.connect();
  await newDb.connect();
  code = await main();
} catch (e) {
  console.error(`
Failed: ${e.message}
Nothing partial was committed to the NEW project's database (it runs in one transaction); files already uploaded are simply re-uploaded on the next run.`);
} finally {
  await Promise.allSettled([oldDb.end(), newDb.end()]);
}
process.exitCode = code;
