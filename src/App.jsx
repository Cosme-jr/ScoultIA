import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AnaliseScout from './pages/AnaliseScout';
import VisualizacaoPerformance from './pages/VisualizacaoPerformance';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analise" element={<AnaliseScout />} />
        <Route path="/performance/:atletaId" element={<VisualizacaoPerformance />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
