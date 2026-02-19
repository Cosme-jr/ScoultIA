-- =========================================================
-- DIAGNÓSTICO DE POLÍTICAS ATUAIS
-- =========================================================
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'profissionais';

-- =========================================================
-- SCRIPT DE CORREÇÃO PARA UPSERT (INSERT + UPDATE)
-- =========================================================

-- 1. Remover políticas que podem estar em conflito
DROP POLICY IF EXISTS "Authenticated insert profissionais" ON profissionais;
DROP POLICY IF EXISTS "Authenticated update profissionais" ON profissionais;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON profissionais;

-- 2. Criar Política de INSERT (Para novos registros)
CREATE POLICY "Authenticated insert profissionais"
ON profissionais
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Criar Política de UPDATE (CRUCIAL para UPSERT em registros existentes)
-- O UPSERT tenta UPDATE quando encontra conflito de chave única (api_external_id)
CREATE POLICY "Authenticated update profissionais"
ON profissionais
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Garantir que a leitura (SELECT) continue pública se necessário
-- (Se já houver uma policy de SELECT public, não precisa repetir)
-- DROP POLICY IF EXISTS "Leitura pública do ranking" ON profissionais;
-- CREATE POLICY "Leitura pública do ranking" ON profissionais FOR SELECT TO public USING (true);

-- =========================================================
-- OBSERVAÇÃO IMPORTANTE:
-- Se o log "[Sync Auth Debug] Role" no console mostrar 'anon', 
-- você precisará estar logado no sistema para que estas políticas 
-- funcionem, OU alterar 'TO authenticated' para 'TO public' 
-- (menos seguro, mas funcional para testes).
-- =========================================================
