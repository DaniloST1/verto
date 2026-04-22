import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { User, Upload, Shield, CheckCircle, Eye, EyeOff } from 'lucide-react';

const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';
const VIDEO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/video-fundo-tela-login.mp4';
const BUCKET = 'Verto imagens';

const maskPhone = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
};

const maskCpfCnpj = (v = '') => {
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

export const UpdateProfile = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    document: user?.document || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: ''
  });

  const requirements = [
    { label: 'Ter no mínimo 8 caracteres', satisfied: formData.password.length >= 8 },
    { label: 'Ter no mínimo 1 número', satisfied: /\d/.test(formData.password) },
    { label: 'Ter no mínimo 1 letra maiúscula', satisfied: /[A-Z]/.test(formData.password) },
    { label: 'Ter no mínimo 1 letra minúscula', satisfied: /[a-z]/.test(formData.password) },
    { label: 'Ter no mínimo 1 caractere especial', satisfied: /[@$!%*?&]/.test(formData.password) },
  ];

  const allSatisfied = requirements.every(r => r.satisfied);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allSatisfied) {
      addToast('A senha não atende aos requisitos de segurança.', 'error');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }
    if (!avatarPreview) {
      addToast('A foto de perfil é obrigatória.', 'warning');
      return;
    }

    setLoading(true);
    try {
      let avatar_url = user.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        avatar_url = data.publicUrl;
      }

      const updates = {
        name: formData.name,
        email: formData.email,
        document: formData.document.replace(/\D/g, ''),
        phone: formData.phone,
        avatar_url,
        is_first_login: false,
        ...(formData.password ? { password: formData.password } : {})
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      logout('Perfil atualizado! Por favor, entre com sua nova senha.');
      navigate('/login');
    } catch (err) {
      console.error('Update profile error:', err);
      addToast('Erro ao atualizar: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Video background */}
      <video autoPlay loop muted playsInline style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0 }}>
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.70)', zIndex: 1 }} />

      {/* Centered Box */}
      <div className="login-box" style={{ 
        position: 'relative', zIndex: 2, maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '24px', padding: '40px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <a href="https://www.vertolicitacoes.com.br/" target="_blank" rel="noopener noreferrer">
            <img src={LOGO_URL} alt="Verto Logo" style={{ maxHeight: '60px', marginBottom: '8px' }} />
          </a>
          <h2 style={{ fontSize: '1.25rem', color: '#1e293b', margin: 0 }}>Primeiro Acesso</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Atualize seus dados para continuar</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', border: '2px solid #e2e8f0',
                cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={32} color="#94a3b8" />
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#1d3e83', fontWeight: 600, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              Alterar Foto
            </span>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '2px' }}>Nome Completo</label>
            <div className="input-group">
              <User className="input-icon" size={18} />
              <input type="text" placeholder="Seu nome completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '2px' }}>E-mail Corporativo</label>
            <div className="input-group">
              <Shield className="input-icon" size={18} />
              <input type="email" placeholder="usuario@verto.com.br" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '2px' }}>Documento (CPF/CNPJ)</label>
              <input 
                type="text" 
                placeholder="000.000.000-00" 
                value={formData.document} 
                onChange={e => setFormData({...formData, document: maskCpfCnpj(e.target.value)})} 
                maxLength={18} 
                required 
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#1d3e83'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '2px' }}>Telefone</label>
              <input 
                type="text" 
                placeholder="(00) 00000-0000" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} 
                maxLength={15} 
                required 
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#1d3e83'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

          {/* Passwords */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '2px' }}>Nova Senha</label>
              <div className="input-group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Defina uma senha forte" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  required 
                  style={{ paddingLeft: '14px' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ 
              padding: '12px', background: '#f8fafc', borderRadius: '8px', 
              border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Sua senha deve:</p>
              {requirements.map((req, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: req.satisfied ? '#10b981' : '#94a3b8' }}>
                  <div style={{ 
                    width: '12px', height: '12px', borderRadius: '50%', border: `1px solid ${req.satisfied ? '#10b981' : '#cbd5e1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: req.satisfied ? '#10b981' : 'transparent', color: '#fff'
                  }}>
                    {req.satisfied && <CheckCircle size={8} />}
                  </div>
                  {req.label}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '2px' }}>Confirmar Senha</label>
              <div className="input-group">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="Repita a nova senha" 
                  value={formData.confirmPassword} 
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                  required 
                  style={{ paddingLeft: '14px' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ padding: '14px', background: '#1d3e83', fontWeight: 600 }}
          >
            {loading ? 'Salvando...' : 'Finalizar e Acessar'}
          </button>
        </form>
      </div>

      <style>{`
        .login-container { 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          overflow: hidden; 
          position: relative;
        }
        .login-box { 
          width: 100%; 
          animation: fadeIn 0.6s ease-out; 
          background: #ffffff; 
          border-radius: 20px; 
          box-shadow: 0 25px 80px rgba(0,0,0,0.5); 
          /* Custom scrollbar for better look */
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .login-box::-webkit-scrollbar { width: 6px; }
        .login-box::-webkit-scrollbar-track { background: transparent; }
        .login-box::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        
        .input-group { position: relative; display: flex; align-items: center; }
        .input-group .input-icon { position: absolute; left: 14px; color: #94a3b8; }
        .input-group input { padding: 10px 14px 10px 42px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; transition: all 0.2s; }
        .input-group input:focus { border-color: #1d3e83; background: #fff; outline: none; box-shadow: 0 0 0 3px rgba(29,62,131,0.1); }
        .btn-primary:active { transform: scale(0.98); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
