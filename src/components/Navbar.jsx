import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, LogOut, Settings as SettingsIcon, Key, Upload, Menu, Eye, EyeOff, CheckCircle, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { QRCodeSVG } from 'qrcode.react';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Colaborador',
  client: 'Cliente',
};

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

export const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'profile' | 'whatsapp'
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const fetchQR = async () => {
    setLoadingQr(true);
    try {
      const res = await fetch('https://chatboot-verto.onrender.com/api/qr');
      const data = await res.json();
      setQrData(data);
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
    } finally {
      setLoadingQr(false);
    }
  };

  useEffect(() => {
    if (modalType === 'whatsapp') {
      fetchQR();
      const interval = setInterval(fetchQR, 5000); // Atualiza a cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [modalType]);

  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    document: maskCpfCnpj(user?.document || ''),
    phone: maskPhone(user?.phone || ''),
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const requirements = [
    { label: 'Ter no mínimo 8 caracteres', satisfied: profileForm.password.length >= 8 },
    { label: 'Ter no mínimo 1 número', satisfied: /\d/.test(profileForm.password) },
    { label: 'Ter no mínimo 1 letra maiúscula', satisfied: /[A-Z]/.test(profileForm.password) },
    { label: 'Ter no mínimo 1 letra minúscula', satisfied: /[a-z]/.test(profileForm.password) },
    { label: 'Ter no mínimo 1 caractere especial', satisfied: /[@$!%*?&]/.test(profileForm.password) },
  ];
  const allSatisfied = requirements.every(r => r.satisfied);

  // Keep avatar preview in sync with user state
  useEffect(() => {
    setAvatarPreview(user?.avatar_url || null);
    if (user && !profileForm.name) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        document: maskCpfCnpj(user.document || ''),
        phone: maskPhone(user.phone || ''),
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileForm.password) {
      if (!allSatisfied) {
        addToast('A senha não atende a todos os requisitos de segurança.', 'error');
        return;
      }
      if (profileForm.password !== profileForm.confirmPassword) {
        addToast('As senhas não coincidem.', 'error');
        return;
      }
    }

    setUploading(true);
    let avatar_url = user?.avatar_url || null;
    
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        avatar_url = data.publicUrl;
      }
    }

    const updates = {
      name: profileForm.name,
      email: profileForm.email,
      document: profileForm.document.replace(/\D/g, ''),
      phone: profileForm.phone.replace(/\D/g, ''),
      ...(avatar_url ? { avatar_url } : {}),
      ...(profileForm.password ? { password: profileForm.password } : {})
    };

    const { error } = await supabase.from('users').update(updates).eq('id', user.id);
    setUploading(false);

    if (error) {
      addToast('Erro ao atualizar cadastro: ' + error.message, 'error');
    } else {
      setAvatarFile(null);
      setProfileForm({ ...profileForm, password: '', confirmPassword: '' });
      addToast('Cadastro atualizado! Faça login novamente para ver todas as mudanças caso dados críticos tenham sido alterados.', 'success');
      setModalType(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = (e) => { if (dropdownOpen) setDropdownOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dropdownOpen]);

  return (
    <header className="navbar glass-panel" style={{ position: 'relative' }}>
      {/* Hamburger - mobile only */}
      <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      <div className="search-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button 
            onClick={() => setModalType('whatsapp')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: '#25D366', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(37,211,102,0.3)'
            }}
          >
            <MessageCircle size={18} />
            Conectar Robô
          </button>
        )}
      </div>
      
      <div
        className="user-profile"
        onClick={e => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className="user-role">{ROLE_NAMES[user?.role] || user?.role}</span>
        </div>

        {/* Avatar circle */}
        <div className="avatar" style={{ overflow: 'hidden' }}>
          {avatarPreview || user?.avatar_url ? (
            <img
              src={avatarPreview || user?.avatar_url}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <User size={20} />
          )}
        </div>

        <button className="btn-logout" onClick={e => { e.stopPropagation(); logout(); }} title="Sair">
          <LogOut size={18} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: '100%', right: '40px', marginTop: '8px', width: '200px',
            background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0', zIndex: 200, overflow: 'hidden'
          }}>
            <div
              style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#1e293b' }}
              onClick={e => { e.stopPropagation(); setModalType('profile'); setDropdownOpen(false); }}
            >
              <SettingsIcon size={16} /> Alterar Cadastro
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {modalType === 'profile' && (
        <Modal title="Alterar Cadastro" onClose={() => setModalType(null)} maxWidth="550px">
          <form onSubmit={handleProfileSubmit}>
            {/* Avatar Upload */}
            <div className="form-group">
              <label>Foto do Usuário</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: '#f1f5f9', border: '2px dashed #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                    transition: 'border-color 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#1d3e83'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={28} color="#94a3b8" />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} /> Selecionar Foto
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>JPG, PNG, WebP — máx. 2MB</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Nome Completo</label>
              <input type="text" placeholder="Nome do usuário" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
            </div>

            <div className="form-group">
              <label>E-mail Corporativo</label>
              <input type="email" placeholder="usuario@verto.com" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} required style={{ background: '#eef2ff' }} />
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 200px' }}>
                <label>Documento (CPF/CNPJ)</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00" 
                  value={profileForm.document} 
                  onChange={e => setProfileForm({ ...profileForm, document: maskCpfCnpj(e.target.value) })} 
                  maxLength={18}
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 200px' }}>
                <label>Telefone</label>
                <input 
                  type="text" 
                  placeholder="(00) 00000-0000" 
                  value={profileForm.phone} 
                  onChange={e => setProfileForm({ ...profileForm, phone: maskPhone(e.target.value) })} 
                  maxLength={15}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha de Acesso <span style={{ fontWeight: 400, color: '#94a3b8' }}>(deixe vazio para não alterar)</span></label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={profileForm.password} 
                  onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} 
                  style={{ paddingRight: '40px', background: '#eef2ff' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {profileForm.password && (
                <div style={{ 
                  marginTop: '10px', padding: '12px', background: '#f8fafc', 
                  borderRadius: '8px', border: '1px solid #e2e8f0',
                  display: 'flex', flexDirection: 'column', gap: '6px'
                }}>
                  {requirements.map((req, i) => (
                    <div key={i} style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      fontSize: '0.75rem', color: req.satisfied ? '#10b981' : '#94a3b8'
                    }}>
                      <div style={{ 
                        width: '14px', height: '14px', borderRadius: '50%', 
                        border: `1px solid ${req.satisfied ? '#10b981' : '#cbd5e1'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: req.satisfied ? '#10b981' : 'transparent',
                        color: '#fff'
                      }}>
                        {req.satisfied && <CheckCircle size={8} />}
                      </div>
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '4px' }}>
              <label>Confirmar Senha</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="Repita a nova senha" 
                  value={profileForm.confirmPassword} 
                  onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} 
                  style={{ paddingRight: '40px', background: '#eef2ff' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ 
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83', padding: '10px 24px' }} disabled={uploading}>
                {uploading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </Modal>
      {/* WhatsApp Modal */}
      {modalType === 'whatsapp' && (
        <Modal title="Conexão do WhatsApp (Robô)" onClose={() => setModalType(null)} maxWidth="450px">
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            {qrData?.connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '80px', height: '80px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={40} color="#10b981" />
                </div>
                <h3 style={{ margin: 0, color: '#1e293b' }}>O Robô já está conectado!</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Ele já está online e pronto para responder os clientes automaticamente.</p>
              </div>
            ) : qrData?.qr ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                  <QRCodeSVG value={qrData.qr} size={256} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Escaneie o QR Code</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Abra o WhatsApp no celular da empresa, vá em "Aparelhos Conectados" e aponte a câmera para esta tela.
                </p>
                <button 
                  onClick={fetchQR} 
                  disabled={loadingQr}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', background: '#f1f5f9', color: '#475569',
                    border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={16} className={loadingQr ? 'spin' : ''} />
                  Atualizar QR Code
                </button>
              </div>
            ) : (
              <div style={{ padding: '40px 0', color: '#64748b' }}>
                <RefreshCw size={32} className="spin" style={{ marginBottom: '16px', color: '#94a3b8' }} />
                <p>Gerando código... Aguarde.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>(Pode demorar alguns minutos na primeira vez)</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <style>{`
        .navbar {
          height: 70px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; margin-bottom: 24px; border-radius: 16px; gap: 16px;
        }
        .hamburger-btn {
          display: none;
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          color: #1e293b;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
        }
        .user-profile { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .user-info { display: flex; flex-direction: column; align-items: flex-end; }
        .user-name { font-weight: 600; font-size: 0.95rem; }
        .user-role { font-size: 0.75rem; color: var(--primary); text-transform: uppercase; font-weight: 700; }
        .avatar {
          width: 40px; height: 40px; border-radius: 50%; background: #f8fafc;
          display: flex; align-items: center; justify-content: center; color: #94a3b8;
          border: 2px solid var(--primary); position: relative;
          box-shadow: 0 0 0 3px rgba(33,60,122,0.1);
          flex-shrink: 0;
        }
        .btn-logout {
          background: transparent; border: none; color: #94a3b8; cursor: pointer;
          padding: 8px; border-radius: 8px; transition: all 0.2s;
        }
        .btn-logout:hover { background: #fee2e2; color: #ef4444; }

        @media (max-width: 768px) {
          .hamburger-btn { display: flex; }
          .navbar { padding: 0 14px; }
          .user-name { display: none; }
          .user-role { display: none; }
          .user-info { display: none; }
        }
        @media (max-width: 480px) {
          .btn-logout { padding: 6px; }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
};

