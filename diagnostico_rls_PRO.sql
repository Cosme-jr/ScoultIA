-- =========================================================
-- DIAGNÓSTICO EXAUSTIVO DE RLS - TABELA PROFISSIONAIS
-- =========================================================

-- 1️⃣ VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
  c.relname AS table_name, 
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'profissionais'
AND n.nspname = 'public';

-- 2️⃣ LISTAR POLÍTICAS COM DEFINIÇÃO DETALHADA
SELECT 
  policyname, 
  cmd, 
  roles, 
  qual AS using_expression, 
  with_check
FROM pg_policies 
WHERE tablename = 'profissionais';

-- 3️⃣ ESTRUTURA DA TABELA (COLUNAS E TIPOS)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profissionais'
ORDER BY ordinal_position;

-- 4️⃣ VERIFICAR COLUNAS DE VÍNCULO/PROPRIEDADE
-- (Filtro manual baseado no resultado acima: clube_id, user_id, etc.)


-- =========================================================
-- PASSO 5: APLICAR POLÍTICA DE DEBUG (REMOVER BLOQUEIO DO USING/WITH CHECK)
-- Objetivo: Confirmar se o erro 42501 desaparece ao abrir o USING.
-- =========================================================

-- Remover políticas conhecidas que possam estar bloqueando o UPDATE
DROP POLICY IF EXISTS "Authenticated update profissionais" ON profissionais;
DROP POLICY IF EXISTS "dev_update_profissionais" ON profissionais;
DROP POLICY IF EXISTS "debug_update_profissionais" ON profissionais;

-- Criar política de DEBUG total para UPDATE
CREATE POLICY "debug_update_profissionais"
ON profissionais
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir que INSERT também esteja aberto para UPSERT completo
DROP POLICY IF EXISTS "Authenticated insert profissionais" ON profissionais;
DROP POLICY IF EXISTS "dev_insert_profissionais" ON profissionais;
DROP POLICY IF EXISTS "debug_insert_profissionais" ON profissionais;

CREATE POLICY "debug_insert_profissionais"
ON profissionais
FOR INSERT
TO authenticated
WITH CHECK (true);


-- =========================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Execute as queries 1, 2 e 3 para coletar os metadados.
-- 2. Aplique o bloco 5 (DROP + CREATE).
-- 3. Tente rodar a sincronização (UPSERT) novamente no Dashboard.
-- =========================================================
