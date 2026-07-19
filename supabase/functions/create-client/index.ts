// Coach Admin Panel — creates a client login. The only operation the panel
// cannot do with the anon key: auth.admin.createUser needs the service-role
// key, which must never reach the browser. See docs/ADMIN_WEB_DB_CONNECTION.md §6.
//
// Deploy:
//   supabase functions deploy create-client
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service role key>
// (SUPABASE_URL / SUPABASE_ANON_KEY are provided to functions automatically.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*', // tighten to the panel's real origin before launch
  // supabase-js invoke() sends apikey + x-client-info too — omitting them
  // from the preflight allowlist makes the browser block the POST entirely.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';

    // 1) Verify the CALLER is the coach, using their JWT + the anon key (RLS applies).
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'unauthenticated' }, 401);

    const { data: me } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role !== 'coach') return json({ error: 'forbidden' }, 403);

    const { email, display_name } = await req.json();
    if (typeof email !== 'string' || !email.includes('@')) {
      return json({ error: 'a valid email is required' }, 400);
    }

    // 2) Do the privileged work with the SERVICE ROLE (server-only secret).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Temporary password, returned ONCE to the coach who shares it with the
    // client out-of-band (WhatsApp). The client signs in with it and changes
    // it in the app's Ajustes screen. (The previous generateLink approach
    // produced a link but never delivered it anywhere — no email is sent by
    // generateLink, and the app has no web recovery flow.)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const temp_password = 'Hkg-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { display_name },
    });
    if (error) return json({ error: error.message }, 400);

    // handle_new_user creates the profiles row (role defaults to 'user') and
    // the email-sync trigger fills in profiles.email — both run server-side
    // as part of this same createUser call, before we respond.
    if (display_name && created.user) {
      await admin.from('profiles').update({ display_name }).eq('id', created.user.id);
    }

    return json({ user_id: created.user?.id, temp_password }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
