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

    if (profileErr || !callerProfile || !['admin', 'rececionista'].includes(callerProfile.role)) {
      return json({ error: 'Forbidden: requires admin or rececionista role' }, 403);
    }

    const { explicador_id, redirect_to } = await req.json();
    if (!explicador_id) return json({ error: 'Missing required field: explicador_id' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // email vive em public.users, não em professor_perfis — extrair via join.
    const { data: perfil, error: perfilErr } = await admin
      .from('professor_perfis')
      .select('user_id, centro_id, users!inner(email)')
      .eq('user_id', explicador_id)
      .single();

    if (perfilErr || !perfil) return json({ error: 'Explicador não encontrado' }, 404);
    if (perfil.centro_id !== callerProfile.centro_id) {
      return json({ error: 'Forbidden: explicador de outro centro' }, 403);
    }

    const email = (perfil as { users?: { email?: string } }).users?.email;
    if (!email) return json({ error: 'Explicador sem email' }, 400);

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirect_to ? { redirectTo: redirect_to } : undefined,
    });

    if (linkErr || !linkData) {
      return json({ error: linkErr?.message ?? 'Falha ao gerar link de convite' }, 400);
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) return json({ error: 'Link não gerado' }, 500);

    await admin
      .from('professor_perfis')
      .update({ convite_enviado_em: new Date().toISOString() })
      .eq('user_id', explicador_id);

    return json({ success: true, email, link: actionLink }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
