import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { syncAthleteStats } from '../services/apiFootball';
import { Trophy, TrendingUp, Users, Target, Activity, Plus, Loader2, Search, Filter, EyeOff, Eye, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [kpis, setKpis] = useState({
    total: 0,
    avgPerformance: 0,
    medicalDept: 0,
    highlight: 'N/A'
  });
  const [selectedSeason, setSelectedSeason] = useState(2024);
    
  const handleGlobalSync = async () => {
    try {
      setSyncing(true);
      console.log('[Sync] Iniciando sincronização global...');

      // Diagnóstico de Autenticação para RLS
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Sync Auth Debug] Sessão ativa:', session ? 'SIM' : 'NÃO');
      console.log('[Sync Auth Debug] Role:', session?.user?.role || 'anon');

      // 1. Buscar atletas atuais cadastrados
      const { data: atletas, error: fetchError } = await supabase
        .from('profissionais')
        .select('id, api_external_id, nome');

      if (fetchError) throw fetchError;

      console.log(`[Sync] Sincronizando ${atletas.length} atletas em paralelo...`);
      
      await Promise.all(atletas.map(async (atleta) => {
        if (!atleta.api_external_id) return;
        
        try {
          // Busca dados agregados e atualiza o banco de dados automaticamente
          // Passando atleta.id como quarto parâmetro para disparar o UPDATE no apiFootball.js
          const stats = await syncAthleteStats(atleta.api_external_id, selectedSeason, true, atleta.id);
          
          if (stats) {
            // --- BLOCO: Garantir clube_id (Resolvendo Erro 23502) ---
            // Mantemos aqui pois envolve lógica de descoberta/criação de clubes no DB local
            const clubName = stats.time_atual || 'Sem Clube';
            let finalClubeId = null;

            const { data: existingClub } = await supabase
              .from('clubes')
              .select('id')
              .eq('nome', clubName)
              .maybeSingle();

            if (existingClub) {
              finalClubeId = existingClub.id;
            } else {
              const { data: newClub, error: clubError } = await supabase
                .from('clubes')
                .insert({ nome: clubName })
                .select('id')
                .single();

              if (!clubError && newClub) {
                finalClubeId = newClub.id;
              }
            }

            // Atualização do clube_id (o restante dos dados já foi atualizado pelo syncAthleteStats)
            if (finalClubeId) {
              await supabase
                .from('profissionais')
                .update({ clube_id: finalClubeId })
                .eq('id', atleta.id);
            }

            console.log(`[Sync Success] Atleta ${atleta.nome} sincronizado e clube atualizado.`);
          }
        } catch (err) {
          console.error(`[Sync Task Error] Erro ao processar ${atleta.nome}:`, err.message);
        }
      }));

      console.log('[Sync] Processo finalizado. Atualizando ranking...');
      await fetchRanking();
      alert('Dashboard Atualizado! Os dados reais agregados já estão na tela.');
    } catch (error) {
      console.error('[Sync Global Error] Falha crítica:', error.message);
      alert('Houve um erro na sincronização. Verifique o console.');
    } finally {
      setSyncing(false);
    }
  };
  
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState('Todos');
  const [gradeFilter, setGradeFilter] = useState('0');
  const [hideMedical, setHideMedical] = useState(false);
  const [injuredIds, setInjuredIds] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRanking();
  }, []);

  const calculateMetrics = async (data) => {
    if (!data || data.length === 0) return;

    const total = data.length;
    const avg = data.reduce((acc, a) => {
      const athleteAvg = (
        (Number(a.media_tecnica) || 0) + 
        (Number(a.media_tatica) || 0) + 
        (Number(a.media_fisica) || 0) + 
        (Number(a.media_psicologica) || 0)
      ) / 4;
      return acc + athleteAvg;
    }, 0) / total;

    const best = [...data].sort((a, b) => (b.media_tecnica || 0) - (a.media_tecnica || 0))[0];

    // Departamento Médico (Extração de IDs do Cache)
    let medicalCount = 0;
    let mIds = [];
    try {
      const { data: cacheData } = await supabase
        .from('api_football_cache')
        .select('query_key, data')
        .like('query_key', '%_players_injuries%');
      
      if (cacheData) {
        cacheData.forEach(c => {
          const injuries = Array.isArray(c.data) ? c.data : [];
          const activeInjuries = injuries.filter(inj => !inj.fixture && (!inj.end || new Date(inj.end) > new Date()));
          
          if (activeInjuries.length > 0) {
            // Extrair ID do query_key (ex: _players_injuries___player__1234_)
            const match = c.query_key.match(/player__(\d+)/);
            if (match) mIds.push(parseInt(match[1]));
          }
        });
        mIds = [...new Set(mIds)]; // Uniq IDs
        medicalCount = mIds.length;
      }
    } catch (e) {
      console.error('Erro ao buscar DM:', e);
    }

    setInjuredIds(mIds);
    setKpis({
      total,
      avgPerformance: avg.toFixed(1),
      medicalDept: medicalCount,
      highlight: best ? best.nome : 'N/A'
    });
  };

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_ranking_plantel')
        .select('*');

      if (error) throw error;
    
    // Log de Auditoria para verificar chegada de dados do Supabase
    if (data && data.length > 0) {
      console.log('Dados do Banco (v_ranking_plantel):', data[0]);
    }
    
    setRanking(data || []);
      await calculateMetrics(data || []);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAtleta = async (id, nome) => {
    const confirmDelete = window.confirm(`Deseja realmente excluir o atleta ${nome} do plantel? Esta ação também removerá todos os relatórios vinculados a ele.`);
    
    if (!confirmDelete) return;

    try {
      setSyncing(true); // Reutilizando estado de loading para feedback
      
      // 1. Deletar dependências (relatórios de campo)
      const { error: errorRelatorios } = await supabase
        .from('relatorios_campo')
        .delete()
        .eq('profissional_id', id);

      if (errorRelatorios) throw errorRelatorios;

      // 2. Deletar o atleta
      const { error: errorAtleta } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', id);

      if (errorAtleta) throw errorAtleta;

      // 3. Feedback Instantâneo: Atualizar estado local
      setRanking(prev => prev.filter(atleta => (atleta.id || atleta.profissional_id) !== id));
      
      // Recalcular métricas após a remoção
      const newRanking = ranking.filter(atleta => (atleta.id || atleta.profissional_id) !== id);
      await calculateMetrics(newRanking);

      alert(`Atleta ${nome} removido com sucesso.`);
    } catch (error) {
      console.error('Erro ao deletar atleta:', error.message);
      alert('Erro ao excluir atleta. Verifique o console.');
    } finally {
      setSyncing(false);
    }
  };

  // Lógica de Filtro Computada (Instatânea)
  const filteredRanking = useMemo(() => {
    return ranking.filter(atleta => {
      // 1. Busca por Nome
      const matchesSearch = atleta.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filtro de Posição (Normalizando ATA, MEI, etc.)
      const posMap = {
        'GOL': ['Goleiro', 'Goalkeeper', 'GOL'],
        'DEF': ['Defensor', 'Defender', 'DEF', 'Zagueiro', 'Lateral'],
        'MEI': ['Meia', 'Midfielder', 'MEI', 'Volante'],
        'ATA': ['Atacante', 'Attacker', 'ATA', 'Ponta']
      };
      const matchesPos = posFilter === 'Todos' || 
        (posMap[posFilter]?.some(p => atleta.posicao?.includes(p)));

      // 3. Filtro de Nota IA (Média Geral)
      const avgPerf = (
        (Number(atleta.media_tecnica) || 0) + 
        (Number(atleta.media_tatica) || 0) + 
        (Number(atleta.media_fisica) || 0) + 
        (Number(atleta.media_psicologica) || 0)
      ) / 4;
      const matchesGrade = avgPerf >= parseFloat(gradeFilter);

      // 4. Filtro de DM
      const isInjured = injuredIds.includes(atleta.api_external_id);
      const matchesMedical = !hideMedical || !isInjured;

      return matchesSearch && matchesPos && matchesGrade && matchesMedical;
    });
  }, [ranking, searchTerm, posFilter, gradeFilter, hideMedical, injuredIds]);

  return (
    <div className="font-['JetBrains_Mono']">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-['Bebas_Neue'] text-primary tracking-wider mb-2">
            INTELLIGENCE <span className="text-white/20">DASHBOARD</span>
          </h1>
          <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.4em]">Análise de Performance • ScoultIA Pro</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Temporada:</span>
            <select 
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-transparent text-[10px] font-bold text-primary focus:outline-none appearance-none cursor-pointer"
            >
              {[2024, 2023, 2022, 2021, 2020].map(s => (
                <option key={s} value={s} className="bg-[#0b111b]">{s}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleGlobalSync}
            disabled={loading || syncing}
            className="flex items-center gap-2 text-[10px] font-black py-4 px-8 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/30 transition-all uppercase tracking-widest"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : 'Sincronizar Dados'}
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Plantel', value: kpis.total, icon: Users, color: 'text-primary' },
          { label: 'Média Performance', value: kpis.avgPerformance, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Depto Médico', value: kpis.medicalDept, icon: Activity, color: 'text-red-400' },
          { label: 'Destaque Mês', value: kpis.highlight, icon: Trophy, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] flex items-center gap-6 relative overflow-hidden group hover:border-primary/20 transition-all">
            <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon size={28} />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold truncate leading-tight" title={stat.value}>{stat.value}</p>
            </div>
            <div className={`absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity`}>
               <stat.icon size={100} />
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl mb-8 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex-1 min-w-[300px] relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome do atleta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs focus:outline-none focus:border-primary/40 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Posição:</span>
            <select 
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 focus:outline-none focus:border-primary/40 appearance-none min-w-[100px]"
            >
              {['Todos', 'GOL', 'DEF', 'MEI', 'ATA'].map(opt => <option key={opt} value={opt} className="bg-[#0b111b]">{opt}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Nota IA:</span>
            <select 
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 focus:outline-none focus:border-primary/40 appearance-none min-w-[100px]"
            >
              <option value="0" className="bg-[#0b111b]">Todas</option>
              <option value="7" className="bg-[#0b111b]">{'>'} 7.0</option>
              <option value="8" className="bg-[#0b111b]">{'>'} 8.0</option>
              <option value="9" className="bg-[#0b111b]">{'>'} 9.0</option>
            </select>
          </div>

          <button 
            onClick={() => setHideMedical(!hideMedical)}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-[10px] font-bold uppercase
              ${hideMedical 
                ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}
            `}
          >
            {hideMedical ? <EyeOff size={14} /> : <Eye size={14} />}
            {hideMedical ? 'Filtro DM Ativo' : 'Esconder DM'}
          </button>
        </div>
      </div>

      {/* Ranking Table Section */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
             <Filter className="text-primary" size={18} />
             <h2 className="text-xl font-bold uppercase tracking-tight">Ranking de Plantel</h2>
             <span className="ml-4 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase">
                Temporada {selectedSeason}
              </span>
             <span className="ml-2 px-3 py-1 bg-white/5 rounded-lg text-[10px] text-gray-500 font-bold uppercase">
               {filteredRanking.length} Atletas encontrados
             </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead>
              <tr className="bg-white/5 text-gray-500 uppercase text-[10px] tracking-widest font-black">
                <th className="px-8 py-6">Posc</th>
                <th className="px-8 py-6">Atleta</th>
                <th className="px-8 py-6">Posição</th>
                <th className="px-8 py-6 text-center">Jogos</th>
                <th className="px-8 py-6 text-center">Gols</th>
                <th className="px-8 py-6 text-center">Assist</th>
                <th className="px-8 py-6 text-center">🟨</th>
                <th className="px-8 py-6 text-center">🟥</th>
                <th className="px-8 py-6 text-center">Desarmes</th>
                <th className="px-8 py-6 text-right">Média IA</th>
                <th className="px-8 py-6 text-center sticky right-0 bg-[#0b111b] border-l border-white/10 z-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-8 py-20 text-center text-gray-600 italic">
                    <div className="flex flex-col items-center">
                      <Loader2 size={32} className="animate-spin mb-4 opacity-20" />
                      <span>Processando inteligência de plantel...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRanking.length > 0 ? (
                filteredRanking.map((atleta, index) => {
                  const isInjured = injuredIds.includes(atleta.api_external_id);
                  const itemStyle = index < 3 ? 'bg-primary text-dark shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'bg-white/5 text-gray-500';
                  
                  return (
                    <tr key={atleta.id || index} className="hover:bg-white/[0.04] transition-colors group">
                      <td className="px-8 py-6">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${itemStyle}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div 
                          className="flex items-center gap-4 cursor-pointer group/atleta"
                          onClick={() => navigate(`/performance/${atleta.id || atleta.profissional_id}`)}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center text-[11px] font-bold border border-white/5 group-hover/atleta:border-primary/40 transition-all">
                              {atleta.nome?.substring(0, 2).toUpperCase()}
                            </div>
                            {isInjured && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#0b111b] flex items-center justify-center">
                                <Activity size={8} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-200 group-hover/atleta:text-primary transition-colors block leading-none mb-1">
                              {atleta.nome}
                            </span>
                            {isInjured && <span className="text-[8px] text-red-500 uppercase font-black">No Depto Médico</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-gray-400 font-bold text-xs uppercase">{atleta.posicao || 'N/A'}</td>
                      <td className="px-8 py-6 text-center font-bold text-xs text-gray-500">{atleta.total_scouts || 0}</td>
                      <td className="px-8 py-6 text-center font-bold text-xs text-gray-500">{atleta.total_gols || 0}</td>
                      <td className="px-8 py-6 text-center font-bold text-xs text-gray-500">{atleta.total_assistencias || 0}</td>
                      <td className="px-8 py-6 text-center font-bold text-xs text-yellow-500/80">{atleta.cartoes_amarelos || 0}</td>
                      <td className="px-8 py-6 text-center font-bold text-xs text-red-500/80">{atleta.cartoes_vermelhos || 0}</td>
                      <td className="px-8 py-6 text-center font-bold text-xs text-blue-400/80">{atleta.desarmes || 0}</td>
                      <td className="px-8 py-6 text-right leading-none">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-2xl font-['Bebas_Neue'] text-primary tracking-widest">
                            {((
                              (Number(atleta.media_tecnica) || 0) + 
                              (Number(atleta.media_tatica) || 0) + 
                              (Number(atleta.media_fisica) || 0) + 
                              (Number(atleta.media_psicologica) || 0)
                            ) / 4).toFixed(1)}
                          </span>
                          <div className="w-20 h-1.5 bg-white/5 mt-1.5 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-primary shadow-[0_0_10px_rgba(0,212,255,0.8)] transition-all duration-1000" 
                               style={{ width: `${((
                                 (Number(atleta.media_tecnica) || 0) + 
                                 (Number(atleta.media_tatica) || 0) + 
                                 (Number(atleta.media_fisica) || 0) + 
                                 (Number(atleta.media_psicologica) || 0)
                               ) / 4) * 10}%` }}
                             />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center sticky right-0 bg-[#0b111b] border-l border-white/10 z-10 group-hover:bg-[#161d27] transition-colors">
                        <button
                          onClick={() => handleDeleteAtleta(atleta.id || atleta.profissional_id, atleta.nome)}
                          disabled={syncing}
                          className="p-3 bg-red-500 text-white rounded-xl border border-red-500/50 hover:bg-red-600 transition-all flex items-center justify-center mx-auto shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                          title="Excluir Atleta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="px-8 py-32 text-center text-gray-500">
                    <Filter size={48} className="mx-auto mb-4 opacity-5" />
                    <p className="font-bold uppercase tracking-widest text-sm">Nenhum atleta corresponde aos filtros aplicados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
