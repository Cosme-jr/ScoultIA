import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, TrendingUp, BrainCircuit, LayoutDashboard, Search, LogOut } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Plantel', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'analise', label: 'Nova Análise', icon: BrainCircuit, path: '/analise' },
    { id: 'mercado', label: 'Mercado Global', icon: Search, path: '/mercado' },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#0b111b] border-r border-white/5 flex flex-col p-6 sticky top-0 h-screen">
      <div className="mb-12 px-4">
        <h1 className="text-2xl font-['Bebas_Neue'] text-[#00e5ff] tracking-widest uppercase">ScoutIA <span className="text-white/20">Pro</span></h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all group
                ${isActive 
                  ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <item.icon size={18} className={isActive ? 'text-[#00e5ff]' : 'text-gray-500 group-hover:text-white'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 px-2">
        <button 
          onClick={() => navigate('/login')}
          className="w-full flex items-center gap-4 px-4 py-3 text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          <LogOut size={16} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
