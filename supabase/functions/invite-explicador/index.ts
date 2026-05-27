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

async function sendInviteEmail(to: string, nome: string, actionLink: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) throw new Error('RESEND_API_KEY não configurado');

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr><td style="background:#6366f1;padding:24px 32px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;">EduFlow</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#18181b;">Olá, ${nome}!</p>
          <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
            Foste convidado(a) para aceder à plataforma <strong>EduFlow</strong>.
            Clica no botão abaixo para definir a tua palavra-passe e ativar o acesso.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${actionLink}"
               style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;
                      text-decoration:none;padding:12px 28px;border-radius:8px;">
              Ativar acesso
            </a>
          </div>
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
            Se não esperavas este email, podes ignorá-lo em segurança.<br>
            O link expira em 24 horas.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EduFlow <noreply@eduflow.pt>',
      to: [to],
      subject: 'O teu acesso à plataforma EduFlow',
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
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

    const { data: perfil, error: perfilErr } = await admin
      .from('professor_perfis')
      .select('user_id, centro_id, nome, users!inner(email)')
      .eq('user_id', explicador_id)
      .single();

    if (perfilErr || !perfil) return json({ error: 'Explicador não encontrado' }, 404);
    if (perfil.centro_id !== callerProfile.centro_id) {
      return json({ error: 'Forbidden: explicador de outro centro' }, 403);
    }

    const email = (perfil as { users?: { email?: string } }).users?.email;
    const nome = (perfil as { nome?: string }).nome ?? 'Explicador';
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

    await sendInviteEmail(email, nome, actionLink);

    await admin
      .from('professor_perfis')
      .update({ convite_enviado_em: new Date().toISOString() })
      .eq('user_id', explicador_id);

    return json({ success: true, email }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
