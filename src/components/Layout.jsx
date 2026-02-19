import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-row min-h-screen bg-[#0b111b] text-white">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto p-8 no-scrollbar">
        {children}
      </main>
    </div>
  );
};

export default Layout;
