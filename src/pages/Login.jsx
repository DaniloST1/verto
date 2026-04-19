import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Mail, ArrowLeft, Building2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';
const VIDEO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/video-fundo-tela-login.mp4';

const maskCnpj = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 14);
  return v
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const Login = () => {
  // 'login' | 'reset' | 'client-cnpj' | 'client-register'
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');

  // Client first-access states
  const [cnpj, setCnpj] = useState('');
  const [validatedClient, setValidatedClient] = useState(null); // The DB client record

  const { login, registerClient } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const loggedUser = await login(identifier, password);
    setLoading(false);
    if (loggedUser) {
      if (loggedUser.is_first_login) {
        navigate('/update-profile');
      } else {
        navigate('/');
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', resetEmail)
      .single();

    if (error || !data) {
      setLoading(false);
      setResetSent(true);
      return;
    }

    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
    await supabase.from('users').update({ password: tempPassword }).eq('id', data.id);
    setLoading(false);
    setResetSent(true);
  };

  // Step 1: Validate CNPJ against clients table
  const handleCnpjValidation = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length < 14) {
      setError('Por favor, informe um CNPJ v\u00e1lido com 14 d\u00edgitos.');
      setLoading(false);
      return;
    }
    // Build formatted CNPJ (XX.XXX.XXX/XXXX-XX) — matches DB storage format
    const formattedCnpj = cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

    // Check if a user already exists with this CNPJ document
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('document', cleanCnpj)
      .eq('role', 'client')
      .maybeSingle();

    if (existingUser) {
      setError('Este CNPJ j\u00e1 possui uma conta cadastrada. Por favor, fa\u00e7a o login normalmente.');
      setLoading(false);
      return;
    }

    // Check if client is registered in clients table (using formatted CNPJ)
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('cnpj', formattedCnpj)
      .maybeSingle();

    setLoading(false);
    if (clientError || !clientData) {
      setError('CNPJ n\u00e3o encontrado. Este CNPJ n\u00e3o est\u00e1 cadastrado no sistema. Entre em contato com a equipe Verto.');
      return;
    }

    setValidatedClient(clientData);
    setMode('client-register');
  };

  return (
    <div className="login-container">
      {/* Video background */}
      <video
        autoPlay loop muted playsInline
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0 }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Dark overlay 70% opacity */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.70)', zIndex: 1 }} />

      {/* Card */}
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

        {/* ─── LOGIN ─── */}
        {mode === 'login' && (
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

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '-8px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>ou</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Client first access button */}
            <button
              onClick={() => { setMode('client-cnpj'); setError(''); setCnpj(''); }}
              style={{
                width: '100%',
                padding: '13px',
                border: '2px solid #1d3e83',
                borderRadius: '10px',
                background: 'transparent',
                color: '#1d3e83',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginTop: '-8px',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#1d3e83'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1d3e83'; }}
            >
              <Building2 size={18} /> Primeiro Acesso — Sou Cliente
            </button>

            <button
              onClick={() => { setMode('reset'); setResetSent(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: '0.85rem',
                textAlign: 'center', marginTop: '-16px', textDecoration: 'underline',
                transition: 'color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#1d3e83'}
              onMouseOut={e => e.currentTarget.style.color = '#64748b'}
            >
              Esqueci minha senha
            </button>
          </>
        )}

        {/* ─── CLIENT CNPJ VALIDATION ─── */}
        {mode === 'client-cnpj' && (
          <>
            <div style={{ textAlign: 'center', marginTop: '-8px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: 700, marginBottom: '4px' }}>Primeiro Acesso — Cliente</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Informe o CNPJ da sua empresa para verificar seu cadastro.
              </p>
            </div>
            <form onSubmit={handleCnpjValidation} className="login-form">
              <div className="input-group">
                <Building2 className="input-icon" size={20} />
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={e => { setCnpj(maskCnpj(e.target.value)); setError(''); }}
                  maxLength={18}
                  required
                />
              </div>
              {error && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', background: '#fef2f2',
                  border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem', fontWeight: 500
                }}>
                  ⚠️ {error}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '14px', background: '#1d3e83', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? <div className="loader" style={{ margin: '0 auto' }}></div> : <><ArrowRight size={18} /> Verificar CNPJ</>}
              </button>
            </form>
            <button
              onClick={() => setMode('login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-8px', textDecoration: 'underline' }}
            >
              <ArrowLeft size={14} /> Voltar ao Login
            </button>
          </>
        )}

        {/* ─── CLIENT REGISTRATION FORM ─── */}
        {mode === 'client-register' && validatedClient && (
          <ClientRegisterForm
            clientData={validatedClient}
            onBack={() => setMode('client-cnpj')}
            onSuccess={() => {
              setMode('login');
              setIdentifier('');
              setPassword('');
            }}
            registerClient={registerClient}
          />
        )}

        {/* ─── RESET ─── */}
        {mode === 'reset' && (
          <>
            {resetSent ? (
              <div style={{ textAlign: 'center', color: '#1e293b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✅</div>
                <p style={{ marginBottom: '8px', fontWeight: 600 }}>E-mail processado!</p>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Se o e-mail estiver cadastrado, um administrador será notificado para resetar sua senha.
                </p>
                <button onClick={() => setMode('login')} className="btn btn-primary" style={{ background: '#1d3e83' }}>
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-8px', textDecoration: 'underline' }}
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
          gap: 20px;
          animation: fadeIn 0.6s ease-out;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.5);
          max-height: 94vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .login-box::-webkit-scrollbar { width: 6px; }
        .login-box::-webkit-scrollbar-track { background: transparent; }
        .login-box::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ─── Inline Client Registration Form ───────────────────────────────────────────
import { useRef } from 'react';
import { User as UserIcon, Shield, Eye, EyeOff, CheckCircle, Upload } from 'lucide-react';

const BUCKET = 'Verto imagens';

const maskPhone = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
};

const maskCpfDoc = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
            .replace(/(\d{3})(\d{3})/, '$1.$2');
  }
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
          .replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4')
          .replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
};

const ClientRegisterForm = ({ clientData, onBack, onSuccess, registerClient }) => {
  const fileInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    document: maskCpfDoc(clientData.cnpj || ''),
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const requirements = [
    { label: 'Ter no mínimo 8 caracteres', satisfied: formData.password.length >= 8 },
    { label: 'Ter no mínimo 1 número', satisfied: /\d/.test(formData.password) },
    { label: 'Ter no mínimo 1 letra maiúscula', satisfied: /[A-Z]/.test(formData.password) },
    { label: 'Ter no mínimo 1 letra minúscula', satisfied: /[a-z]/.test(formData.password) },
    { label: 'Ter no mínimo 1 caractere especial', satisfied: /[@$!%*?&]/.test(formData.password) },
  ];
  const allSatisfied = requirements.every(r => r.satisfied);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!allSatisfied) { setErrorMsg('A senha não atende aos requisitos de segurança.'); return; }
    if (formData.password !== formData.confirmPassword) { setErrorMsg('As senhas não coincidem.'); return; }
    if (!avatarPreview) { setErrorMsg('A foto de perfil é obrigatória.'); return; }

    setLoading(true);
    try {
      let avatar_url = null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/client_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        avatar_url = data.publicUrl;
      }

      const cleanDoc = formData.document.replace(/\D/g, '');
      const result = await registerClient({
        name: formData.name,
        email: formData.email,
        document: cleanDoc,
        phone: formData.phone,
        password: formData.password,
        role: 'client',
        avatar_url,
        is_first_login: false,
      });

      if (result?.success) {
        setSuccessMsg('Conta criada com sucesso! Agora você pode fazer login com seu e-mail e senha.');
      }
    } catch (err) {
      setErrorMsg('Erro ao criar conta: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
        <h3 style={{ color: '#1e293b', fontWeight: 700, marginBottom: '8px' }}>Cadastro Concluído!</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>{successMsg}</p>
        <button onClick={onSuccess} className="btn btn-primary" style={{ background: '#1d3e83', width: '100%', padding: '13px' }}>
          <ArrowLeft size={16} /> Ir para o Login
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginTop: '-8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 16px', marginBottom: '8px' }}>
          <CheckCircle size={16} color="#10b981" />
          <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>CNPJ verificado: {clientData.name}</span>
        </div>
        <h3 style={{ color: '#1e293b', fontWeight: 700, marginBottom: '2px' }}>Complete seu Cadastro</h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem' }}>Preencha seus dados de acesso ao portal</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f1f5f9', border: '2px dashed #cbd5e1', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Upload size={24} color="#94a3b8" />
            )}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#1d3e83', fontWeight: 600, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            {avatarPreview ? 'Alterar Foto' : 'Adicionar Foto *'}
          </span>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
        </div>

        <div className="input-group">
          <UserIcon className="input-icon" size={18} />
          <input type="text" placeholder="Nome completo *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
        </div>

        <div className="input-group">
          <Shield className="input-icon" size={18} />
          <input type="email" placeholder="E-mail de acesso *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input
            type="text"
            placeholder="CPF/CNPJ"
            value={formData.document}
            onChange={e => setFormData({ ...formData, document: maskCpfDoc(e.target.value) })}
            maxLength={18}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', width: '100%', outline: 'none', fontSize: '0.9rem' }}
            onFocus={e => e.target.style.borderColor = '#1d3e83'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <input
            type="text"
            placeholder="Telefone"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
            maxLength={15}
            required
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', width: '100%', outline: 'none', fontSize: '0.9rem' }}
            onFocus={e => e.target.style.borderColor = '#1d3e83'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        <div style={{ height: '1px', background: '#e2e8f0' }} />

        <div className="input-group">
          <input type={showPassword ? 'text' : 'password'} placeholder="Criar senha *" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required style={{ paddingLeft: '14px' }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Password checklist */}
        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Sua senha deve:</p>
          {requirements.map((req, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: req.satisfied ? '#10b981' : '#94a3b8' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: `1px solid ${req.satisfied ? '#10b981' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: req.satisfied ? '#10b981' : 'transparent', color: '#fff', flexShrink: 0 }}>
                {req.satisfied && <CheckCircle size={7} />}
              </div>
              {req.label}
            </div>
          ))}
        </div>

        <div className="input-group">
          <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirmar senha *" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required style={{ paddingLeft: '14px' }} />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem', fontWeight: 500 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ padding: '13px', background: '#1d3e83', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? <div className="loader" style={{ margin: '0 auto' }}></div> : 'Criar Minha Conta'}
        </button>
      </form>

      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'underline', marginTop: '-8px' }}
      >
        <ArrowLeft size={13} /> Alterar CNPJ
      </button>
    </>
  );
};
