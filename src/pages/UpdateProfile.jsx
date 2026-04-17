import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { User, Upload, Shield, CheckCircle } from 'lucide-react';

const BUCKET = 'Verto imagens';

const maskPhone = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const maskCpfCnpj = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const isValidPassword = (pass) => {
  if (!pass) return false;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /\d/.test(pass);
  const hasSpecial = /[@$!%*?&]/.test(pass);
  return pass.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial;
};

export const UpdateProfile = () => {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    document: user?.document || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: ''
  });

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
    if (formData.password && !isValidPassword(formData.password)) {
      addToast('A senha deve ter no mínimo 8 caracteres, incluir letras maiúsculas, minúsculas, números e caracteres especiais.', 'error');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }
    if (!avatarPreview) {
      addToast('Por favor, adicione uma foto de perfil.', 'warning');
      return;
    }

    setLoading(true);
    try {
      let avatar_url = user.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;
        await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true });
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        avatar_url = data.publicUrl;
      }

      const updates = {
        name: formData.name,
        document: formData.document.replace(/\D/g, ''),
        phone: formData.phone,
        avatar_url,
        is_first_login: false,
        ...(formData.password ? { password: formData.password } : {})
      };

      const { data: updated, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUser(updated);
      localStorage.setItem('verto_user', JSON.stringify(updated));
      addToast('Perfil atualizado com sucesso! Bem-vindo ao sistema.', 'success');
      navigate('/');
    } catch (err) {
      addToast('Erro ao atualizar perfil: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '20px' 
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px', borderRadius: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', height: '64px', background: '#e0f2fe', borderRadius: '16px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#0369a1' 
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '8px' }}>Primeiro Acesso</h1>
          <p style={{ color: '#64748b' }}>Complete seu cadastro para acessar o sistema Verto.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', 
                border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={40} color="#94a3b8" />
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ 
              background: 'none', border: 'none', color: '#1d3e83', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' 
            }}>
              <Upload size={14} style={{ marginRight: '4px' }} /> Escolher Foto Obrigatória
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
          </div>

          <div className="form-group">
            <label>Confirmar Nome Completo</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>CPF/CNPJ</label>
              <input type="text" value={formData.document} onChange={e => setFormData({...formData, document: maskCpfCnpj(e.target.value)})} maxLength={18} required />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} maxLength={15} required />
            </div>
          </div>

          <div className="nav-divider" style={{ margin: '8px 0' }}></div>

          <div className="form-group">
            <label>Definir Nova Senha Forte</label>
            <input type="password" placeholder="Mín. 8 caracteres, A-z, 0-9, @#$" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} minLength={8} required />
          </div>
          
          <div className="form-group">
            <label>Confirmar Nova Senha</label>
            <input type="password" placeholder="Repita a nova senha" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '48px', marginTop: '12px', background: '#1d3e83' }} disabled={loading}>
            {loading ? 'Salvando...' : <><CheckCircle size={18} /> Finalizar e Acessar</>}
          </button>
        </form>
      </div>
    </div>
  );
};
