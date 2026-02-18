import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AnaliseScout from './pages/AnaliseScout';
import VisualizacaoPerformance from './pages/VisualizacaoPerformance';
import Mercado from './pages/Mercado';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rotas Protegidas/Com Layout */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/analise" element={<Layout><AnaliseScout /></Layout>} />
        <Route path="/mercado" element={<Layout><Mercado /></Layout>} />
        <Route path="/performance/:atletaId" element={<Layout><VisualizacaoPerformance /></Layout>} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
