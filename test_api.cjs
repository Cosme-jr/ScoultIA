
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Carregar .env manualmente para o teste
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VITE_FOOTBALL_API_KEY=(.*)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!API_KEY) {
  console.error('API Key não encontrada no .env');
  process.exit(1);
}

const API_BASE_URL = 'https://v3.football.api-sports.io'; // Sem proxy para o teste direto se possível, ou usa o proxy se estiver no browser. Aqui no terminal vamos direto.

const testSearch = async (name, season) => {
  console.log(`Testando: ${name} em ${season}...`);
  try {
    const res = await axios.get(`${API_BASE_URL}/players`, {
      params: { search: name, season: season },
      headers: { 'x-apisports-key': API_KEY }
    });
    console.log(`Status: ${res.status}`);
    console.log(`Resultados encontrados: ${res.data?.response?.length || 0}`);
    if (res.data?.response?.length > 0) {
      console.log(`Primeiro resultado: ${res.data.response[0].player.name}`);
    }
    if (res.data?.errors && Object.keys(res.data.errors).length > 0) {
      console.log('Erros:', res.data.errors);
    }
  } catch (err) {
    console.error(`Erro: ${err.message}`);
  }
};

const run = async () => {
  await testSearch('Vinicius', 2024); // Antigo
  await testSearch('Vinicius', 2025); // Novo (Provável Europa)
  await testSearch('Vinicius', 2026); // Novo (Provável Brasil)
};

run();
