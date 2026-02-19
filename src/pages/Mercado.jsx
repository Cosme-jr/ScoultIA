import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, UserPlus, Globe, Shield, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { searchAthlete } from '../services/apiFootball';
import { supabase } from '../lib/supabaseClient';

const Mercado = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState('71'); // Padrão: Brasil Série A
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const leagues = [
    {
      category: "Brasil (Joias)",
      items: [
        { id: '71', name: 'Série A' },
        { id: '72', name: 'Série B' }
      ]
    },
    {
      category: "América Latina",
      items: [
        { id: '128', name: 'Argentina' }
      ]
    },
    {
      category: "Mercado Árabe",
      items: [
        { id: '307', name: 'Saudi Pro League' }
      ]
    },
    {
      category: "Elite Europeia",
      items: [
        { id: '39', name: 'Premier League' },
        { id: '140', name: 'La Liga' },
        { id: '135', name: 'Serie A Itália' }
      ]
    },
    {
      category: "Celeiro Europeu",
      items: [
        { id: '88', name: 'Holanda/Eredivisie' },
        { id: '94', name: 'Portugal' }
      ]
    }
  ];

  const getSelectedLeagueName = () => {
    if (selectedLeague === 'global') return '🌎 Global';
    for (const cat of leagues) {
      const found = cat.items.find(l => l.id === selectedLeague);
      if (found) return found.name;
    }
    return 'Clubes';
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchAthlete(query, selectedLeague);
      console.log(`[Mercado] Resposta da API/Cache para "${query}" (Liga: ${selectedLeague}):`, data);
      
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
      const apiId = Math.floor(Number(playerData.player.id));
      
      // 1. Pegar clube_id do usuário logado (Multi-tenancy)
      const { data: { user } } = await supabase.auth.getUser();
      const clube_id = user?.user_metadata?.clube_id || '72e07108-9e57-4b9c-954a-e9a68acc9b30'; // Fallback para teste

      // 2. Verificar se o atleta já existe
      const { data: existing } = await supabase
        .from('profissionais')
        .select('id')
        .eq('api_external_id', apiId)
        .eq('clube_id', clube_id) // Verificar duplicata no mesmo clube
        .maybeSingle();

      if (existing) {
        alert('Este atleta já está sendo monitorado pelo seu clube!');
        return;
      }

      // 3. Inserir novo atleta com campos completos e mapeamento de ENUM
      function mapPositionToEnum(apiPosition) {
        const map = {
          'Goalkeeper': 'GOL',
          'Goleiro': 'GOL',
          'Defender': 'ZAG',
          'Zagueiro': 'ZAG',
          'Defensor': 'ZAG',
          'Lateral': 'LD',
          'Midfielder': 'MEI',
          'Meio-Campo': 'MEI',
          'Meia': 'MEI',
          'Attacker': 'ATA',
          'Atacante': 'ATA',
          'Forward': 'ATA'
        };
        return map[apiPosition] || 'MEI'; // fallback
      }

      const apiPosition = playerData.statistics[0]?.games?.position || 'Midfielder';
      const mappedPosition = mapPositionToEnum(apiPosition);

      const payload = {
        clube_id: clube_id,
        api_external_id: apiId,
        nome: playerData.player.name,
        foto: playerData.player.photo,
        time_atual: playerData.statistics[0]?.team?.name || 'Sem Clube',
        posicao: mappedPosition,
        nacionalidade: playerData.player.nationality,
        idade: Math.floor(Number(playerData.player.age))
      };

      console.log('[Mercado] Tentando importar atleta:', payload);

      const { error } = await supabase
        .from('profissionais')
        .insert([payload]);

      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }

      alert(`${playerData.player.name} importado com sucesso para o Plantel!`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro ao importar atleta:', err);
      alert('Falha ao importar atleta. Verifique o console para mais detalhes.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="animate-fade-in">
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

        {/* Seletor de Ligas - Dropdown Premium */}
        <div className="relative mt-4">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-[#00e5ff] hover:bg-white/20 transition-all"
          >
            <Globe size={18} />
            {getSelectedLeagueName()}
            <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-[#0b111b]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
              <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-4">
                <button
                  type="button"
                  onClick={() => { setSelectedLeague('global'); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${selectedLeague === 'global' ? 'bg-[#00e5ff] text-[#0b111b]' : 'text-gray-400 hover:bg-white/5'}`}
                >
                  🌎 Mercado Global
                </button>

                {leagues.map((category) => (
                  <div key={category.category} className="space-y-1">
                    <p className="px-3 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">{category.category}</p>
                    {category.items.map((league) => (
                      <button
                        key={league.id}
                        type="button"
                        onClick={() => {
                          setSelectedLeague(league.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${selectedLeague === league.id ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30' : 'text-gray-300 hover:bg-white/5 border border-transparent'}`}
                      >
                        {league.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Grid de Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
