import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#0b111b] text-white">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto no-scrollbar">
        {children}
      </main>
    </div>
  );
};

export default Layout;
