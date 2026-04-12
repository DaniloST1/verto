import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';
const VIDEO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/video-fundo-tela-login.mp4';

export const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'reset'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(identifier, password);
    setLoading(false);
    if (success) navigate('/');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Look up the user by email and update the password field to a temp one, or use supabase auth
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', resetEmail)
      .single();

    if (error || !data) {
      setLoading(false);
      // Still show success for security (don't reveal if email exists)
      setResetSent(true);
      return;
    }

    // Generate temp password and update
    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
    await supabase.from('users').update({ password: tempPassword }).eq('id', data.id);

    setLoading(false);
    setResetSent(true);
  };

  return (
    <div className="login-container">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Dark overlay 70% opacity */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.70)',
        zIndex: 1,
      }} />

      {/* Login / Reset Card */}
      <div className="login-box" style={{ position: 'relative', zIndex: 2 }}>
        <div className="login-header">
          <img
            src={LOGO_URL}
            alt="Verto Logo"
            style={{ maxHeight: '80px', maxWidth: '100%', marginBottom: '12px', objectFit: 'contain' }}
            onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
          />
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Soluções em Licitações
          </p>
        </div>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  placeholder="CPF, CNPJ ou E-mail"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', marginTop: '4px', padding: '14px', fontSize: '1rem', background: '#1d3e83' }}
              >
                {loading ? <div className="loader" style={{ margin: '0 auto' }}></div> : 'Entrar na Plataforma'}
              </button>
            </form>
            <button
              onClick={() => { setMode('reset'); setResetSent(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: '0.85rem',
                textAlign: 'center', marginTop: '-8px', textDecoration: 'underline',
                transition: 'color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#1d3e83'}
              onMouseOut={e => e.currentTarget.style.color = '#64748b'}
            >
              Esqueci minha senha
            </button>
          </>
        ) : (
          <>
            {resetSent ? (
              <div style={{ textAlign: 'center', color: '#1e293b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✅</div>
                <p style={{ marginBottom: '8px', fontWeight: 600 }}>E-mail processado!</p>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Se o e-mail estiver cadastrado, um administrador será notificado para resetar sua senha.
                </p>
                <button
                  onClick={() => setMode('login')}
                  className="btn btn-primary"
                  style={{ background: '#1d3e83' }}
                >
                  <ArrowLeft size={16} /> Voltar ao Login
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <h3 style={{ color: '#1e293b', fontWeight: 700, marginBottom: '4px' }}>Redefinir Senha</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    Informe seu e-mail cadastrado para solicitar a redefinição de senha.
                  </p>
                </div>
                <form onSubmit={handleResetPassword} className="login-form">
                  <div className="input-group">
                    <Mail className="input-icon" size={20} />
                    <input
                      type="email"
                      placeholder="Seu e-mail cadastrado"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: '100%', background: '#1d3e83', padding: '14px' }}
                  >
                    {loading ? <div className="loader" style={{ margin: '0 auto' }}></div> : 'Enviar Solicitação'}
                  </button>
                </form>
                <button
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#64748b', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginTop: '-8px', textDecoration: 'underline'
                  }}
                >
                  <ArrowLeft size={14} /> Voltar ao Login
                </button>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .login-box {
          width: 100%;
          max-width: 420px;
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          animation: fadeIn 0.6s ease-out;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.5);
        }
        .login-header {
          text-align: center;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-group .input-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          z-index: 1;
        }
        .input-group input {
          padding-left: 48px;
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          color: #1e293b !important;
          border-radius: 10px;
        }
        .input-group input::placeholder {
          color: #94a3b8 !important;
        }
        .input-group input:focus {
          border-color: #1d3e83 !important;
          box-shadow: 0 0 0 3px rgba(29,62,131,0.1) !important;
          background: #fff !important;
        }
      `}</style>
    </div>
  );
};
