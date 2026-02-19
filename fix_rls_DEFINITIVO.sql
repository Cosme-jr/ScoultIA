-- =========================================================
-- SOLUÇÃO DEFINITIVA: RLS PARA UPSERT (ERROR 42501)
-- =========================================================

-- 1. Garantir que as políticas de UPDATE e INSERT existam para usuários autenticados
-- Justificativa: UPSERT primeiro tenta um INSERT; se houver conflito de chave única, 
-- o Supabase executa um UPDATE. Sem a política de UPDATE, o erro 42501 ocorre.

-- Limpeza de políticas antigas/conflitantes
DROP POLICY IF EXISTS "Authenticated update profissionais" ON profissionais;
DROP POLICY IF EXISTS "Authenticated insert profissionais" ON profissionais;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON profissionais;

-- 2. Criar Política de UPDATE (Obrigatória para conflitos de UPSERT)
CREATE POLICY "Authenticated update profissionais"
ON profissionais
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Criar Política de INSERT (Obrigatória para novos registros)
CREATE POLICY "Authenticated insert profissionais"
ON profissionais
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Garantir Leitura Pública (Para o Ranking funcionar)
DROP POLICY IF EXISTS "Leitura pública do ranking" ON profissionais;
CREATE POLICY "Leitura pública do ranking"
ON profissionais
FOR SELECT
TO public
USING (true);

-- 5. Repetir lógica para a tabela CLUBES (evita falha na criação de novos times)
DROP POLICY IF EXISTS "Authenticated update clubes" ON clubes;
DROP POLICY IF EXISTS "Authenticated insert clubes" ON clubes;

CREATE POLICY "Authenticated update clubes" ON clubes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated insert clubes" ON clubes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Leitura pública de clubes" ON clubes FOR SELECT TO public USING (true);

-- =========================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO:
-- Rode a query abaixo para confirmar se as políticas foram criadas:
-- SELECT * FROM pg_policies WHERE tablename IN ('profissionais', 'clubes');
-- =========================================================
