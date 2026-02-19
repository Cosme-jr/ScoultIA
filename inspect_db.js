import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function inspect() {
  console.log('--- Inspecting profissionais ---');
  const { data: pData, error: pErr } = await supabase.from('profissionais').select('*').limit(1);
  if (pErr) console.error('Error p:', pErr.message);
  else console.log('profissionais columns:', Object.keys(pData[0] || {}));

  console.log('\n--- Inspecting clubes ---');
  const { data: cData, error: cErr } = await supabase.from('clubes').select('*').limit(1);
  if (cErr) console.error('Error c:', cErr.message);
  else console.log('clubes columns:', Object.keys(cData[0] || {}));
}

inspect();
