import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function checkRLS() {
  console.log('--- Verificando Políticas de RLS ---');
  
  // Usando rpc para consultar metadados se existir, ou rpc customizado
  // Como não sabemos os RPCs, vamos tentar rodar uma query direta via fetch se possível, 
  // mas o melhor é prover o SQL para o usuário rodar no dashboard.
  
  // No entanto, para o "Diagnóstico", vou tentar listar as tabelas e conferir se o anon permite SELECT.
  const { data, error } = await supabase.from('profissionais').select('*').limit(1);
  
  if (error) {
    if (error.code === '42501') {
      console.log('CONFIRMADO: RLS está bloqueando SELECT para ANON.');
    } else {
      console.log('Status do SELECT:', error.message);
    }
  } else {
    console.log('SELECT permitido para ANON. RLS pode estar ativo apenas para INSERT/UPDATE ou com políticas específicas.');
  }

  // Tentar um insert fake (que falhará) para ver o erro exato de policy
  const { error: insErr } = await supabase.from('profissionais').insert([{ nome: 'TESTE RLS' }]);
  if (insErr) {
    console.log('Erro no INSERT:', insErr.message);
    console.log('Detalhes:', insErr.details);
  }
}

checkRLS();
