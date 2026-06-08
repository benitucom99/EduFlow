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

    // Verify caller with their own JWT.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser.user) return json({ error: 'Unauthorized' }, 401);

    // Only admins can invite assistentes. centro_id is derived server-side.
    const { data: callerProfile, error: profileErr } = await callerClient
      .from('users')
      .select('role, centro_id')
      .eq('id', callerUser.user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Forbidden: requires admin role' }, 403);
    }

    const centroId = callerProfile.centro_id as string;
    if (!centroId) return json({ error: 'Caller has no centro_id' }, 400);

    const { nome, email, redirect_to } = await req.json();
    if (!nome || !email) return json({ error: 'Missing required fields: nome, email' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create the auth user with a random password (discarded after first login).
    const tempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createErr || !newUser.user) {
      return json({ error: createErr?.message ?? 'Failed to create user' }, 400);
    }

    const userId = newUser.user.id;

    // Assign role and associate with the caller's centro.
    const { error: usersErr } = await admin
      .from('users')
      .update({ role: 'rececionista', nome, centro_id: centroId })
      .eq('id', userId);

    if (usersErr) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: usersErr.message }, 500);
    }

    // Generate a recovery link so the assistente can set their password on first access.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirect_to ? { redirectTo: redirect_to } : undefined,
    });

    if (linkErr || !linkData) {
      return json({ error: linkErr?.message ?? 'Failed to generate invite link' }, 500);
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) return json({ error: 'Link not generated' }, 500);

    return json({ link: actionLink }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
