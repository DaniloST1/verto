import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, LogOut, Settings as SettingsIcon, Key, Upload, Menu } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Funcionário',
};

const BUCKET = 'Verto imagens';

export const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'profile', 'password'

  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    document: user?.document || ''
  });

  // Keep avatar preview in sync with user state
  useEffect(() => {
    setAvatarPreview(user?.avatar_url || null);
  }, [user?.avatar_url]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }
    if (passwordForm.new.length < 4) {
      addToast('A nova senha deve ter ao menos 4 caracteres.', 'error');
      return;
    }
    const { error } = await supabase
      .from('users')
      .update({ password: passwordForm.new })
      .eq('id', user.id);

    if (error) {
      addToast('Erro ao alterar senha: ' + error.message, 'error');
    } else {
      addToast('Senha alterada com sucesso!', 'success');
      setModalType(null);
      setPasswordForm({ current: '', new: '', confirm: '' });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
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
      document: profileForm.document,
      ...(avatar_url ? { avatar_url } : {})
    };

    const { error } = await supabase.from('users').update(updates).eq('id', user.id);
    setUploading(false);

    if (error) {
      addToast('Erro ao atualizar perfil: ' + error.message, 'error');
    } else {
      setAvatarFile(null);
      addToast('Perfil atualizado! Faça login novamente para refletir todas as mudanças.', 'success');
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

      <div className="search-bar"></div>
      
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
              style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}
              onClick={e => { e.stopPropagation(); setModalType('profile'); setDropdownOpen(false); }}
            >
              <SettingsIcon size={16} /> Alterar Cadastro
            </div>
            <div
              style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#1e293b' }}
              onClick={e => { e.stopPropagation(); setModalType('password'); setDropdownOpen(false); }}
            >
              <Key size={16} /> Alterar Senha
            </div>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {modalType === 'password' && (
        <Modal title="Alterar Senha" onClose={() => setModalType(null)} maxWidth="400px">
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Nova Senha</label>
              <input
                type="password"
                placeholder="Mínimo 4 caracteres"
                value={passwordForm.new}
                onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirmar Nova Senha</label>
              <input
                type="password"
                placeholder="Repita a senha"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Profile Modal */}
      {modalType === 'profile' && (
        <Modal title="Alterar Cadastro" onClose={() => setModalType(null)} maxWidth="420px">
          <form onSubmit={handleProfileSubmit}>
            {/* Avatar in profile modal */}
            <div className="form-group">
              <label>Foto de Perfil</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: '#f1f5f9', border: '2px dashed #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', flexShrink: 0
                  }}
                >
                  {avatarPreview || user?.avatar_url ? (
                    <img src={avatarPreview || user?.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={24} color="#94a3b8" />
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Trocar Foto
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            <div className="form-group">
              <label>Nome Completo</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Documento</label>
              <input type="text" value={profileForm.document} onChange={e => setProfileForm({...profileForm, document: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }} disabled={uploading}>
                {uploading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
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
      `}</style>
    </header>
  );
};
