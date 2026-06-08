import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser.user) return json({ error: 'Unauthorized' }, 401);

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('users')
      .select('role, centro_id')
      .eq('id', callerUser.user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Forbidden: requires admin role' }, 403);
    }

    const { user_id } = await req.json();
    if (!user_id) return json({ error: 'Missing required field: user_id' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Confirm the target is a rececionista in the same centro.
    const { data: target, error: targetErr } = await admin
      .from('users')
      .select('role, centro_id')
      .eq('id', user_id)
      .single();

    if (targetErr || !target) return json({ error: 'User not found' }, 404);
    if (target.role !== 'rececionista') return json({ error: 'Target is not a rececionista' }, 400);
    if (target.centro_id !== callerProfile.centro_id) return json({ error: 'Forbidden: different centro' }, 403);

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id);
    if (deleteErr) return json({ error: deleteErr.message }, 500);

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
