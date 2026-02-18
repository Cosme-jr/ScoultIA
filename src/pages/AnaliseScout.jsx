import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeTechnicalScout } from '../lib/geminiClient';
import { supabase } from '../lib/supabaseClient';
import { BrainCircuit, Send, ArrowLeft, CheckCircle2, AlertCircle, Save, User, Check } from 'lucide-react';

const AnaliseScout = () => {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [selectedAtletaId, setSelectedAtletaId] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const fetchProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('*');
      
      if (error) throw error;
      console.log('Atletas carregados:', data);
      setProfissionais(data || []);
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!report.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeTechnicalScout(report);
      setResult(data);
    } catch (err) {
      setError('Falha na conexão com o cérebro da IA. Verifique sua chave de API.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAtletaId || !result) {
      alert('Por favor, selecione um atleta e realize a análise antes de salvar.');
      return;
    }

    const selectedAtleta = profissionais.find(p => p.id === selectedAtletaId);
    if (!selectedAtleta) return;

    try {
      const payload = {
        profissional_id: selectedAtletaId,
        clube_id: selectedAtleta.clube_id,
        data_observacao: new Date().toISOString().split('T')[0],
        observacoes: result.resumo,
        nota_tecnica: parseFloat(result.notas.tecnica || 0),
        nota_tatica: parseFloat(result.notas.tatica || 0),
        nota_fisica: parseFloat(result.notas.fisica || 0),
        nota_psicologica: parseFloat(result.notas.psicologica || 0)
      };

      console.log('Objeto sendo salvo:', payload);

      const { data, error } = await supabase
        .from('relatorios_campo')
        .insert([payload]);

      if (error) {
        console.error('Erro detalhado do Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      alert('Scout registrado com sucesso!');
      
      // Limpeza do formulário após sucesso
      setReport('');
      setResult(null);
      setSelectedAtletaId('');
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro ao salvar relatório:', err);
      alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-['JetBrains_Mono']">
      <header className="mb-8 flex items-center justify-between">
        <div>
        <div className="flex items-center gap-6">
          <h1 className="text-5xl font-['Bebas_Neue'] text-primary tracking-wider">
            NOVA ANÁLISE DE SCOUT
          </h1>
        </div>
        </div>
        <BrainCircuit size={48} className="text-primary opacity-50" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
        {/* Input Section */}
        <div className="bg-glass backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-gray-400 uppercase tracking-tighter font-bold flex items-center gap-2">
              <User size={14} className="text-primary" /> Vincular Atleta
            </label>
            <select
              value={selectedAtletaId}
              onChange={(e) => setSelectedAtletaId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-all mb-2"
            >
              <option value="" className="bg-dark">Selecione o Atleta...</option>
              {profissionais.map((atleta) => (
                <option key={atleta.id} value={atleta.id} className="bg-dark">
                  {atleta.nome || atleta.nome_profissional || 'Atleta sem nome'}
                </option>
              ))}
            </select>
          </div>

          <label className="text-gray-400 uppercase tracking-tighter font-bold">Relatório do Jogo / Observações</label>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="Cole aqui o scout ou observações técnicas do atleta durante a partida..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none min-h-[300px]"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !report.trim()}
            className={`
              w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all
              ${loading 
                ? 'bg-primary/20 text-primary border border-primary/30 animate-pulse' 
                : 'bg-primary text-dark hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {loading ? (
              <>
                <BrainCircuit size={20} className="animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Send size={20} />
                Analisar com Cérebro IA
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="bg-glass/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center opacity-40">
              <BrainCircuit size={64} className="mb-4" />
              <p className="max-w-xs uppercase tracking-widest">Aguardando dados para processamento neural...</p>
            </div>
          )}

          {loading && (
            <div className="bg-glass/20 border border-primary/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-6"></div>
              <p className="text-primary font-bold animate-pulse text-xl">SINCRONIZANDO NEURÔNIOS...</p>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              <div className="bg-glass backdrop-blur-md border border-primary/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-['Bebas_Neue'] text-primary tracking-wide">
                      {result.atleta}
                    </h2>
                    <p className="text-xs text-gray-400 uppercase">{result.posicao}</p>
                  </div>
                  <CheckCircle2 size={32} className="text-primary" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {Object.entries(result.notas).map(([key, val]) => (
                    <div key={key} className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-500 uppercase">{key}</span>
                        <span className="text-primary font-bold">{val}</span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary shadow-[0_0_10px_rgba(0,212,255,1)]" 
                          style={{ width: `${val * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <h3 className="text-[10px] text-gray-500 uppercase mb-2 font-bold tracking-widest">Resumo Técnico</h3>
                  <p className="text-gray-300 leading-relaxed italic">
                    "{result.resumo}"
                  </p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !selectedAtletaId}
                className={`
                  w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-2
                  ${saving 
                    ? 'border-[#00D4FF]/30 text-[#00D4FF]/50 bg-[#00D4FF]/5' 
                    : 'bg-[#00D4FF] text-dark border-[#00D4FF] hover:bg-transparent hover:text-[#00D4FF] hover:scale-[1.02] active:scale-95 shadow-[0_10px_40px_rgba(0,212,255,0.3)]'}
                  disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale
                `}
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin"></div>
                    Salvando no Banco...
                  </>
                ) : (
                  <>
                    <Check size={24} />
                    Confirmar e Salvar no Banco
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnaliseScout;
