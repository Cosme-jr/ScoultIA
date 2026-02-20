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

export const syncAthleteStats = async (athleteId, season = 2024, forceRefresh = false, profissionalId = null) => {
  try {
    console.log(`[API Sync] Iniciando sincronização para ID ${athleteId} na temporada ${season}...`);
    const response = await fetchWithCache('/players', { id: athleteId, season }, 24, forceRefresh);
    if (!response || response.length === 0) return null;

    const player = response[0];
    const allStats = player.statistics || [];

    // Agregando estatísticas de todas as competições na temporada
    const aggregated = allStats.reduce((acc, stat) => {
      const g = stat.goals?.total || 0;
      const a = stat.goals?.assists || 0;
      const app = stat.games?.appearences || 0;
      
      // Mapeamento exato conforme solicitado pelo Usuário
      const yellow = stat.cards?.yellow || 0;
      const red = stat.cards?.red || 0;
      const tackles = stat.tackles?.total || stat.tackles?.interceptions || 0;
      
      const rStr = stat.games?.rating;
      const r = parseFloat(rStr) || 0;

      console.log(`[Sync Debug] Competição: ${stat.league?.name}`, { yellow, red, tackles });

      acc.goals += g;
      acc.assists += a;
      acc.appearences += app;
      acc.cartoes_amarelos += yellow;
      acc.cartoes_vermelhos += red;
      acc.desarmes += tackles;
      
      if (r > 0) acc.ratings.push(r);
      return acc;
    }, { goals: 0, assists: 0, appearences: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0, desarmes: 0, ratings: [] });

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
      cartoes_amarelos: aggregated.cartoes_amarelos,
      cartoes_vermelhos: aggregated.cartoes_vermelhos,
      desarmes: aggregated.desarmes,
      rating: avgRating
    };

    console.log(`[API Sync Result] Final para ${player.player.name}:`, result);

    // Se profissionalId for fornecido, atualizamos o banco de dados diretamente
    if (profissionalId) {
      console.log(`[API Sync] Atualizando banco de dados para o profissional ID: ${profissionalId}`);
      
      const rating = Number(result.rating) || 0;
      const dbPayload = {
        foto: result.foto,
        time_atual: result.time_atual,
        nacionalidade: result.nacionalidade,
        idade: Number(result.idade),
        total_gols: Number(result.goals) || 0,
        total_assistencias: Number(result.assists) || 0,
        total_scouts: Number(result.appearences) || 0,
        cartoes_amarelos: Number(result.cartoes_amarelos) || 0,
        cartoes_vermelhos: Number(result.cartoes_vermelhos) || 0,
        desarmes: Number(result.desarmes) || 0,
        // Pilares de Performance (Cálculo padronizado do Dashboard)
        media_tecnica: Number(Number(Math.min(10, rating)).toFixed(2)),
        media_tatica: Number(Number(Math.min(10, rating * 0.9)).toFixed(2)),
        media_fisica: Number(Number(Math.min(10, rating * 0.95)).toFixed(2)),
        media_psicologica: Number(Number(Math.min(10, rating * 0.85)).toFixed(2))
      };

      const { error: updateError } = await supabase
        .from('profissionais')
        .update(dbPayload)
        .eq('id', profissionalId);

      if (updateError) {
        console.error(`[API Sync DB Error] Falha ao atualizar profissional ${profissionalId}:`, updateError.message);
      } else {
        console.log(`[API Sync DB Success] Dados reais gravados para o profissional ${profissionalId}`);
      }
    }

    return result;
  } catch (error) {
    console.error(`[API Sync] Erro ao sincronizar atleta ${athleteId}:`, error.message);
    return null;
  }
};
