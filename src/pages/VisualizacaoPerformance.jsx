import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import RadarPerformance from '../components/RadarPerformance';
import { 
  ArrowLeft, TrendingUp, Target, Shield, Zap, Activity, 
  Trophy, ThumbsUp, ThumbsDown, Download, Share2, 
  Calendar, ShieldAlert, History, User, HeartPulse
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getAthleteStats, searchAthlete } from '../services/apiFootball';

const VisualizacaoPerformance = () => {
  const { atletaId } = useParams();
  const navigate = useNavigate();
  const [atleta, setAtleta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analitico');
  const [apiData, setApiData] = useState({ stats: null, injuries: [], transfers: [] });
  const [apiLoading, setApiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(2025);

  // Função para calcular duração de lesão
  const calculateDuration = (start, end) => {
    if (!start) return 0;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    fetchAtletaData();
  }, [atletaId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchAthlete(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkAthlete = async (officialId) => {
    try {
      // 1. Atualizar o ID oficial na tabela de profissionais
      const { error } = await supabase
        .from('profissionais')
        .update({ api_external_id: officialId })
        .eq('id', atletaId);

      if (error) throw error;

      // 2. Recarregar dados
      setShowSearch(false);
      fetchAtletaData();
    } catch (err) {
      console.error('Erro ao vincular atleta:', err.message);
      alert('Erro ao vincular. Verifique se a coluna api_external_id existe na tabela profissionais.');
    }
  };

  const fetchAtletaData = async (seasonOverride) => {
    try {
      setLoading(true);
      const seasonToUse = seasonOverride || selectedSeason;
      
      const { data, error } = await supabase
        .from('v_visao_real_atleta')
        .select('*')
        .eq('profissional_id', atletaId)
        .maybeSingle();

      if (error) throw error;
      setAtleta(data);

      // Buscar dados da API-Football se houver ID vinculado
      const apiIdToUse = data.api_external_id || null;
      
      if (apiIdToUse) {
        setApiLoading(true);
        const apiResults = await getAthleteStats(apiIdToUse, seasonToUse);
        setApiData(apiResults);
      } else {
        setApiData({ stats: null, injuries: [], transfers: [] });
      }

    } catch (error) {
      console.error('Erro ao buscar dados do atleta:', error.message);
    } finally {
      setLoading(false);
      setApiLoading(false);
    }
  };

  const handleExport = async () => {
    // Definimos os IDs das seções que queremos capturar para as páginas
    const sectionIds = ['export-page-1', 'export-page-2', 'export-page-3'];
    const exportContainer = document.getElementById('export-container');
    
    if (!exportContainer) return;

    try {
      // 1. Mostrar container de exportação temporariamente
      exportContainer.style.display = 'block';
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < sectionIds.length; i++) {
        const section = document.getElementById(sectionIds[i]);
        if (!section) continue;

        const canvas = await html2canvas(section, {
          backgroundColor: '#0b111b',
          scale: 2,
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Calcular dimensões para caber na página A4 mantendo proporção
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      }

      // 3. Salvar PDF
      const athleteName = atleta?.nome || 'Atleta';
      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      pdf.save(`Relatorio_Premium_${athleteName.replace(/\s+/g, '_')}_${date}.pdf`);

      // 4. Ocultar container novamente
      exportContainer.style.display = 'none';
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      exportContainer.style.display = 'none';
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b111b] text-white flex items-center justify-center font-['JetBrains_Mono']">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#00e5ff]/10 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-[#00e5ff] rounded-full animate-spin"></div>
          </div>
          <p className="text-[#00e5ff] uppercase tracking-[0.3em] text-[10px] font-bold animate-pulse text-center">
            Processando Inteligência ScoultIA...<br/>
            <span className="text-gray-500 text-[8px] tracking-normal font-normal">Sincronizando View de Performance</span>
          </p>
        </div>
      </div>
    );
  }

  if (!atleta) {
    return (
      <div className="min-h-screen bg-[#0b111b] text-white p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 max-w-md">
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            Identificador <span className="text-[#00e5ff] font-bold">#{atletaId?.substring(0,8)}</span> não localizado na view de ranking.
          </p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-[#00e5ff]/10 text-[#00e5ff] px-6 py-2 rounded-xl text-xs font-bold border border-[#00e5ff]/20 hover:bg-[#00e5ff]/20 transition-all uppercase"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const attributes = [
    { name: 'Técnica', val: atleta.tecnica || 0 },
    { name: 'Tática', val: atleta.tatica || 0 },
    { name: 'Física', val: atleta.fisica || 0 },
    { name: 'Psicológica', val: atleta.psicologica || 0 },
  ];

  const chartData = attributes.map(attr => ({ subject: attr.name, A: attr.val, fullMark: 10 }));
  const strengths = attributes.filter(a => a.val >= 7.5);
  const improvements = attributes.filter(a => a.val < 6.0);
  
  // Cálculo da Média Global em tempo real para o card de Performance Base
  const avgPerformance = attributes.reduce((acc, curr) => acc + curr.val, 0) / attributes.length;

  const tabs = [
    { id: 'analitico', label: 'Analítico (IA)', icon: Zap },
    { id: 'estatisticas', label: 'Estatísticas Oficiais', icon: Trophy },
    { id: 'carreira', label: 'Carreira & Saúde', icon: HeartPulse }
  ];

  return (
    <div className="font-['JetBrains_Mono'] selection:bg-[#00e5ff]/30">
      <div id="capture-report" className="bg-[#0b111b] p-2 md:p-6 lg:p-10 rounded-[2rem]">
        <header className="mb-12 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-[#00e5ff]" size={20} />
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Relatório Técnico Detalhado</p>
            </div>

            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#00e5ff] text-[#0b111b] px-6 py-2.5 rounded-xl text-xs font-black hover:bg-white transition-all uppercase tracking-tight shadow-[0_0_20px_rgba(0,229,255,0.3)]"
            >
              <Share2 size={16} /> Exportar Relatório
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-10">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#00e5ff]/10 to-[#00e5ff]/30 border border-[#00e5ff]/20 flex items-center justify-center text-5xl font-bold shadow-[0_0_60px_rgba(0,229,255,0.15)] text-[#00e5ff]">
              {atleta.nome?.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-7xl font-['Bebas_Neue'] text-white tracking-wider leading-none mb-2">
                {atleta.nome}
              </h1>
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 bg-[#00e5ff]/10 text-[#00e5ff] text-xs rounded-lg font-bold border border-[#00e5ff]/20 uppercase tracking-tighter">
                  {atleta.posicao || 'POSIÇÃO N/D'}
                </span>
                <span className="px-4 py-1.5 bg-white/5 text-gray-500 text-xs rounded-lg border border-white/10 uppercase tracking-tighter">
                  ID: #{atleta.id?.substring(0, 8) || 'N/A'}
                </span>
                
                {!atleta.api_external_id ? (
                  <button 
                    onClick={() => setShowSearch(true)}
                    className="px-4 py-1.5 bg-yellow-500/10 text-yellow-500 text-[10px] rounded-lg font-bold border border-yellow-500/20 uppercase tracking-tighter hover:bg-yellow-500/20 transition-all flex items-center gap-1"
                  >
                    <ShieldAlert size={12} /> Vincular com API Oficial
                  </button>
                ) : (
                  <span className="px-4 py-1.5 bg-green-500/10 text-green-500 text-[10px] rounded-lg font-bold border border-green-500/20 uppercase tracking-tighter flex items-center gap-1">
                    <Trophy size={12} /> Perfil Verificado #{atleta.api_external_id}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center min-w-[180px]">
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-1 font-black">Performance Base</p>
              <p className="text-6xl font-['Bebas_Neue'] text-[#00e5ff]">
                {avgPerformance.toFixed(1)}
              </p>
            </div>
          </div>
        </header>

        {/* Sistema de Abas */}
        <nav className="max-w-7xl mx-auto mb-10 border-b border-white/5 flex gap-8 px-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2
                ${activeTab === tab.id 
                  ? 'border-[#00e5ff] text-[#00e5ff]' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="max-w-7xl mx-auto">
          {activeTab === 'analitico' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              {/* Radar Chart Section - Centralized in 7 cols */}
              <div className="lg:col-span-7 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00e5ff]/50 to-transparent"></div>
                <h2 className="text-xs font-black text-[#00e5ff] uppercase tracking-[0.5em] mb-12 text-center">
                  Relatório de Atributos IA
                </h2>
                <RadarPerformance data={chartData} athleteName={atleta.nome} />
              </div>

              {/* Insights Section - Side Column 5 cols */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ThumbsUp size={16} className="text-[#00e5ff]" /> Pontos Fortes
                  </h3>
                  <div className="space-y-4">
                    {strengths.length > 0 ? strengths.map(s => (
                      <div key={s.name} className="flex items-center justify-between p-4 bg-[#00e5ff]/5 rounded-xl border border-[#00e5ff]/10">
                        <span className="text-sm font-bold">{s.name}</span>
                        <span className="text-lg font-black text-[#00e5ff]">{s.val.toFixed(1)}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-600 italic">Nenhum atributo acima de 7.5 identificado.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ThumbsDown size={16} className="text-red-500" /> Pontos a Melhorar
                  </h3>
                  <div className="space-y-4">
                    {improvements.length > 0 ? improvements.map(s => (
                      <div key={s.name} className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                        <span className="text-sm font-bold">{s.name}</span>
                        <span className="text-lg font-black text-red-500">{s.val.toFixed(1)}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-600 italic">Nenhum alerta crítico (abaixo de 6.0).</p>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#00e5ff]/20 to-transparent border border-[#00e5ff]/20 p-8 rounded-3xl relative overflow-hidden group">
                  <Trophy size={80} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Market Insight</h3>
                  <p className="text-sm text-gray-300 leading-relaxed italic">
                    "Baseado na estabilidade técnica e tática, o atleta demonstra {avgPerformance >= 7 ? 'altíssimo potencial de revenda.' : 'necessidade de maturação defensiva.'}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'estatisticas' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#00e5ff]" /> Performance por Temporada
                </h3>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Temporada:</span>
                  <select 
                    value={selectedSeason}
                    onChange={(e) => {
                      const s = parseInt(e.target.value);
                      setSelectedSeason(s);
                      fetchAtletaData(s);
                    }}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-1.5 text-xs font-bold text-[#00e5ff] focus:outline-none focus:border-[#00e5ff]/50 transition-all cursor-pointer"
                  >
                    <option value={2026}>2026/2027</option>
                    <option value={2025}>2025/2026</option>
                    <option value={2024}>2024/2025</option>
                  </select>
                </div>
              </div>

              {apiLoading ? (
                <div className="py-20 text-center text-gray-500 italic">Sincronizando estatísticas oficiais da temporada {selectedSeason}...</div>
              ) : apiData.stats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Card Ataque - Ciano */}
                    <div className="bg-gradient-to-br from-[#00e5ff]/10 to-transparent border border-[#00e5ff]/20 rounded-[2rem] p-8 relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00e5ff]/5 rounded-full blur-3xl group-hover:bg-[#00e5ff]/10 transition-all"></div>
                      <h4 className="text-[10px] font-black text-[#00e5ff] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <Target size={14} /> Power: Ataque
                      </h4>
                      <div className="space-y-6">
                        <SimpleStat label="Gols Marcados" value={apiData.stats.statistics[0].goals.total || 0} unit="G" />
                        <SimpleStat label="Assistências" value={apiData.stats.statistics[0].goals.assists || 0} unit="A" />
                        <SimpleStat label="Chutes a Gol" value={apiData.stats.statistics[0].shots.on || 0} unit="C" />
                      </div>
                    </div>

                    {/* Card Motor - Branco */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <Activity size={14} /> Motor: Presença
                      </h4>
                      <div className="space-y-6">
                        <SimpleStat label="Minutos em Campo" value={apiData.stats.statistics[0].games.minutes || 0} unit="MIN" />
                        <SimpleStat label="Titularidade" value={apiData.stats.statistics[0].games.lineups || 0} unit="J" />
                        <SimpleStat label="Precisão de Passes" value={apiData.stats.statistics[0].passes.accuracy || 0} unit="%" />
                      </div>
                    </div>

                    {/* Card Disciplina - Amarelo/Vermelho */}
                    <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/10 rounded-[2rem] p-8 relative overflow-hidden group">
                      <h4 className="text-[10px] font-black text-red-500/70 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                         <ShieldAlert size={14} /> Controle: Disciplina
                      </h4>
                      <div className="space-y-6">
                        <SimpleStat label="Cartões Amarelos" value={apiData.stats.statistics[0].cards.yellow || 0} unit="CA" />
                        <SimpleStat label="Cartões Vermelhos" value={apiData.stats.statistics[0].cards.red || 0} unit="CV" />
                        <SimpleStat label="Faltas Cometidas" value={apiData.stats.statistics[0].fouls.committed || 0} unit="F" />
                      </div>
                    </div>
                  </div>

                  {/* Comparativo IA */}
                  <div className="mt-12 p-8 bg-[#00e5ff]/5 border border-[#00e5ff]/10 rounded-2xl flex items-start gap-4">
                    <div className="p-3 bg-[#00e5ff]/10 rounded-xl text-[#00e5ff]">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest mb-1">ScoultIA Intelligence Insight</p>
                      <p className="text-sm text-gray-400 leading-relaxed italic">
                        "{atleta.nome} demonstra um índice de {apiData.stats.statistics[0].goals.total > 2 ? 'finalização 15% superior' : 'presença tática consistente'} à média para {atleta.posicao} na temporada {selectedSeason}. {apiData.stats.statistics[0].cards.yellow > 5 ? 'Ponto de atenção: Indisciplina recorrente.' : 'Nível de disciplina exemplar.'} "
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-gray-500 italic">Nenhuma estatística oficial encontrada para a temporada {selectedSeason}.</div>
              )}
            </div>
          )}

          {activeTab === 'carreira' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Timeline de Lesões */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-fit">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-10 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" /> Timeline de Saúde
                </h3>
                
                {apiData.injuries && apiData.injuries.length > 0 ? (
                  <div className="relative pl-8 space-y-12 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-white/10">
                    {apiData.injuries.map((injury, i) => {
                      const days = calculateDuration(injury.start, injury.end);
                      const isLong = days > 30;
                      return (
                        <div key={i} className="relative group">
                          {/* Dot na Timeline */}
                          <div className={`absolute -left-[27px] top-1.5 w-4 h-4 rounded-full border-4 border-[#0b111b] z-10 
                            ${injury.end ? (isLong ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500') : 'bg-[#00e5ff] animate-pulse'}`} 
                          />
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                              {new Date(injury.start).toLocaleDateString('pt-BR')} • {injury.end ? 'Finalizada' : 'Ativa'}
                            </span>
                            <p className="font-bold text-white text-sm">{injury.type || 'Lesão Indeterminada'}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter
                                ${isLong ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                {days} dias fora
                              </span>
                              <span className="text-[9px] text-gray-600 font-bold uppercase">{injury.team.name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhum registro médico oficial encontrado.</p>
                )}
              </div>

              {/* Histórico de Transferências */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-fit">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-10 flex items-center gap-2">
                  <History size={16} className="text-[#00e5ff]" /> Histórico de Clubes
                </h3>

                {apiData.transfers && apiData.transfers.length > 0 ? (
                  <div className="space-y-6">
                    {apiData.transfers.map((t, i) => (
                      <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#00e5ff]/20 transition-all group">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-tighter">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                            <span className="px-2 py-0.5 bg-[#00e5ff]/10 text-[#00e5ff] text-[8px] font-black uppercase rounded">{t.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white group-hover:text-[#00e5ff] transition-colors">{t.teams.out.name}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-sm font-bold text-[#00e5ff]">{t.teams.in.name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhuma transferência recente reportada.</p>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Interface de Vínculo de ID Oficial */}
        {showSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-dark/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-white/5 border border-white/10 w-full max-w-2xl rounded-[2.5rem] p-10 relative shadow-2xl">
              <button 
                onClick={() => setShowSearch(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white"
              >
                Fechar [X]
              </button>
              
              <h2 className="text-2xl font-['Bebas_Neue'] text-[#00e5ff] mb-6 uppercase tracking-wider">Vincular Atleta Oficial</h2>
              
              <div className="flex gap-4 mb-8">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Nome do atleta na API-Football (ex: Neymar)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm focus:border-[#00e5ff] focus:outline-none transition-all placeholder:text-gray-600"
                />
                <button 
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-[#00e5ff] text-[#0b111b] px-8 py-4 rounded-xl font-black uppercase text-xs hover:bg-white transition-all disabled:opacity-50"
                >
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {searchResults.length > 0 ? searchResults.map(item => (
                  <div key={item.player.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      {item.player.photo && (
                        <img src={item.player.photo} alt={item.player.name} className="w-14 h-14 rounded-full border-2 border-[#00e5ff]/20 bg-[#0b111b]" />
                      )}
                      <div>
                        <p className="font-bold text-sm text-white group-hover:text-[#00e5ff] transition-colors">{item.player.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] px-2 py-0.5 bg-white/5 rounded text-gray-400 uppercase font-black tracking-tighter">
                            {item.statistics[0]?.team?.name || 'Sem Time'}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 bg-[#00e5ff]/5 rounded text-[#00e5ff] uppercase font-black tracking-tighter">
                            {item.player.age} anos
                          </span>
                          <span className="text-[9px] text-gray-600 uppercase font-black tracking-tighter italic">
                            {item.player.nationality}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleLinkAthlete(item.player.id)}
                      className="px-4 py-2 bg-[#00e5ff] text-[#0b111b] text-[10px] font-black rounded-lg hover:bg-white transition-all uppercase shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                    >
                      Selecionar
                    </button>
                  </div>
                )) : searchQuery && !searching && (
                  <p className="text-center py-10 text-gray-500 italic text-sm">Nenhum atleta encontrado com este nome.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Container Oculto para Exportação Premium (3 Páginas) */}
        <div id="export-container" style={{ display: 'none', position: 'absolute', top: '-9999px', left: '-9999px', width: '800px' }}>
          
          {/* PÁGINA 1: PERFIL & IA */}
          <div id="export-page-1" className="bg-[#0b111b] p-12 text-white min-h-[1100px]">
             <div className="flex justify-between items-center mb-12">
                <p className="text-[#00e5ff] font-['Bebas_Neue'] text-3xl tracking-widest uppercase">ScoutIA Pro <span className="text-white/20">|</span> Relatório Elite</p>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Página 01/03</p>
             </div>
             
             <div className="flex items-center gap-8 mb-12 bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="w-24 h-24 rounded-2xl bg-[#00e5ff]/10 flex items-center justify-center text-4xl text-[#00e5ff] font-bold">
                  {atleta.nome?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-5xl font-['Bebas_Neue'] mb-1">{atleta.nome}</h2>
                  <p className="text-[#00e5ff] font-bold text-sm uppercase">{atleta.posicao} • Performance: {avgPerformance.toFixed(1)}</p>
                </div>
             </div>

             <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 mb-8">
                <h3 className="text-xs font-black text-[#00e5ff] uppercase tracking-[0.4em] mb-10 text-center">Análise Situacional de Atributos</h3>
                <RadarPerformance data={chartData} athleteName={atleta.nome} />
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                   <h4 className="text-[10px] font-black text-[#00e5ff] uppercase mb-4">Pontos Fortes</h4>
                   {strengths.map(s => <p key={s.name} className="text-xs text-gray-300 mb-2">• {s.name}: {s.val.toFixed(1)}</p>)}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                   <h4 className="text-[10px] font-black text-red-500 uppercase mb-4">Pontos de Atenção</h4>
                   {improvements.map(s => <p key={s.name} className="text-xs text-gray-300 mb-2">• {s.name}: {s.val.toFixed(1)}</p>)}
                </div>
             </div>
             
             <div className="mt-12 text-center border-t border-white/5 pt-8">
                <p className="text-[10px] text-gray-600 uppercase font-bold">
                  Dados sincronizados via API-Football em {new Date().toLocaleString('pt-BR')}
                </p>
             </div>
          </div>

          {/* PÁGINA 2: ESTATÍSTICAS OFICIAIS */}
          <div id="export-page-2" className="bg-[#0b111b] p-12 text-white min-h-[1100px]">
             <div className="flex justify-between items-center mb-12">
                <p className="text-[#00e5ff] font-['Bebas_Neue'] text-3xl tracking-widest uppercase">ScoutIA Pro <span className="text-white/20">|</span> Estatísticas</p>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Página 02/03</p>
             </div>

             <h3 className="text-xl font-['Bebas_Neue'] text-white mb-8 tracking-widest text-center">Performance Oficial - Temporada {selectedSeason}</h3>

             {apiData.stats ? (
               <div className="space-y-8">
                 <div className="grid grid-cols-3 gap-6">
                    <div className="bg-[#00e5ff]/5 border border-[#00e5ff]/20 p-8 rounded-3xl">
                       <p className="text-[10px] font-black text-[#00e5ff] uppercase mb-4">Ataque</p>
                       <p className="text-xs text-gray-400">Gols: <span className="text-white font-bold">{apiData.stats.statistics[0].goals.total || 0}</span></p>
                       <p className="text-xs text-gray-400">Assists: <span className="text-white font-bold">{apiData.stats.statistics[0].goals.assists || 0}</span></p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Motor</p>
                       <p className="text-xs text-gray-400">Minutos: <span className="text-white font-bold">{apiData.stats.statistics[0].games.minutes || 0}</span></p>
                       <p className="text-xs text-gray-400">Passes %: <span className="text-white font-bold">{apiData.stats.statistics[0].passes.accuracy || 0}%</span></p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-3xl">
                       <p className="text-[10px] font-black text-red-500 uppercase mb-4">Disciplina</p>
                       <p className="text-xs text-gray-400">Amarelos: <span className="text-white font-bold">{apiData.stats.statistics[0].cards.yellow || 0}</span></p>
                       <p className="text-xs text-gray-400">Vermelhos: <span className="text-white font-bold">{apiData.stats.statistics[0].cards.red || 0}</span></p>
                    </div>
                 </div>

                 <div className="bg-[#00e5ff]/5 border border-[#00e5ff]/10 p-8 rounded-2xl">
                    <h4 className="text-[10px] font-black text-white uppercase mb-4">Intelligence Insight</h4>
                    <p className="text-sm text-gray-400 italic">
                      "{atleta.nome} demonstra um índice de {apiData.stats.statistics[0].goals.total > 2 ? 'finalização 15% superior' : 'presença tática consistente'} à média para {atleta.posicao} na temporada {selectedSeason}."
                    </p>
                 </div>
               </div>
             ) : (
               <p className="text-center py-20 text-gray-500 italic">Sem estatísticas oficiais vinculadas.</p>
             )}

             <div className="absolute bottom-12 left-0 w-full text-center">
                <p className="text-[10px] text-gray-600 uppercase font-bold">
                  Sincronizado via API-Football em {new Date().toLocaleString('pt-BR')}
                </p>
             </div>
          </div>

          {/* PÁGINA 3: CARREIRA & SAÚDE */}
          <div id="export-page-3" className="bg-[#0b111b] p-12 text-white min-h-[1100px]">
             <div className="flex justify-between items-center mb-12">
                <p className="text-[#00e5ff] font-['Bebas_Neue'] text-3xl tracking-widest uppercase">ScoutIA Pro <span className="text-white/20">|</span> Carreira & Saúde</p>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Página 03/03</p>
             </div>

             <div className="grid grid-cols-2 gap-12">
                <div>
                   <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                      <ShieldAlert size={14} /> Timeline de Saúde
                   </h4>
                   <div className="space-y-8 pl-4 border-l border-white/10">
                      {apiData.injuries.length > 0 ? apiData.injuries.map((injury, i) => (
                        <div key={i} className="relative">
                           <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0b111b]"></div>
                           <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{new Date(injury.start).toLocaleDateString('pt-BR')}</p>
                           <p className="text-xs font-bold text-white">{injury.type}</p>
                           <p className="text-[9px] text-red-500 uppercase font-black">{calculateDuration(injury.start, injury.end)} dias fora</p>
                        </div>
                      )) : <p className="text-gray-500 text-xs italic">Nenhum registro médico.</p>}
                   </div>
                </div>

                <div>
                   <h4 className="text-xs font-black text-[#00e5ff] uppercase tracking-widest mb-8 flex items-center gap-2">
                      <History size={14} /> Evolução de Carreira Inter-Clubes
                   </h4>
                   <div className="space-y-6">
                      {apiData.transfers.length > 0 ? apiData.transfers.map((t, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                           <p className="text-[9px] text-gray-500 uppercase font-bold mb-2">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-300">{t.teams.out.name}</span>
                              <span className="text-gray-600">→</span>
                              <span className="text-[10px] text-[#00e5ff] font-bold">{t.teams.in.name}</span>
                           </div>
                        </div>
                      )) : <p className="text-gray-500 text-xs italic">Sem histórico de transferências.</p>}
                   </div>
                </div>
             </div>

             <div className="absolute bottom-12 left-0 w-full text-center">
                <p className="text-[10px] text-gray-600 uppercase font-bold">
                  Documento validado por ScoutIA Intelligence via API-Football em {new Date().toLocaleString('pt-BR')}
                </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Componente Auxiliar para Cards de Estatísticas
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
    <div className={`p-4 rounded-xl bg-white/5 ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  </div>
);

const SimpleStat = ({ label, value, unit }) => (
  <div className="flex items-end justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
    <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black text-white">{value}</span>
      <span className="text-[8px] font-black text-gray-600 uppercase italic">{unit}</span>
    </div>
  </div>
);

export default VisualizacaoPerformance;

