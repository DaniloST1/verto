import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import { Modal } from '../components/Modal';
import { 
  Plus, Edit2, Trash2, Eye, X, Image as ImageIcon, 
  CheckSquare, List, MessageSquare, Link as LinkIcon, AlertCircle, Upload 
} from 'lucide-react';

const STORAGE_KEY = 'verto_ti_optimizations';
const BUCKET = 'Verto imagens';

export const Tickets = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State for items (mocking DB with localStorage for now)
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const emptyForm = {
    title: '',
    priority: 'Média',
    status: 'To do',
    url: '',
    description: '',
    images: [],
    checklist: [],
    updates: []
  };
  const [formData, setFormData] = useState(emptyForm);

  // View State (Updates & Checklist inputs)
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newUpdate, setNewUpdate] = useState('');

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading optimizations", e);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Save to local storage whenever items change
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, loading]);

  useEffect(() => {
    // Keep viewingItem synced
    if (viewingItem) {
      const updated = items.find(i => i.id === viewingItem.id);
      if (updated) setViewingItem(updated);
    }
  }, [items]);

  const openForm = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({
        ...emptyForm,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      });
    }
    setShowFormModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir este item de otimização?')) {
      setItems(prev => prev.filter(i => i.id !== id));
      addToast('Item excluído.', 'info');
      if (viewingItem && viewingItem.id === id) setShowViewModal(false);
    }
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.title) return;
    
    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...formData, updatedAt: new Date().toISOString() } : i));
      addToast('Item atualizado.', 'success');
    } else {
      setItems(prev => [{ ...formData, updatedAt: new Date().toISOString() }, ...prev]);
      addToast('Item criado.', 'success');
    }
    setShowFormModal(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `optimizations/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), data.publicUrl]
      }));
      addToast('Imagem enviada!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao fazer upload da imagem.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const newImgs = [...prev.images];
      newImgs.splice(index, 1);
      return { ...prev, images: newImgs };
    });
  };

  const getPriorityColor = (p) => {
    if (p === 'Alta') return '#ef4444';
    if (p === 'Média') return '#f59e0b';
    return '#10b981';
  };

  // --- View Modal Actions ---
  const addChecklistItemToView = () => {
    if (!newChecklistItem.trim()) return;
    const newItem = { id: crypto.randomUUID(), text: newChecklistItem, completed: false };
    setItems(prev => prev.map(i => {
      if (i.id === viewingItem.id) {
        return { ...i, checklist: [...(i.checklist || []), newItem] };
      }
      return i;
    }));
    setNewChecklistItem('');
  };

  const toggleChecklist = (chkId) => {
    setItems(prev => prev.map(i => {
      if (i.id === viewingItem.id) {
        const newChecklist = i.checklist.map(c => c.id === chkId ? { ...c, completed: !c.completed } : c);
        return { ...i, checklist: newChecklist };
      }
      return i;
    }));
  };

  const removeChecklist = (chkId) => {
    setItems(prev => prev.map(i => {
      if (i.id === viewingItem.id) {
        return { ...i, checklist: i.checklist.filter(c => c.id !== chkId) };
      }
      return i;
    }));
  };

  const addUpdateToView = () => {
    if (!newUpdate.trim()) return;
    const upd = { id: crypto.randomUUID(), text: newUpdate, date: new Date().toISOString() };
    setItems(prev => prev.map(i => {
      if (i.id === viewingItem.id) {
        return { ...i, updates: [...(i.updates || []), upd] };
      }
      return i;
    }));
    setNewUpdate('');
  };

  const updateStatus = (newStatus) => {
    setItems(prev => prev.map(i => i.id === viewingItem.id ? { ...i, status: newStatus } : i));
  };

  const renderFormModal = () => (
    <Modal title={editingId ? 'Editar Otimização' : 'Nova Otimização'} onClose={() => setShowFormModal(false)} maxWidth="700px">
      <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div className="form-group">
          <label>Item a otimizar (Título) *</label>
          <input 
            type="text" 
            placeholder="Ex: Melhorar performance do painel" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
            required 
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Prioridade</label>
            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <label>URL da página (Opcional)</label>
            <input 
              type="text" 
              placeholder="https://" 
              value={formData.url} 
              onChange={e => setFormData({...formData, url: e.target.value})} 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <textarea 
            rows={4} 
            placeholder="Descreva o problema ou a otimização necessária..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label>Imagens sobre o problema</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {formData.images?.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <img src={img} alt="Anexo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100px', height: '100px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', color: '#64748b' }}
            >
              {uploading ? <div className="loader" style={{ width: '20px', height: '20px' }}></div> : <><Upload size={24} /><span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Adicionar</span></>}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancelar</button>
          <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
        </div>
      </form>
    </Modal>
  );

  const renderViewModal = () => {
    if (!viewingItem) return null;
    const i = viewingItem;
    
    const totalChecks = i.checklist?.length || 0;
    const completedChecks = i.checklist?.filter(c => c.completed).length || 0;
    const progress = totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

    return (
      <Modal onClose={() => setShowViewModal(false)} maxWidth="760px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <select 
                value={i.status} 
                onChange={e => updateStatus(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, fontSize: '0.85rem', color: '#475569', outline: 'none' }}
              >
                <option value="To do">To do</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button className="btn btn-secondary" onClick={() => { setShowViewModal(false); openForm(i); }} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Edit2 size={14}/> Editar</button>
                <button className="btn" onClick={() => handleDelete(i.id)} style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px' }}><Trash2 size={14}/> Excluir</button>
              </div>
            </div>
            
            <h2 style={{ fontSize: '1.6rem', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckSquare size={24} color="#64748b" /> {i.title}
            </h2>

            <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Prioridade</span>
                <span style={{ padding: '4px 10px', borderRadius: '4px', background: getPriorityColor(i.priority), color: '#fff', fontWeight: 600 }}>{i.priority}</span>
              </div>
              {i.url && (
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Página Relacionada</span>
                  <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', background: '#eff6ff', padding: '4px 10px', borderRadius: '4px', fontWeight: 500 }}>
                    <LinkIcon size={14} /> Acessar Link
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <List size={18} /> Descrição
            </h3>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', color: '#334155', fontSize: '0.95rem' }}>
              {i.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma descrição fornecida.</span>}
            </div>
          </div>

          {/* Images */}
          {i.images && i.images.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ImageIcon size={18} /> Anexos
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {i.images.map((img, idx) => (
                  <a key={idx} href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={img} alt="Anexo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckSquare size={18} /> Checklist
              </h3>
              {totalChecks > 0 && (
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{progress}% concluído</span>
              )}
            </div>
            
            {totalChecks > 0 && (
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: progress === 100 ? '#10b981' : '#3b82f6', width: `${progress}%`, transition: 'width 0.3s ease, background 0.3s ease' }}></div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {i.checklist?.map(chk => (
                <div key={chk.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <input 
                    type="checkbox" 
                    checked={chk.completed} 
                    onChange={() => toggleChecklist(chk.id)} 
                    style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontSize: '0.95rem', color: chk.completed ? '#94a3b8' : '#1e293b', textDecoration: chk.completed ? 'line-through' : 'none' }}>
                    {chk.text}
                  </span>
                  <button onClick={() => removeChecklist(chk.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Adicionar um item..." 
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItemToView()}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <button className="btn btn-secondary" onClick={addChecklistItemToView} style={{ padding: '8px 16px', background: '#f1f5f9' }}>
                Adicionar
              </button>
            </div>
          </div>

          {/* Updates / Activity */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MessageSquare size={18} /> Atualizações
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1d3e83', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0 }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea 
                  rows={2}
                  placeholder="Escreva uma atualização..."
                  value={newUpdate}
                  onChange={e => setNewUpdate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical', fontSize: '0.9rem' }}
                />
                <button className="btn btn-primary" onClick={addUpdateToView} style={{ alignSelf: 'flex-start', padding: '6px 16px', fontSize: '0.85rem', background: '#1d3e83' }}>
                  Salvar Atualização
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {i.updates?.slice().reverse().map(upd => (
                <div key={upd.id} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0 }}>
                    V
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                      <strong style={{ color: '#1e293b' }}>Equipe Verto</strong> • {new Date(upd.date).toLocaleString('pt-BR')}
                    </div>
                    <div style={{ background: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '0 8px 8px 8px', fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {upd.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Modal>
    );
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>TI Otimizações</h1>
          <p style={{ color: 'var(--text-muted)' }}>Controle de melhorias e chamados do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()} style={{ borderRadius: '8px', background: '#1d3e83' }}>
          <Plus size={18} /> Novo Chamado
        </button>
      </div>

      <div className="table-container glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
        <table style={{ minWidth: '800px', width: '100%' }}>
          <thead style={{ background: '#eef2f6' }}>
            <tr>
              <th style={{ width: '80px' }}>STATUS</th>
              <th style={{ width: '300px' }}>ITEM A OTIMIZAR</th>
              <th style={{ width: '100px', textAlign: 'center' }}>PRIORIDADE</th>
              <th style={{ width: '140px' }}>DATA</th>
              <th style={{ width: '100px', textAlign: 'center' }}>PROGRESSO</th>
              <th style={{ textAlign: 'center', width: '140px' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  Nenhum item cadastrado.
                </td>
              </tr>
            ) : items.map(i => {
              const totalChecks = i.checklist?.length || 0;
              const completedChecks = i.checklist?.filter(c => c.completed).length || 0;
              const progress = totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

              return (
                <tr key={i.id}>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      background: i.status === 'Concluído' ? '#dcfce7' : i.status === 'Em andamento' ? '#dbeafe' : '#f1f5f9',
                      color: i.status === 'Concluído' ? '#166534' : i.status === 'Em andamento' ? '#1e40af' : '#475569'
                    }}>
                      {i.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>
                    {i.title}
                    {i.url && <LinkIcon size={12} color="#94a3b8" style={{ marginLeft: '6px' }} />}
                    {i.images?.length > 0 && <ImageIcon size={12} color="#94a3b8" style={{ marginLeft: '4px' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: getPriorityColor(i.priority), color: '#fff' }}>
                      {i.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(i.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {totalChecks > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <div style={{ width: '40px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{completedChecks}/{totalChecks}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn" style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px' }} onClick={() => { setViewingItem(i); setShowViewModal(true); }} title="Visualizar / Atualizar">
                        <Eye size={16} />
                      </button>
                      <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }} onClick={() => openForm(i)} title="Editar Cadastro">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn" style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px' }} onClick={() => handleDelete(i.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showFormModal && renderFormModal()}
      {showViewModal && renderViewModal()}
    </div>
  );
};
