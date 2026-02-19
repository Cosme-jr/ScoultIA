-- =========================================================
-- SCRIPT DE SEGURANÇA RLS (VERSÃO PROFISSIONAL) - SCOULTIA
-- =========================================================

-- 1. Habilitar RLS em ambas as tabelas
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas existentes para evitar conflitos (Segurança em primeiro lugar)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON profissionais;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON clubes;
DROP POLICY IF EXISTS "Allow public read" ON profissionais;
DROP POLICY IF EXISTS "Allow public read" ON clubes;

-- ---------------------------------------------------------
-- TABELA: PROFISSIONAIS
-- ---------------------------------------------------------

-- POLÍTICA DE LEITURA: Pública (Qualquer um pode ver o ranking)
-- Justificativa: O dashboard é a vitrine do sistema e requer acesso anônimo.
CREATE POLICY "Leitura pública do ranking"
ON profissionais
FOR SELECT
TO public
USING (true);

-- POLÍTICA DE ESCRITA: Restrita (Apenas usuários logados podem sincronizar/editar)
-- Justificativa: Impede que bots ou usuários deslogados alterem estatísticas via API.
CREATE POLICY "Escrita restrita a administradores/autenticados"
ON profissionais
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ---------------------------------------------------------
-- TABELA: CLUBES
-- ---------------------------------------------------------

-- POLÍTICA DE LEITURA: Pública
CREATE POLICY "Leitura pública de clubes"
ON clubes
FOR SELECT
TO public
USING (true);

-- POLÍTICA DE ESCRITA: Restrita
CREATE POLICY "Criação de clubes restrita a autenticados"
ON clubes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =========================================================
-- RECOMENDAÇÕES PARA PRODUÇÃO:
-- 1. Para máxima segurança, em produção, remova as políticas de INSERT/UPDATE
--    do frontend e execute o sync via Supabase Edge Functions usando a 
--    SERVICE_ROLE_KEY (que ignora RLS e nunca vaza para o cliente).
-- 2. Se houver papéis (roles) específicos (ex: 'admin'), altere 'authenticated'
--    para uma checagem de role customizada no JWT.
-- =========================================================
