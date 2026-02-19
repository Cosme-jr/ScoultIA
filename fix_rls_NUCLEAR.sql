-- =========================================================
-- OPERAÇÃO NUCLEAR: LIMPEZA TOTAL E POLÍTICAS DEV (RLS)
-- Tabela: profissionais
-- =========================================================

-- 1️⃣ LISTAR POLÍTICAS ATUAIS (Para auditoria antes de apagar)
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profissionais';

-- 2️⃣ REMOVER TODAS AS POLÍTICAS EXISTENTES
-- Este bloco anônimo percorre e deleta qualquer política na tabela
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'profissionais'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profissionais;', r.policyname);
  END LOOP;
END $$;

-- 3️⃣ CRIAR POLÍTICAS DEV (TOTALMENTE ABERTAS PARA AUTHENTICATED)
-- Garantia de que UPSERT (INSERT + UPDATE) funcionará sem bloqueios
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

-- Permissões completas para ROLE: authenticated
CREATE POLICY "dev_select_profissionais"
ON profissionais
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "dev_insert_profissionais"
ON profissionais
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "dev_update_profissionais"
ON profissionais
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "dev_delete_profissionais"
ON profissionais
FOR DELETE
TO authenticated
USING (true);

-- 4️⃣ REPETIR OPERAÇÃO PARA TABELA CLUBES (Caso o erro migre para lá)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'clubes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clubes;', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "dev_clubes_full_auth"
ON clubes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "dev_clubes_select_public"
ON clubes
FOR SELECT
TO public
USING (true);


-- 5️⃣ VALIDAR ESTADO FINAL
SELECT * FROM pg_policies WHERE tablename IN ('profissionais', 'clubes');
