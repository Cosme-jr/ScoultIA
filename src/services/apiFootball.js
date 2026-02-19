import { supabase } from '../lib/supabaseClient';
import axios from 'axios';

const API_FOOTBALL_KEY = import.meta.env.VITE_FOOTBALL_API_KEY;
const API_BASE_URL = 'https://cors-anywhere.herokuapp.com/https://v3.football.api-sports.io';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-apisports-key': API_FOOTBALL_KEY
    // Removido o x-rapidapi-host para usar o padrão direto da API-Sports
  }
});

// Função de Proxy com Cache Inteligente
export const fetchWithCache = async (endpoint, params = {}, ttlHours = 24, forceRefresh = false) => {
  if (!API_FOOTBALL_KEY) {
    console.error('CRITICAL: VITE_FOOTBALL_API_KEY is missing in .env');
  }

  const queryKey = `${endpoint}_${JSON.stringify(params)}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .substring(0, 255);

  // 1. Tentar buscar no cache do Supabase (< 24h) - Apenas se NÃO for forceRefresh
  if (!forceRefresh) {
    try {
      const { data: cached } = await supabase
        .from('api_football_cache')
        .select('*')
        .eq('query_key', queryKey)
        .maybeSingle();

      if (cached && (new Date() - new Date(cached.updated_at) < ttlHours * 60 * 60 * 1000)) {
        const finalData = cached.data?.response || cached.data;
        const dataArray = Array.isArray(finalData) ? finalData : [];
        
        if (dataArray.length > 0) {
          console.log(`[Cache HIT] ${queryKey}`);
          return dataArray;
        }
      }
    } catch (cacheError) {
      console.warn(`[Supabase Cache Bypass] Erro:`, cacheError.message);
    }
  } else {
    console.log(`[Cache BYPASS] Forçando atualização para ${queryKey}`);
  }

  // 2. Cache MISS ou falha no DB ou forceRefresh: Fazer a requisição oficial
  // ... (rest of the function stays same)
  try {
    const finalParams = { ...params };
    
    console.log(`[API REQUEST] ${endpoint}`, finalParams);
    const response = await api.get(endpoint, { params: finalParams });
    
    const result = response.data?.response || [];
    
    // 3. Salvar/Atualizar no banco
    if (result && Array.isArray(result) && result.length > 0) {
      (async () => {
        const { error: storeError } = await supabase.from('api_football_cache').upsert({
          query_key: queryKey,
          data: result,
          updated_at: new Date().toISOString()
        }, { onConflict: 'query_key' });
        if (storeError) console.warn('[Supabase Cache Store Fail] Erro:', storeError.message);
      })();
    }

    return result;
  } catch (apiError) {
    console.error(`Erro crítico na API (${endpoint}):`, apiError.message);
    throw apiError;
  }
};

// Auxiliar: Normalizar nome (remover acentos)
const normalizeName = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const searchAthlete = async (name, leagueId = null) => {
  try {
    const DEFAULT_SEASON = 2024;
    const cleanName = normalizeName(name);

    console.log(`[Busca Inteligente] Iniciando busca para "${cleanName}"...`);
    
    // 1. Prioridade Máxima: Usar League ID se selecionado
    if (leagueId && leagueId !== 'global') {
       console.log(`[Busca Inteligente] Buscando especificamente na Liga: ${leagueId}`);
       return await fetchWithCache('/players', { 
         search: cleanName, 
         season: DEFAULT_SEASON,
         league: leagueId
       });
    }

    // 2. Fallback Inteligente: Evitar "Busca Global" (sem league) pois costuma falhar/ser bloqueada por falta de filtros.
    // Em vez disso, tentamos em ligas principais se nada foi selecionado.
    console.log(`[Busca Inteligente] Sem liga específica. Tentando ligas principais...`);
    const mainLeagues = [71, 307, 39]; // Brasil, Arábia, Premier
    
    for (const id of mainLeagues) {
      console.log(`[Busca Inteligente] Tentando Liga ${id}...`);
      const results = await fetchWithCache('/players', { 
        search: cleanName, 
        season: DEFAULT_SEASON,
        league: id
      });
      if (Array.isArray(results) && results.length > 0) {
        return results;
      }
    }

    console.warn(`[Busca Inteligente] Nenhuma informação encontrada para "${cleanName}".`);
    return [];
  } catch (error) {
    console.error('[Busca Inteligente] Erro crítico na busca:', error.message);
    return [];
  }
};

export const getAthleteStats = async (athleteId, season = 2025) => {
  try {
    const stats = await fetchWithCache('/players', { id: athleteId, season });
    const injuries = await fetchWithCache('/players/injuries', { player: athleteId });
    const transfers = await fetchWithCache('/transfers', { player: athleteId });

    return { 
      stats: Array.isArray(stats) ? stats[0] : stats, 
      injuries: Array.isArray(injuries) ? injuries : [],
      transfers: Array.isArray(transfers) ? transfers[0]?.transfers || [] : []
    };
  } catch (error) {
    return { stats: null, injuries: [], transfers: [], error: error.message };
  }
};

export const syncAthleteStats = async (athleteId, season = 2024, forceRefresh = false) => {
  try {
    const response = await fetchWithCache('/players', { id: athleteId, season }, 24, forceRefresh);
    if (!response || response.length === 0) return null;

    const player = response[0];
    const allStats = player.statistics || [];

    // Agregando estatísticas de todas as competições na temporada
    const aggregated = allStats.reduce((acc, stat, idx) => {
      const g = stat.goals?.total || 0;
      const a = stat.goals?.assists || 0;
      const app = stat.games?.appearences || 0;
      const rStr = stat.games?.rating;
      const r = parseFloat(rStr) || 0;

      console.log(`[API Aggregation] Compra ${idx}: ${stat.league?.name} -> G: ${g}, A: ${a}, P: ${app}, R: ${r}`);

      acc.goals += g;
      acc.assists += a;
      acc.appearences += app;
      
      if (r > 0) acc.ratings.push(r);
      return acc;
    }, { goals: 0, assists: 0, appearences: 0, ratings: [] });

    const avgRating = aggregated.ratings.length > 0 
      ? aggregated.ratings.reduce((a, b) => a + b, 0) / aggregated.ratings.length 
      : 0;

    const result = {
      api_external_id: player.player.id,
      nome: player.player.name,
      foto: player.player.photo,
      time_atual: allStats[0]?.team?.name || 'Sem Clube',
      nacionalidade: player.player.nationality,
      idade: player.player.age,
      goals: aggregated.goals,
      assists: aggregated.assists,
      appearences: aggregated.appearences,
      rating: avgRating
    };

    console.log(`[API Sync Result] Final para ${player.player.name}:`, result);
    return result;
  } catch (error) {
    console.error(`[API Sync] Erro ao sincronizar atleta ${athleteId}:`, error.message);
    return null;
  }
};
