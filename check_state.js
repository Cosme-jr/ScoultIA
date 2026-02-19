import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mxrldzicvfmzyxaoayzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cmxkemljdmZtenl4YW9heXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjg0NDksImV4cCI6MjA4NjYwNDQ0OX0.lXotyKa_M5iCdr_G_pl08pvntIsVMkh0LrWwccjLyLI'
);

async function check() {
    console.log('--- Checking v_ranking_plantel data ---');
    const { data: ranking } = await supabase.from('v_ranking_plantel').select('*');
    ranking.forEach(r => {
        console.log(`Atleta: ${r.nome}, IA: ${(( (r.media_tecnica || 0) + (r.media_tatica || 0) + (r.media_fisica || 0) + (r.media_psicologica || 0) ) / 4).toFixed(1)}, Gols: ${r.total_gols}`);
    });

    console.log('\n--- Checking scouts table ---');
    const { count, error } = await supabase.from('scouts').select('*', { count: 'exact', head: true });
    if (error) console.log('Scouts table error:', error.message);
    else console.log('Scouts count:', count);

    console.log('\n--- Checking for duplicates in profissionais ---');
    const { data: profs } = await supabase.from('profissionais').select('id, nome, api_external_id');
    profs.forEach(p => {
        console.log(`Prof: ${p.nome}, ID: ${p.id}, API_ID: ${p.api_external_id}`);
    });
}

check();
