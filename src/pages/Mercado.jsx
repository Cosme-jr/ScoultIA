import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, UserPlus, Globe, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { searchAthlete } from '../services/apiFootball';
import { supabase } from '../lib/supabaseClient';

const Mercado = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('global');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchAthlete(query, selectedRegion);
      console.log(`[Mercado] Resposta da API/Cache para "${query}" (Região: ${selectedRegion}):`, data);
      
      if (Array.isArray(data) && data.length > 0) {
        setResults(data);
      } else {
        console.warn(`[Mercado] NENHUM dado retornado para "${query}". Mantendo lista vazia.`);
        setResults([]);
      }
    } catch (err) {
      console.error('Erro na busca global:', err);
      setResults([]);
    } finally {
      // Pequeno timeout para garantir que o React processe o estado se o cache for instantâneo
      setTimeout(() => setLoading(false), 300);
    }
  };

  const handleImport = async (playerData) => {
    setImporting(playerData.player.id);
    try {
      // 1. Verificar se o atleta já existe
      const { data: existing } = await supabase
        .from('profissionais')
        .select('id')
        .eq('api_external_id', playerData.player.id)
        .maybeSingle();

      if (existing) {
        alert('Este atleta já está sendo monitorado!');
        return;
      }

      // 2. Inserir novo atleta
      // Mapeamento simples de posição (a API retorna strings como 'Attacker', 'Midfielder', etc.)
      const posMap = {
        'Goalkeeper': 'Goleiro',
        'Defender': 'Defensor',
        'Midfielder': 'Meia',
        'Attacker': 'Atacante'
      };

      const { error } = await supabase
        .from('profissionais')
        .insert([{
          nome: playerData.player.name,
          posicao: posMap[playerData.statistics[0]?.games?.position] || 'Atleta',
          api_external_id: playerData.player.id,
          //clube_id será nulo por padrão ou podemos vincular a um clube 'Mercado' se houver
        }]);

      if (error) throw error;

      alert(`${playerData.player.name} importado com sucesso para o Plantel!`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro ao importar atleta:', err);
      alert('Falha ao importar atleta.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="text-[#00e5ff]" size={20} />
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">ScoutIA Global Market</h2>
        </div>
        <h1 className="text-6xl font-['Bebas_Neue'] text-white tracking-wider">
          MERCADO DE <span className="text-[#00e5ff]">TRANSFERÊNCIAS</span>
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Explore a base de dados oficial da API-Football. Monitore novos talentos e integre-os instantaneamente ao ecossistema ScoultIA.
        </p>
      </header>

      {/* Barra de Busca */}
      <form onSubmit={handleSearch} className="mb-12 max-w-3xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center text-gray-500 group-focus-within:text-[#00e5ff] transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome (ex: Erling Haaland, Vinicius Junior, Endrick...)"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-32 text-sm focus:border-[#00e5ff] focus:outline-none transition-all placeholder:text-gray-600"
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-3 top-2 bottom-2 bg-[#00e5ff] text-[#0b111b] px-8 rounded-xl font-black uppercase text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Explorar'}
          </button>
        </div>

        {/* Seleção de Região */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
           {[
             { id: 'global', name: '🌍 Global' },
             { id: '71', name: '🇧🇷 Brasil' },
             { id: '307', name: '🇸🇦 Arábia' },
             { id: '39', name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Europa (PL)' },
             { id: '13', name: '🇪🇸 Espanha' },
             { id: '140', name: '🇮🇹 Itália' }
           ].map((region) => (
             <button
               key={region.id}
               type="button"
               onClick={() => setSelectedRegion(region.id)}
               className={`whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                 selectedRegion === region.id 
                   ? 'bg-[#00e5ff] text-[#0b111b] border-[#00e5ff]' 
                   : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
               }`}
             >
               {region.name}
             </button>
           ))}
        </div>
      </form>

      {/* Grid de Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {results.length > 0 ? results.map((item) => (
          <div key={item.player.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-[#00e5ff]/30 transition-all group relative overflow-hidden">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <img 
                  src={item.player.photo} 
                  alt={item.player.name} 
                  className="w-20 h-20 rounded-2xl border-2 border-white/10 group-hover:border-[#00e5ff]/50 transition-all object-cover bg-[#0b111b]"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-[#0b111b] border border-white/10 p-1 flex items-center justify-center">
                  <img src={item.statistics[0]?.team?.logo} alt="Club" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white truncate group-hover:text-[#00e5ff] transition-colors">{item.player.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[9px] px-2 py-0.5 bg-white/5 rounded text-gray-400 uppercase font-black tracking-tighter">
                    {item.statistics[0]?.team?.name || 'Sem Time'}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-[#00e5ff]/5 rounded text-[#00e5ff] uppercase font-black tracking-tighter">
                    {item.player.age} anos
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
              <div className="bg-white/5 p-3 rounded-xl">
                 <p className="text-[8px] text-gray-500 uppercase mb-1">Nacionalidade</p>
                 <p className="text-xs font-bold text-gray-300">{item.player.nationality}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                 <p className="text-[8px] text-gray-500 uppercase mb-1">Posição API</p>
                 <p className="text-xs font-bold text-gray-300">{item.statistics[0]?.games?.position || 'N/A'}</p>
              </div>
            </div>

            <button 
              onClick={() => handleImport(item)}
              disabled={importing === item.player.id}
              className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-[#00e5ff] hover:text-[#0b111b] hover:border-[#00e5ff] transition-all flex items-center justify-center gap-2 group/btn"
            >
              {importing === item.player.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} className="group-hover/btn:scale-110 transition-transform" />
                  Monitorar Atleta
                </>
              )}
            </button>
          </div>
        )) : query && !loading ? (
          <div className="col-span-full py-20 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <Globe className="mx-auto mb-4 text-gray-700 opacity-20" size={40} />
            <p className="text-gray-400 font-medium">Nenhum atleta encontrado para "{query}"</p>
            <p className="text-gray-600 text-[10px] mt-2 max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
              Verifique a grafia ou tente termos mais genéricos. <br/>
                Resultados limitados à temporada 2024 (Plano Free) em ligas principais.
            </p>
          </div>
        ) : (
          <div className="col-span-full py-20 text-center text-gray-700">
             <TrendingUp size={48} className="mx-auto mb-4 opacity-5" />
             <p className="uppercase tracking-[0.3em] text-[10px] font-black opacity-20">Aguardando parâmetros de busca...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mercado;
