import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function checkAndValidate() {
  try {
    console.log('--- [PASSO 1: Identificar Role] ---');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Sessão Ativa:', session ? 'SIM' : 'NÃO');
    console.log('Role atual:', session?.user?.role || 'anon');

    console.log('\n--- [PASSO 2: Validar Bloqueio de UPDATE (UPSERT)] ---');
    console.log('Tentando UPDATE em Arrascaeta (ID: 2612)...');
    
    const { data, error } = await supabase
      .from('profissionais')
      .update({ total_gols: 12 })
      .eq('api_external_id', 2612)
      .select();

    if (error) {
      console.log('ERRO NO UPDATE:', error.message);
    } else {
      console.log('UPDATE Concluído! Afetou:', data?.length, 'linhas');
    }

    console.log('\n--- [PASSO 3: Validar Dados Atuais] ---');
    const { data: atletas } = await supabase
      .from('profissionais')
      .select('nome, total_gols, total_assistencias, api_external_id')
      .in('api_external_id', [2612, 276]);
    
    console.log('Resultados no Banco:', atletas);
    process.exit(0);
  } catch (err) {
    console.error('Falha no script:', err);
    process.exit(1);
  }
}

checkAndValidate();
