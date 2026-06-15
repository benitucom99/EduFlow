// Gera um link de login de uso único (magic link) para qualquer utilizador,
// usado pelo dono da plataforma para "entrar como" e verificar cada centro.
//
// Não contém segredos: lê tudo do ambiente. Correr só localmente, nunca em
// produção/CI. A service-role key dá poder total sobre a BD — definir só na
// sessão do terminal, NUNCA escrever num ficheiro nem commitar.
//
// Uso:
//   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  npm run impersonate <email>
//
// Abrir o link impresso numa JANELA ANÓNIMA → ficas com sessão dessa conta,
// sem afetar a tua sessão de admin no browser normal. Link de uso único (~1h).
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redirectTo = process.env.IMPERSONATE_REDIRECT; // opcional (default: Site URL do Supabase)

if (!email) {
  console.error("Uso: npm run impersonate <email>");
  process.exit(1);
}
if (!url || !key) {
  console.error("Define SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (só nesta sessão).");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  ...(redirectTo ? { options: { redirectTo } } : {}),
});

if (error) {
  console.error("Erro:", error.message);
  process.exit(1);
}

console.log(`\nLink de login de uso único para ${email} (abrir em JANELA ANÓNIMA):\n`);
console.log(data.properties.action_link);
console.log("\nA tua sessão normal não é afetada. Para voltar, fecha a janela anónima ou faz logout.\n");
