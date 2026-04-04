# Auditoria Lumi Membros — Relatório de Bugs e Correções

**Data:** 2026-03-30
**Executor:** LUMI-DEV
**Status final:** Build limpo, sem erros TypeScript. Todos os bugs críticos corrigidos.

---

## Resumo Executivo

Foram encontrados e corrigidos **3 bugs críticos** no projeto. O bug raiz era uma **recursão infinita na política RLS da tabela `profiles` no Supabase**, que bloqueava completamente a leitura de perfis por usuários autenticados. Isso causava cascata de falhas em toda a aplicação.

---

## Bug 1 — Painel Admin Não Abre (CRÍTICO)

### Sintoma
Ao clicar no botão "Admin" na `StudentLayout`, o usuário era redirecionado de volta para `/cursos`.

### Causa Raiz
1. A policy RLS `"profiles: admin gerencia todos"` na tabela `profiles` usava `exists (select 1 from public.profiles p where p.id = auth.uid() ...)` — ou seja, consultava a própria tabela `profiles` dentro da policy da tabela `profiles`.
2. Isso causava **recursão infinita** (`infinite recursion detected in policy for relation "profiles"`).
3. O `fetchProfile()` no `AuthContext.tsx` capturava o erro via `try/catch` e retornava um usuário fallback com `role: "student"`.
4. `isAdmin` = `false` para role "student" → `ProtectedRoute` com `requireAdmin=true` redirecionava para `/cursos`.

### Correção Aplicada

**Arquivo:** `supabase/migrations/20260330000425_fix_rls_infinite_recursion.sql`

Criada função `public.is_admin_user()` com `SECURITY DEFINER` e `SET search_path = public`:
```sql
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'support')
  );
$$;
```

A função `SECURITY DEFINER` executa como o owner do banco (postgres), **bypassando RLS** ao consultar `profiles` internamente, quebrando a recursão.

A policy problemática foi substituída por:
```sql
CREATE POLICY "profiles: admin gerencia todos"
  ON public.profiles FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
```

**Resultado:** `fotografoandresouza@gmail.com` com `role: "owner"` agora passa na verificação `isAdmin` e acessa o painel admin normalmente.

---

## Bug 2 — "Perfil não encontrado" na Página de Perfil

### Sintoma
Clicar em "Meu Perfil" mostrava a mensagem "Perfil nao encontrado."

### Causa Raiz
O `MyProfilePage` usa:
- `useProfiles().findProfile(currentUserId)` — busca no Supabase `profiles` por UUID
- `useStudents().findStudent(currentUserId)` — também busca na tabela `profiles`

Ambas as consultas falhavam silenciosamente por causa da **mesma recursão infinita RLS** do Bug 1. As queries retornavam arrays vazios → `findProfile()` e `findStudent()` retornavam `null` → a condição `if (!profile || !student)` disparava.

### Correção Aplicada
A correção do Bug 1 (migration de fix RLS) resolve este bug automaticamente. Após o fix, `findProfile(userId)` e `findStudent(userId)` retornam os dados corretos do Supabase.

---

## Bug 3 — Usuários Criados Sem Perfil

### Sintoma
Usuários existentes na tabela `auth.users` sem correspondente na tabela `profiles`.

### Causa Raiz
Havia 3 usuários na tabela `auth.users`, mas apenas 1 tinha perfil na tabela `profiles` (o owner `fotografoandresouza@gmail.com`). Os outros dois:
- `visual.signup.1773447065@example.com` (id: `3db34f79-...`)
- `trigger.test.1773447016842@example.com` (id: `15e66c95-...`)

Tinham entradas em `auth.users` mas não em `profiles`. O trigger `on_auth_user_created` existe no schema, mas esses usuários foram criados antes da situação estar estabilizada.

### Correção Aplicada
A migration `20260330000425_fix_rls_infinite_recursion.sql` inclui um `INSERT` retroativo:

```sql
INSERT INTO public.profiles (id, email, name, display_name, username, role, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  LOWER(SPLIT_PART(u.email, '@', 1)),
  'student',
  'active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
```

**Resultado:** Todos os 3 usuários agora têm perfis na tabela `profiles`.

---

## Bug 4 — Botão Admin Visível Para Todos os Usuários (MENOR)

### Sintoma
O botão "Admin" no header da `StudentLayout` era exibido para todos os usuários autenticados, mesmo que não fossem admins.

### Correção Aplicada

**Arquivo:** `src/components/layout/StudentLayout.tsx`

Adicionado import de `useAuth` e condicional `{isAdmin && ...}`:

```tsx
const { isAdmin } = useAuth();
// ...
{isAdmin && (
  <Link to="/admin/cursos">
    <Button variant="ghost" className="gap-2 hidden sm:flex">
      <Settings className="h-4 w-4" />
      Admin
    </Button>
  </Link>
)}
```

---

## Bug 5 — Username Vazio para Owner

### Sintoma
O profile do owner (`fotografoandresouza@gmail.com`) tinha `username: ""`, o que causaria exibição incorreta no `ProfileHeaderButton` e no perfil público.

### Correção Aplicada
Atualizado via `curl PATCH` direto no Supabase:
```
username: "andresouza"
display_name: "André Souza"
```

---

## Estado Atual do Sistema

### Supabase - Tabela `profiles`

| id | email | role | username |
|----|-------|------|---------|
| `8593b1b7-...` | fotografoandresouza@gmail.com | **owner** | andresouza |
| `3db34f79-...` | visual.signup.1773447065@example.com | student | visual.signup.1773447065 |
| `15e66c95-...` | trigger.test.1773447016842@example.com | student | trigger.test.1773447016842 |

### RLS Policies (corrigidas)

| Tabela | Policy | Status |
|--------|--------|--------|
| `profiles` | leitura pública | ✅ `using (true)` — sem recursão |
| `profiles` | usuário edita próprio | ✅ `using (auth.uid() = id)` |
| `profiles` | admin gerencia todos | ✅ `using (is_admin_user())` — SECURITY DEFINER |

### Build TypeScript
- `npm run build` — **limpo, sem erros** ✅
- Apenas aviso de chunk size (não é erro)

---

## Fluxo Funcionando Após Correções

### Login como Admin
1. `fotografoandresouza@gmail.com` faz login
2. `fetchProfile()` consulta `profiles` → retorna `role: "owner"`
3. `isAdmin = true`
4. Header mostra botão "Admin"
5. Click em "Admin" → `ProtectedRoute` com `requireAdmin` → `isAdmin=true` → permite acesso
6. `AdminLayout` carrega corretamente

### Meu Perfil
1. Usuário logado acessa `/meu-perfil`
2. `useCurrentUser()` retorna UUID do Supabase Auth
3. `useProfiles().findProfile(uuid)` → consulta `profiles` → retorna dados reais
4. `useStudents().findStudent(uuid)` → consulta `profiles` → retorna dados reais
5. Ambos não são null → perfil renderiza corretamente

### Signup (novos usuários)
1. `signUp()` no `AuthContext` cria usuário via `supabase.auth.signUp()`
2. O trigger `on_auth_user_created` na tabela `auth.users` cria automaticamente a linha em `profiles`
3. O `signUp()` também faz `upsert` na tabela `profiles` como fallback
4. Usuário tem perfil desde o primeiro acesso

---

## Problemas Restantes (Não Críticos)

1. **`useCertificates.ts`** ainda usa localStorage + mock data (`src/data/mock-certificates.ts`) em vez do Supabase. Não bloqueia funcionalidade atual mas deve ser migrado para Supabase (`earned_certificates` e `certificate_templates` tabelas existem no schema).

2. **`useQuizAttempts.ts`** usa localStorage em vez da tabela `quiz_attempts` no Supabase.

3. **`useCommunityLastSeen.ts`** usa localStorage — este é aceitável pois é dado local de UX.

4. **Chunk size warning** em `index-*.js` (840KB gzip: 233KB). Considerar code splitting adicional.

5. **Dados de teste** no banco: `visual.signup.1773447065@example.com` e `trigger.test.1773447016842@example.com` são usuários de teste. Podem ser removidos do Supabase Auth quando necessário.

---

## Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/migrations/20260330000425_fix_rls_infinite_recursion.sql` | NOVO | Corrige RLS infinita + popula perfis faltantes |
| `supabase/migrations/001_initial_schema.sql` | ATUALIZADO | Sincronizado com novo estado (is_admin_user + política corrigida) |
| `src/components/layout/StudentLayout.tsx` | ATUALIZADO | Botão Admin só visível para isAdmin=true |
