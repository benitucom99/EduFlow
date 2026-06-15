# Entrar como qualquer conta (verificação / suporte)

Gera um link de login de uso único para qualquer utilizador, sem ver nem mudar a
password dele. Usa a *service-role key* do Supabase, por isso corre **só localmente**.

## Como usar (PowerShell)

```powershell
# 1. Definir as variáveis SÓ nesta sessão (nunca commitar a key!)
$env:SUPABASE_URL = "https://bmhglddjfctkvalcylfx.supabase.co"   # produção
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role key>"            # Dashboard ▸ Settings ▸ API

# 2. Gerar o link
npm run impersonate geral@lumiospot.pt
```

Para **staging**, usa `https://hzvdxcztsuwgxxytegaa.supabase.co` e a service-role key
desse projeto.

## Como entrar

1. Copia o link impresso.
2. Abre numa **janela anónima** (assim a tua sessão de admin no browser normal fica intacta).
3. Ficas com sessão dessa conta — vês exatamente o que o utilizador vê (role + centro reais).
4. Para voltar: fecha a janela anónima ou faz logout.

O link é de **uso único** e expira (~1h).

## Segurança

- A **service-role key** dá poder total sobre a base de dados: define-a só na sessão do
  terminal, **nunca** a escrevas num ficheiro nem a commites. Se for exposta, roda-a no
  Dashboard.
- Os links gerados são *bearer tokens* de uso único — não os partilhes; usa-os logo.
- Impersonação de contas de clientes reais deve servir só para suporte/verificação.

## Pré-requisito (uma vez)

O link redireciona para a **Site URL** configurada em Supabase ▸ Authentication ▸ URL
Configuration. Confirma que aponta para o domínio de produção correto. Em alternativa,
passa `IMPERSONATE_REDIRECT=<url>` (tem de estar na allow-list de Redirect URLs):

```powershell
$env:IMPERSONATE_REDIRECT = "https://<dominio-prod>"
```
