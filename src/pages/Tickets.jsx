import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import { Modal } from '../components/Modal';
import { 
  Plus, Edit2, Trash2, Eye, X, Image as ImageIcon, 
  CheckSquare, List, MessageSquare, AlertCircle, Upload,
  Paperclip, Users, Clock, AlignLeft, CheckCircle, Tag
} from 'lucide-react';

const STORAGE_KEY = 'verto_ti_optimizations';
const BUCKET = 'Verto imagens';

export const Tickets = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Unified modal state
  const [activeCardId, setActiveCardId] = useState(null);
  
  // Inputs inside the card
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newUpdate, setNewUpdate] = useState('');
  
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) {}
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loading]);

  const activeCard = items.find(i => i.id === activeCardId);

  const openNewCard = () => {
    const newItem = {
      id: crypto.randomUUID(),
      title: 'Nova Otimização / Chamado',
      priority: 'Média',
      status: 'To do',
      url: '',
      description: '',
      images: [],
      checklist: [],
      updates: [],
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setActiveCardId(newItem.id);
  };

  const openCard = (id) => {
    setActiveCardId(id);
  };

  const updateActiveCard = (updates) => {
    setItems(prev => prev.map(i => i.id === activeCardId ? { ...i, ...updates } : i));
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir este cartão permanentemente?')) {
      setItems(prev => prev.filter(i => i.id !== id));
      addToast('Cartão excluído.', 'info');
      if (activeCardId === id) setActiveCardId(null);
    }
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
      
      updateActiveCard({ images: [...(activeCard.images || []), data.publicUrl] });
      addToast('Anexo adicionado!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao fazer upload da imagem.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'Alta') return '#ef4444';
    if (p === 'Média') return '#f59e0b';
    return '#10b981';
  };

  const renderCardModal = () => {
    if (!activeCard) return null;
    
    const totalChecks = activeCard.checklist?.length || 0;
    const completedChecks = activeCard.checklist?.filter(c => c.completed).length || 0;
    const progress = totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

    return (
      <Modal title="" onClose={() => setActiveCardId(null)} maxWidth="80%">
        <div style={{ display: 'flex', minHeight: '600px', margin: '-24px -32px -32px -32px', flexWrap: 'wrap' }}>
          
          {/* Left Column */}
          <div style={{ flex: '1 1 500px', padding: '32px', borderRight: '1px solid #e2e8f0', background: '#fff' }}>
            
            {/* Title Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
               <CheckCircle size={24} color="#64748b" style={{ marginTop: '4px', flexShrink: 0 }} />
               <input 
                 value={activeCard.title}
                 onChange={e => updateActiveCard({ title: e.target.value })}
                 placeholder="Título do Cartão"
                 style={{ 
                   fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', border: 'none', 
                   width: '100%', outline: 'none', background: 'transparent', padding: 0
                 }}
               />
            </div>
            
            <div style={{ marginLeft: '36px', fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
              na lista <strong style={{ color: '#1e293b', cursor: 'pointer', textDecoration: 'underline' }}>{activeCard.status}</strong>
            </div>

            {/* Action Buttons (Adicionar, Checklist, Membros, Anexo) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', marginLeft: '36px' }}>
              <button className="btn" style={{ background: '#475569', color: '#fff', fontSize: '0.85rem', padding: '6px 12px' }}>
                <Plus size={14}/> Adicionar
              </button>
              <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #cbd5e1' }} onClick={() => {
                document.getElementById('checklist-input')?.focus();
              }}>
                <CheckSquare size={14}/> Checklist
              </button>
              <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #cbd5e1' }}>
                <Users size={14}/> Membros
              </button>
              <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #cbd5e1' }} onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={14}/> Anexo
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} />
            </div>

            {/* Metadata: Etiquetas & Datas */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', marginLeft: '36px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Etiquetas (Prioridade)</span>
                <select 
                  value={activeCard.priority} 
                  onChange={e => updateActiveCard({ priority: e.target.value })}
                  style={{ padding: '6px 12px', borderRadius: '4px', background: getPriorityColor(activeCard.priority), color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Status da Tarefa</span>
                <select 
                  value={activeCard.status} 
                  onChange={e => updateActiveCard({ status: e.target.value })}
                  style={{ padding: '6px 12px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <option value="To do">To do</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <AlignLeft size={20} color="#64748b" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b' }}>Descrição</h3>
              </div>
              <div style={{ marginLeft: '32px' }}>
                <textarea
                  value={activeCard.description}
                  onChange={e => updateActiveCard({ description: e.target.value })}
                  placeholder="Adicione uma descrição mais detalhada..."
                  style={{ width: '100%', minHeight: '100px', padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'vertical', fontSize: '0.9rem', color: '#334155' }}
                />
              </div>
            </div>

            {/* Attachments */}
            {activeCard.images?.length > 0 && (
              <div style={{ marginBottom: '32px', marginLeft: '32px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip size={16}/> Anexos ({activeCard.images.length})
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {activeCard.images.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <a href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt="anexo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                        <button onClick={() => {
                          const newImgs = [...activeCard.images];
                          newImgs.splice(idx, 1);
                          updateActiveCard({ images: newImgs });
                        }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><X size={12}/></button>
                      </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckSquare size={20} color="#64748b" />
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b' }}>Checklist</h3>
                </div>
                <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => updateActiveCard({ checklist: [] })}>Excluir</button>
              </div>
              
              <div style={{ marginLeft: '32px' }}>
                {/* Progress bar */}
                {totalChecks > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', width: '30px', textAlign: 'right' }}>{progress}%</span>
                    <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.3s, background 0.3s' }}></div>
                    </div>
                  </div>
                )}

                {/* Checklist Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  {activeCard.checklist?.map(chk => (
                    <div key={chk.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '4px 0' }}>
                      <input 
                        type="checkbox" 
                        checked={chk.completed}
                        onChange={() => {
                          const newChecklist = activeCard.checklist.map(c => c.id === chk.id ? { ...c, completed: !c.completed } : c);
                          updateActiveCard({ checklist: newChecklist });
                        }}
                        style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <input 
                        value={chk.text}
                        onChange={e => {
                          const newChecklist = activeCard.checklist.map(c => c.id === chk.id ? { ...c, text: e.target.value } : c);
                          updateActiveCard({ checklist: newChecklist });
                        }}
                        style={{ 
                          flex: 1, border: 'none', background: 'transparent', fontSize: '0.95rem', 
                          color: chk.completed ? '#94a3b8' : '#1e293b', 
                          textDecoration: chk.completed ? 'line-through' : 'none', outline: 'none' 
                        }}
                      />
                      <button onClick={() => {
                        const newChecklist = activeCard.checklist.filter(c => c.id !== chk.id);
                        updateActiveCard({ checklist: newChecklist });
                      }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}>
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Item Input */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <input 
                    id="checklist-input"
                    type="text" 
                    placeholder="Adicionar um item" 
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newChecklistItem.trim()) {
                        const newItem = { id: crypto.randomUUID(), text: newChecklistItem, completed: false };
                        updateActiveCard({ checklist: [...(activeCard.checklist || []), newItem] });
                        setNewChecklistItem('');
                      }
                    }}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                  <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', border: '1px solid #cbd5e1' }} onClick={() => {
                      if (newChecklistItem.trim()) {
                        const newItem = { id: crypto.randomUUID(), text: newChecklistItem, completed: false };
                        updateActiveCard({ checklist: [...(activeCard.checklist || []), newItem] });
                        setNewChecklistItem('');
                      }
                  }}>Adicionar</button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Comments & Activity */}
          <div style={{ flex: '0 0 320px', background: '#f8fafc', padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <MessageSquare size={20} color="#64748b" />
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b' }}>Atividade</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <textarea 
                value={newUpdate}
                onChange={e => setNewUpdate(e.target.value)}
                placeholder="Escrever um comentário..."
                style={{ width: '100%', minHeight: '80px', padding: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'none', fontSize: '0.85rem' }}
              />
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start', background: '#1d3e83', fontSize: '0.85rem' }} onClick={() => {
                  if (newUpdate.trim()) {
                    const upd = { id: crypto.randomUUID(), text: newUpdate, date: new Date().toISOString() };
                    updateActiveCard({ updates: [...(activeCard.updates || []), upd] });
                    setNewUpdate('');
                  }
              }}>Salvar Comentário</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
              {activeCard.updates?.slice().reverse().map(upd => (
                <div key={upd.id} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1d3e83', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}>
                      {user?.name || 'Usuário'} <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '4px' }}>{new Date(upd.date).toLocaleString('pt-BR')}</span>
                    </div>
                    <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '0 8px 8px 8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {upd.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button className="btn" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontSize: '0.85rem' }} onClick={() => handleDelete(activeCard.id)}>
                Excluir Cartão
              </button>
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
        <button className="btn btn-primary" onClick={openNewCard} style={{ borderRadius: '8px', background: '#1d3e83' }}>
          <Plus size={18} /> Adicionar Cartão
        </button>
      </div>

      <div className="table-container glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
        <table style={{ minWidth: '800px', width: '100%' }}>
          <thead style={{ background: '#eef2f6' }}>
            <tr>
              <th style={{ width: '120px' }}>STATUS</th>
              <th style={{ width: '300px' }}>CARTÃO / TÍTULO</th>
              <th style={{ width: '120px', textAlign: 'center' }}>ETIQUETA</th>
              <th style={{ width: '120px' }}>DATA</th>
              <th style={{ width: '100px', textAlign: 'center' }}>CHECKLIST</th>
              <th style={{ textAlign: 'center', width: '100px' }}>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  Nenhum cartão adicionado ainda.
                </td>
              </tr>
            ) : items.map(i => {
              const totalChecks = i.checklist?.length || 0;
              const completedChecks = i.checklist?.filter(c => c.completed).length || 0;
              const progress = totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

              return (
                <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => openCard(i.id)} className="table-row-hover">
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
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {i.images?.length > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px' }}><Paperclip size={10} /> {i.images.length}</span>}
                      {i.updates?.length > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px' }}><MessageSquare size={10} /> {i.updates.length}</span>}
                    </div>
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
                    <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }} onClick={(e) => { e.stopPropagation(); openCard(i.id); }}>
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-row-hover:hover {
          background-color: #f8fafc;
        }
      `}</style>

      {activeCardId && renderCardModal()}
    </div>
  );
};
