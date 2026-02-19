import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function diagnose() {
  console.log('--- Checking Arrascaeta (ID: 2612) ---');
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('api_external_id', 2612);

  if (error) {
    console.error('Error fetching Arrascaeta:', error.message);
  } else {
    console.log('Arrascaeta data:', data);
    if (data.length === 0) {
      console.log('Record NOT FOUND by api_external_id (number)');
      const { data: sData } = await supabase.from('profissionais').select('*').eq('api_external_id', '2612');
      console.log('Record found by api_external_id (string)?', sData.length > 0);
    }
  }

  console.log('\n--- Checking Table Columns ---');
  // Attempt to get one record to see keys
  const { data: sample } = await supabase.from('profissionais').select('*').limit(1);
  if (sample && sample[0]) {
    console.log('Columns:', Object.keys(sample[0]));
    console.log('Sample data types:', Object.fromEntries(Object.entries(sample[0]).map(([k, v]) => [k, typeof v])));
  }

  console.log('\n--- Checking RLS / Session ---');
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current Session:', session ? 'Authenticated' : 'Anonymous');
}

diagnose();
