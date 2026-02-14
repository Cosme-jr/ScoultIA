import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Falha ao entrar no sistema. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <div className="overlay"></div>
                <div className="content-left">
                    <h1 className="logo-title fade-in-slide">SCOUT AI PRO</h1>
                    <p className="tagline fade-in-slide delay-1">
                        Inteligência que transforma dados em decisões
                    </p>
                </div>
            </div>
            <div className="login-right">
                <form className="login-form fade-in-slide delay-2" onSubmit={handleLogin}>
                    <h2 className="form-title text-cyan">LOGIN</h2>
                    
                    {error && <p className="error-message">{error}</p>}

                    <div className="input-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'ENTRAR NO SISTEMA'}
                    </button>

                    <a href="#" className="forgot-password">Esqueci minha senha</a>
                </form>
            </div>
        </div>
    );
};

export default Login;
