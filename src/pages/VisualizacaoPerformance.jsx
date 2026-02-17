import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import RadarPerformance from '../components/RadarPerformance';
import { ArrowLeft, TrendingUp, Target, Shield, Zap, Activity, Trophy, ThumbsUp, ThumbsDown } from 'lucide-react';

const VisualizacaoPerformance = () => {
  const { atletaId } = useParams();
  const navigate = useNavigate();
  const [atleta, setAtleta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAtletaData();
  }, [atletaId]);

  const fetchAtletaData = async () => {
    try {
      setLoading(true);
      
      // Alterado para v_visao_real_atleta conforme confirmado
      const { data, error } = await supabase
        .from('v_visao_real_atleta')
        .select('*')
        .eq('profissional_id', atletaId)
        .maybeSingle();

      if (error) throw error;
      console.log('Dados recebidos da View:', data);
      setAtleta(data);

    } catch (error) {
      console.error('Erro ao buscar dados do atleta:', error.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-[#0b111b] text-white p-6 font-['JetBrains_Mono'] selection:bg-[#00e5ff]/30">
      <header className="mb-12 max-w-7xl mx-auto">
        <button 
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 text-[#00e5ff] hover:text-white transition-all mb-8 text-xs uppercase tracking-widest font-bold"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Dashboard Principal
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end gap-10">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#00e5ff]/10 to-[#00e5ff]/30 border border-[#00e5ff]/20 flex items-center justify-center text-5xl font-bold shadow-[0_0_60px_rgba(0,229,255,0.15)] text-[#00e5ff]">
            {atleta.nome?.substring(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-7xl font-['Bebas_Neue'] text-white tracking-wider leading-none mb-2">
              {atleta.nome}
            </h1>
            <div className="flex gap-3">
              <span className="px-4 py-1.5 bg-[#00e5ff]/10 text-[#00e5ff] text-xs rounded-lg font-bold border border-[#00e5ff]/20 uppercase tracking-tighter">
                {atleta.posicao || 'POSIÇÃO N/D'}
              </span>
              <span className="px-4 py-1.5 bg-white/5 text-gray-500 text-xs rounded-lg border border-white/10 uppercase tracking-tighter">
                ID: #{atleta.id?.substring(0, 8) || 'N/A'}
              </span>
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

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
                <p className="text-xs text-gray-600 italic">Nenhum atributo acima de 7.0 identificado.</p>
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
                <p className="text-xs text-gray-600 italic">Nenhum alerta crítico (abaixo de 5.0).</p>
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
      </main>
    </div>
  );
};

export default VisualizacaoPerformance;
