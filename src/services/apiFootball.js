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
export const fetchWithCache = async (endpoint, params = {}, ttlHours = 24) => {
  if (!API_FOOTBALL_KEY) {
    console.error('CRITICAL: VITE_FOOTBALL_API_KEY is missing in .env');
  }

  const queryKey = `${endpoint}_${JSON.stringify(params)}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .substring(0, 255);

  // 1. Tentar buscar no cache do Supabase (< 24h)
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

  // 2. Cache MISS ou falha no DB: Fazer a requisição oficial
  try {
    const finalParams = { ...params };
    
    console.log(`[API REQUEST] ${endpoint}`, finalParams);
    const response = await api.get(endpoint, { params: finalParams });
    
    // Debug: Ver resposta exata da API
    if (response.data?.errors && Object.keys(response.data.errors).length > 0) {
      console.error(`[API ERROR] Erros reportados pela API-Football:`, response.data.errors);
    }

    // MAPEAMENTO: Garantir que pegamos res.data.response
    const result = response.data?.response || [];
    
    // Debug caso o retorno seja inesperado ou vazio
    if (result.length === 0) {
      console.warn(`[API EMPTY] Resposta sem resultados para ${endpoint}. Data completa:`, response.data);
    }

    // 3. Tentar salvar no banco de forma assíncrona
    if (result && Array.isArray(result) && result.length > 0) {
      (async () => {
        const { error: storeError } = await supabase.from('api_football_cache').upsert({
          query_key: queryKey,
          data: result, // Salvamos apenas o array puro
          updated_at: new Date().toISOString()
        });
        if (storeError) console.warn('[Supabase Cache Store Fail] Erro ao salvar cache:', storeError.message);
      })();
    }

    return result;
  } catch (apiError) {
    console.error(`Erro crítico na API (${endpoint}):`, apiError.message);
    if (apiError.response) {
      console.error(`Status: ${apiError.response.status}, Data:`, apiError.response.data);
    }
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

    console.log(`[Busca Inteligente] Iniciando busca para "${cleanName}" (Original: "${name}")...`);
    
    // 1. Se uma liga foi selecionada manualmente, buscar apenas nela
    if (leagueId && leagueId !== 'global') {
       console.log(`[Busca Inteligente] Buscando especificamente na Liga: ${leagueId}, Season: ${DEFAULT_SEASON}`);
       return await fetchWithCache('/players', { 
         search: cleanName, 
         season: DEFAULT_SEASON,
         league: leagueId
       });
    }

    // 2. Se for 'global' ou nada selecionado, tentar busca sem liga primeiro (pode falhar no Free, mas tentamos)
    console.log(`[Busca Inteligente] Tentando busca global (Season ${DEFAULT_SEASON})...`);
    const resultsGlobal = await fetchWithCache('/players', { 
      search: cleanName, 
      season: DEFAULT_SEASON
    });

    if (Array.isArray(resultsGlobal) && resultsGlobal.length > 0) {
      return resultsGlobal;
    }

    // 3. Fallback Automático: Tentar em ligas principais se a busca global não retornar nada
    const fallbackLeagues = [71, 307, 39]; // Brasil, Arábia, Premier
    for (const id of fallbackLeagues) {
      console.log(`[Busca Inteligente] Fallback: Tentando Liga ${id}...`);
      const results = await fetchWithCache('/players', { 
        search: cleanName, 
        season: DEFAULT_SEASON,
        league: id
      });
      if (Array.isArray(results) && results.length > 0) {
        return results;
      }
    }

    console.warn(`[Busca Inteligente] Nenhuma informação encontrada para "${cleanName}" em 2024.`);
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

