import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Trophy, TrendingUp, Users, Target, Activity, Plus, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_ranking_plantel')
        .select('*');

      if (error) throw error;
      setRanking(data || []);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-['JetBrains_Mono']">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-['Bebas_Neue'] text-primary tracking-wider mb-2">
            DASHBOARD DE PERFORMANCE
          </h1>
          <p className="text-gray-400">Análise em tempo real do plantel ScoultIA</p>
        </div>
        <button 
          onClick={() => navigate('/analise')}
          className="bg-primary text-dark font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all uppercase text-sm tracking-tight"
        >
          <Plus size={20} /> Nova Análise
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Atletas', value: ranking.length, icon: Users, color: 'text-primary' },
          { label: 'Média Performance', value: '8.4', icon: TrendingUp, color: 'text-green-400' },
          { label: 'Gols Totais', value: '42', icon: Target, color: 'text-red-400' },
          { label: 'Atividade', value: '98%', icon: Activity, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-glass backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ranking Table Section */}
      <div className="bg-glass backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            Ranking do Plantel
          </h2>
          <button 
            onClick={fetchRanking}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-bold py-2 px-4 rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all uppercase tracking-tighter disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Sincronizando...' : 'Atualizar Dados'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-gray-400 uppercase text-xs tracking-widest">
                <th className="px-6 py-4">Posc</th>
                <th className="px-6 py-4">Atleta</th>
                <th className="px-6 py-4">Posição</th>
                <th className="px-6 py-4 text-center">Jogos</th>
                <th className="px-6 py-4 text-center">Gols</th>
                <th className="px-6 py-4 text-center">Assist</th>
                <th className="px-6 py-4 text-right">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
                    Carregando dados estruturados...
                  </td>
                </tr>
              ) : ranking.length > 0 ? (
                ranking.map((atleta, index) => (
                  <tr key={atleta.id || index} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`
                        w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                        ${index < 3 ? 'bg-primary text-dark' : 'bg-white/10 text-gray-400'}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer group/atleta"
                        onClick={() => navigate(`/performance/${atleta.id || atleta.profissional_id}`)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-bold border border-white/10 group-hover/atleta:border-primary/50 transition-all">
                          {atleta.nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium group-hover/atleta:text-primary transition-colors border-b border-transparent group-hover/atleta:border-primary/30">
                          {atleta.nome}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-sm bg-white/5 text-[10px] text-gray-400 uppercase border border-white/5">
                        {atleta.posicao || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-sm">{atleta.partidas || 0}</td>
                    <td className="px-6 py-4 text-center font-bold text-sm">{atleta.gols || 0}</td>
                    <td className="px-6 py-4 text-center font-bold text-sm">{atleta.assistencias || 0}</td>
                    <td className="px-6 py-4 text-right leading-none">
                      <span className="text-lg font-bold text-primary">{atleta.media_tecnica?.toFixed(1) || '0.0'}</span>
                      <div className="w-16 h-1 bg-white/10 mt-1 ml-auto rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(atleta.media_tecnica || 0) * 10}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Nenhum dado encontrado na base de conhecimento.
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
