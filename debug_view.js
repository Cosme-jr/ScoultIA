import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function debug() {
  console.log('--- Profissionais (Arrascaeta) ---');
  const { data: pData, error: pError } = await supabase
    .from('profissionais')
    .select('nome, total_gols, total_assistencias, total_scouts, media_tecnica')
    .eq('api_external_id', 2612)
    .maybeSingle();
  
  if (pError) console.error('P Error:', pError.message);
  else console.log('Profissional:', pData);

  console.log('\n--- Ranking View (Arrascaeta) ---');
  const { data: rData, error: rError } = await supabase
    .from('v_ranking_plantel')
    .select('nome, total_gols, total_assistencias, total_scouts, media_tecnica')
    .eq('nome', 'G. de Arrascaeta')
    .maybeSingle();

  if (rError) console.error('R Error:', rError.message);
  else console.log('Ranking View:', rData);

  console.log('\n--- Scouts Check ---');
  const { data: sData, error: sError } = await supabase
    .from('scouts')
    .select('*')
    .eq('nome_atleta', 'G. de Arrascaeta') // Guessing column name
    .limit(1);

  if (sError) console.log('Scouts table might be named differently or inaccessible:', sError.message);
  else console.log('Scouts found:', sData.length > 0);
}

debug();
