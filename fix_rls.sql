-- =========================================================
-- SCRIPT DE CORREÇÃO RLS - SCOULTIA
-- =========================================================

-- 1. Garantir que RLS está habilitado (boa prática manter ativo)
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que possam estar bloqueando (opcional)
-- DROP POLICY IF EXISTS "Allow all for authenticated" ON profissionais;
-- DROP POLICY IF EXISTS "Allow all for authenticated" ON clubes;

-- 3. Criar políticas para a tabela PROFISSIONAIS
-- Permite que qualquer usuário autenticado faça SELECT, INSERT e UPDATE
CREATE POLICY "Enable all for authenticated users" 
ON profissionais 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Criar políticas para a tabela CLUBES
-- Necessário para que a criação automática de clubes funcione durante o sync
CREATE POLICY "Enable all for authenticated users" 
ON clubes 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Caso precise de acesso público para leitura (ex: Dashboard aberto)
-- CREATE POLICY "Allow public read-only access" ON profissionais FOR SELECT USING (true);
-- CREATE POLICY "Allow public read-only access" ON clubes FOR SELECT USING (true);

-- =========================================================
-- OBSERVAÇÃO: 
-- Se você estiver usando a ANON_KEY no Frontend sem login, 
-- use 'TO anon' ou 'TO public' em vez de 'TO authenticated'.
-- =========================================================
