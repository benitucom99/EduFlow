

# Portal do Encarregado de Educação — Marcação de Aulas

## Resumo

Criar um portal separado com autenticação própria para encarregados de educação, onde podem ver os seus educandos e marcar aulas escolhendo disciplina, horário disponível, tipo de aula e recorrência.

## Arquitetura

```text
/portal/login  →  Login do encarregado (email)
/portal        →  Lista de educandos + marcação de aulas
```

O portal é independente do backoffice (admin). Partilha o mesmo `DataContext` para que as aulas marcadas apareçam no calendário do admin.

## Passos de implementação

### 1. Novo role e dados mock para encarregados

- Adicionar `"encarregado"` ao tipo `UserRole` em `mockData.ts`
- Criar interface `EncarregadoUser` com `id`, `nome`, `email`, `alunoIds[]`
- Adicionar 2-3 utilizadores encarregados mock (mapeados aos alunos existentes via `encarregado.email`)
- Adicionar credenciais mock correspondentes

### 2. Portal de Login do Encarregado

- Criar `src/pages/portal/PortalLoginPage.tsx` — formulário simples de email + password
- Reutilizar o `AuthContext` existente, que já suporta roles
- Rota `/portal/login`

### 3. Página principal do Portal

- Criar `src/pages/portal/PortalPage.tsx`
- Mostrar os educandos associados ao encarregado autenticado
- Para cada educando: lista de próximas aulas agendadas
- Botão "Marcar Aula" que abre o modal de marcação

### 4. Modal de Marcação de Aula

- Criar `src/components/portal/MarcarAulaModal.tsx`
- Campos do formulário:
  - **Educando** (pré-selecionado se só tem um)
  - **Disciplina** (filtrada pelas disciplinas do aluno)
  - **Tipo de aula** (individual / grupo)
  - **Data** (calendário com date picker)
  - **Horário** (slots disponíveis calculados com base em explicadores disponíveis e salas livres)
  - **Recorrência** (única / semanal / quinzenal)
- Validação de conflitos (sala e explicador ocupados)
- A aula é criada com `estado: "agendada"` no `DataContext`

### 5. Lógica de disponibilidade

- Filtrar explicadores ativos que lecionam a disciplina escolhida
- Cruzar com a disponibilidade semanal do explicador e salas livres
- Apresentar apenas slots válidos (sem conflitos)
- Atribuir automaticamente explicador e sala ao slot escolhido

### 6. Rotas e proteção

- Adicionar rotas `/portal/login` e `/portal` em `App.tsx`
- Criar `PortalProtectedRoute` que restringe acesso ao role `encarregado`
- Layout simplificado para o portal (sem sidebar do backoffice)

### 7. Confirmação e feedback

- Toast de sucesso após marcação
- Aula aparece imediatamente na lista do educando
- No backoffice, a aula aparece no calendário normalmente

## Ficheiros a criar/modificar

| Ação | Ficheiro |
|------|----------|
| Modificar | `src/data/mockData.ts` — novo role, dados encarregados |
| Modificar | `src/App.tsx` — rotas do portal |
| Criar | `src/pages/portal/PortalLoginPage.tsx` |
| Criar | `src/pages/portal/PortalPage.tsx` |
| Criar | `src/components/portal/MarcarAulaModal.tsx` |
| Criar | `src/components/portal/PortalLayout.tsx` |
| Criar | `src/components/portal/PortalProtectedRoute.tsx` |

