import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Upload, User, Eye, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Colaborador',
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

export const Settings = () => {
  const { user, users, addUser, editUser, deleteUser, fetchUsers } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '', email: '', document: '', phone: '', password: '', role: 'employee', avatar_url: ''
  });
  
  const [editingId, setEditingId] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => {
    const roleName = ROLE_NAMES[u.role] || u.role;
    return u.name.toLowerCase().includes(searchQuery.toLowerCase()) || roleName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (userId) => {
    if (!avatarFile) return formData.avatar_url || null;
    setUploading(true);
    const ext = avatarFile.name.split('.').pop();
    const path = `avatars/${userId || Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true });
    setUploading(false);
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const avatar_url = await uploadAvatar(editingId);
      await editUser(editingId, {
        name: formData.name, email: formData.email,
        document: formData.document, phone: formData.phone, 
        role: formData.role,
        ...(avatar_url ? { avatar_url } : {}),
        ...(formData.password ? { password: formData.password } : {})
      });
      // Force-refresh the full users list so the table shows the new avatar immediately
      await fetchUsers();
      addToast('Usuário atualizado com sucesso!', 'success');
      setEditingId(null);
    } else {
      // Create user first (without avatar_url) to get the ID
      const tempUser = {
        name: formData.name, email: formData.email,
        document: formData.document, phone: formData.phone,
        password: formData.password,
        role: formData.role
      };
      const { data: created, error } = await supabase.from('users').insert([tempUser]).select().single();
      if (error) { console.error(error); return; }
      
      // Upload avatar if provided
      if (avatarFile && created?.id) {
        const avatar_url = await uploadAvatar(created.id);
        if (avatar_url) {
          await supabase.from('users').update({ avatar_url }).eq('id', created.id);
        }
      }
    }
    setFormData({ name: '', email: '', document: '', phone: '', password: '', role: 'employee', avatar_url: '' });
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const handleEditClick = (u) => {
    setEditingId(u.id);
    setFormData({ 
      name: u.name, email: u.email, document: u.document, phone: u.phone || '', 
      role: u.role, password: '', avatar_url: u.avatar_url || '' 
    });
    setAvatarPreview(u.avatar_url || null);
    setAvatarFile(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', document: '', phone: '', password: '', role: 'employee', avatar_url: '' });
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>{isAdmin ? 'Gestão de Usuários' : 'Diretório da Equipe'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{isAdmin ? 'Crie e gerencie os acessos da equipe' : 'Visualize e entre em contato com os membros da equipe'}</p>
        </div>
      </div>

      <div className={isAdmin ? 'grid-cards' : ''} style={isAdmin ? { display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.5fr)', gap: '24px' } : { width: '100%' }}>
        {isAdmin && (
          /* Form Panel */
          <div className="glass-panel" style={{ padding: '32px', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '24px', color: '#1e293b' }}>
              {editingId ? 'Editar Usuário' : 'Criar Novo Usuário'}
            </h3>
            <form onSubmit={handleSubmit}>
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
                      <Upload size={14} /> {avatarPreview ? 'Trocar Foto' : 'Selecionar Foto'}
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        style={{ display: 'block', marginTop: '6px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => { setAvatarPreview(null); setAvatarFile(null); setFormData(p => ({...p, avatar_url: ''})); }}
                      >
                        Remover foto
                      </button>
                    )}
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>JPG, PNG, WebP — máx. 2MB</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Nome Completo</label>
                <input type="text" placeholder="Nome do usuário" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>E-mail Corporativo</label>
                <input type="email" placeholder="usuario@verto.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label>Documento (CPF/CNPJ)</label>
                  <input type="text" placeholder="000.000.000-00" value={formData.document} onChange={e => setFormData({ ...formData, document: e.target.value })} required />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label>Telefone</label>
                  <input type="text" placeholder="(00) 00000-0000" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} />
                </div>
              </div>

              <div className="form-group">
                <label>Senha de Acesso {editingId && <span style={{ fontWeight: 400, color: '#94a3b8' }}>(deixe vazio para não alterar)</span>}</label>
                <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingId} />
              </div>

              <div className="form-group">
                <label>Cargo / Permissão</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                  <option value="admin">Administrador</option>
                  <option value="finance">Financeiro</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="employee">Colaborador</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#1d3e83' }} disabled={uploading}>
                  {uploading ? 'Salvando...' : editingId ? 'Salvar Alterações' : <><Plus size={18} /> Criar Usuário</>}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="glass-panel" style={{ padding: '32px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Usuários Cadastrados</h3>
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou cargo..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', maxWidth: '300px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>
          <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table style={{ fontSize: '0.9rem', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '16px' }}>USUÁRIO</th>
                  <th>E-MAIL</th>
                  <th style={{ textAlign: 'center' }}>CARGO</th>
                  <th style={{ textAlign: 'center' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: '#f1f5f9', border: '1px solid #e2e8f0',
                          overflow: 'hidden', flexShrink: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center'
                        }}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={16} color="#94a3b8" />
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{u.email}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-info" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>
                        {ROLE_NAMES[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          className="btn" 
                          style={{ padding: '6px', background: '#fff', border: '1px solid #cbd5e1', color: '#25D366', borderRadius: '6px' }} 
                          onClick={() => {
                            if (!u.phone) { addToast('Este usuário não possui telefone cadastrado.', 'error'); return; }
                            const cleanPhone = u.phone.replace(/\D/g, '');
                            window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}`, '_blank');
                          }} 
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #cbd5e1', color: '#10b981', borderRadius: '6px' }} onClick={() => setViewingUser(u)} title="Ver dados">
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <>
                            <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #cbd5e1', color: '#3b82f6', borderRadius: '6px' }} onClick={() => handleEditClick(u)} title="Editar">
                              <Edit2 size={16} />
                            </button>
                            <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #cbd5e1', color: '#ef4444', borderRadius: '6px' }} 
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir o usuário ${u.name}? Esta ação não pode ser desfeita.`)) {
                                  deleteUser(u.id);
                                }
                              }} 
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewingUser && (
        <Modal title="Detalhes do Usuário" onClose={() => setViewingUser(null)} maxWidth="500px">
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {viewingUser.avatar_url ? (
                  <img src={viewingUser.avatar_url} alt={viewingUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} color="#94a3b8" />
                )}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#1e293b' }}>{viewingUser.name}</h3>
                <span className="badge badge-info" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>
                  {ROLE_NAMES[viewingUser.role] || viewingUser.role}
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>E-mail</label>
                <div style={{ color: '#1e293b' }}>{viewingUser.email}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Documento (CPF/CNPJ)</label>
                <div style={{ color: '#1e293b' }}>{viewingUser.document}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Telefone</label>
                <div style={{ color: '#1e293b' }}>{viewingUser.phone || '——'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => setViewingUser(null)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
