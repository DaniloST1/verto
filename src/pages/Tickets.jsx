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

  // Filter states
  const [filterTag, setFilterTag] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Unified modal state
  const [activeCardId, setActiveCardId] = useState(null);
  
  // Inputs inside the card
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newUpdate, setNewUpdate] = useState('');
  
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editingUpdateText, setEditingUpdateText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase.from('tickets').select('*').order('createdAt', { ascending: false });
      if (error) throw error;
      
      // Migration script: se existir no localStorage, joga pro Supabase
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        try {
          const parsedLocal = JSON.parse(localData);
          if (parsedLocal && parsedLocal.length > 0) {
             const { error: insertError } = await supabase.from('tickets').insert(parsedLocal);
             if (!insertError) {
                localStorage.removeItem(STORAGE_KEY);
                const { data: newData } = await supabase.from('tickets').select('*').order('createdAt', { ascending: false });
                if (newData) setItems(newData);
             } else {
                if (data) setItems(data);
             }
          } else {
             localStorage.removeItem(STORAGE_KEY);
             if (data) setItems(data);
          }
        } catch (e) {
           if (data) setItems(data);
        }
      } else {
        if (data) setItems(data);
      }
    } catch (e) {
       console.warn('Tabela tickets não encontrada ou erro de conexão. Usando local storage como fallback.');
       const saved = localStorage.getItem(STORAGE_KEY);
       if (saved) {
         try { setItems(JSON.parse(saved)); } catch (err) {}
       }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const activeCard = items.find(i => i.id === activeCardId);

  const openNewCard = async () => {
    const newItem = {
      id: crypto.randomUUID(),
      title: 'Nova Otimização / Chamado',
      tag: 'Sistema',
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

    try {
      const { error } = await supabase.from('tickets').update(newItem).eq('id', newItem.id);
      if (error && error.code === 'PGRST116') {
         // Não encontrou para atualizar, faz insert
      }
      // Na verdade, só faz insert:
      const { error: insertError } = await supabase.from('tickets').insert([newItem]);
      if (insertError) {
        const currentItems = [newItem, ...items];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
      }
    } catch (e) {}
  };

  const openCard = (id) => {
    setActiveCardId(id);
    setEditingUpdateId(null);
  };

  const updateActiveCard = async (updates) => {
    const updatedStatus = updates.status !== undefined ? updates.status : activeCard.status;
    let completedAtUpdate = {};
    if (updates.status === 'Concluído' && activeCard.status !== 'Concluído') {
      completedAtUpdate = { completedAt: new Date().toISOString() };
    } else if (updates.status && updates.status !== 'Concluído') {
      completedAtUpdate = { completedAt: null };
    }
    
    const finalUpdates = { ...updates, ...completedAtUpdate };
    setItems(prev => prev.map(i => i.id === activeCardId ? { ...i, ...finalUpdates } : i));

    try {
      const { error } = await supabase.from('tickets').update(finalUpdates).eq('id', activeCardId);
      if (error) {
        // Fallback local
        const updatedItems = items.map(i => i.id === activeCardId ? { ...i, ...finalUpdates } : i);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
      }
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    if (window.confirm('Excluir este cartão permanentemente?')) {
      setItems(prev => prev.filter(i => i.id !== id));
      addToast('Cartão excluído.', 'info');
      if (activeCardId === id) setActiveCardId(null);
      
      try {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) {
          const updatedItems = items.filter(i => i.id !== id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
        }
      } catch (e) {}
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
          <div style={{ flex: '0 0 60%', maxWidth: '60%', padding: '32px', borderRight: '1px solid #e2e8f0', background: '#fff' }}>
            
            {/* Title Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
               <CheckCircle size={24} color={activeCard.status === 'Concluído' ? '#10b981' : '#64748b'} style={{ marginTop: '4px', flexShrink: 0 }} />
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
            
            <div style={{ marginLeft: '36px', fontSize: '0.85rem', color: '#64748b', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>na lista <strong style={{ color: '#1e293b', cursor: 'pointer', textDecoration: 'underline' }}>{activeCard.status}</strong></div>
              {activeCard.completedAt && (
                <div style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <CheckCircle size={14} /> Concluído em {new Date(activeCard.completedAt).toLocaleString('pt-BR')}
                </div>
              )}
              {activeCard.dueDate && !activeCard.completedAt && (
                <div style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <Clock size={14} /> Entrega: {new Date(activeCard.dueDate).toLocaleString('pt-BR')}
                </div>
              )}
            </div>

            {/* Action Buttons & Metadata */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', marginLeft: '36px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #cbd5e1' }}>
                  <Users size={14}/> Membros
                </button>
                <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #cbd5e1' }} onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={14}/> Anexo
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} />
                
                <button className="btn" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', padding: '6px 12px', border: '1px solid #cbd5e1' }} onClick={() => setShowDatePicker(!showDatePicker)}>
                  <Clock size={14}/> Datas
                </button>
                
                {showDatePicker && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', width: '300px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', textAlign: 'center', flex: 1 }}>Datas</h4>
                      <button onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16}/></button>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                       <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Data de início</label>
                       <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="checkbox" checked={!!activeCard.startDate} onChange={e => updateActiveCard({ startDate: e.target.checked ? new Date().toISOString().split('T')[0] : null })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          <input type="date" value={activeCard.startDate || ''} onChange={e => updateActiveCard({ startDate: e.target.value })} disabled={!activeCard.startDate} style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} />
                       </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                       <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Data de entrega</label>
                       <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <input type="checkbox" checked={!!activeCard.dueDate} onChange={e => updateActiveCard({ dueDate: e.target.checked ? new Date().toISOString().slice(0, 16) : null })} style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '8px' }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <input type="date" value={activeCard.dueDate ? activeCard.dueDate.split('T')[0] : ''} onChange={e => updateActiveCard({ dueDate: `${e.target.value}T${activeCard.dueDate ? activeCard.dueDate.split('T')[1] || '12:00' : '12:00'}` })} disabled={!activeCard.dueDate} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} />
                             <input type="time" value={activeCard.dueDate ? activeCard.dueDate.split('T')[1] : ''} onChange={e => updateActiveCard({ dueDate: `${activeCard.dueDate ? activeCard.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]}T${e.target.value}` })} disabled={!activeCard.dueDate} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} />
                          </div>
                       </div>
                    </div>
                    
                    <button className="btn btn-primary" style={{ width: '100%', padding: '8px', background: '#1d3e83', fontSize: '0.85rem' }} onClick={() => setShowDatePicker(false)}>Salvar</button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Etiqueta</span>
                  <select 
                    value={activeCard.tag || 'Sistema'} 
                    onChange={e => updateActiveCard({ tag: e.target.value })}
                    style={{ padding: '6px 12px', borderRadius: '4px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="Sistema">Sistema</option>
                    <option value="Site">Site</option>
                    <option value="Chatbot">Chatbot</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Prioridade</span>
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
          <div style={{ flex: '0 0 40%', maxWidth: '40%', background: '#f8fafc', padding: '32px', display: 'flex', flexDirection: 'column' }}>
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{user?.name || 'Usuário'} <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '4px' }}>{new Date(upd.date).toLocaleString('pt-BR')}</span></span>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setEditingUpdateId(upd.id); setEditingUpdateText(upd.text); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }} title="Editar">
                          <Edit2 size={12}/>
                        </button>
                        <button onClick={() => {
                          if (window.confirm('Excluir este comentário?')) {
                            updateActiveCard({ updates: activeCard.updates.filter(u => u.id !== upd.id) });
                          }
                        }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }} title="Excluir">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                    
                    {editingUpdateId === upd.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea 
                          value={editingUpdateText}
                          onChange={e => setEditingUpdateText(e.target.value)}
                          style={{ width: '100%', minHeight: '60px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'none', fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#1d3e83' }} onClick={() => {
                            if (editingUpdateText.trim()) {
                              updateActiveCard({ updates: activeCard.updates.map(u => u.id === upd.id ? { ...u, text: editingUpdateText, edited: true } : u) });
                              setEditingUpdateId(null);
                            }
                          }}>Salvar</button>
                          <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }} onClick={() => setEditingUpdateId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '0 8px 8px 8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap', position: 'relative' }}>
                        {upd.text}
                        {upd.edited && <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'right', marginTop: '4px', fontStyle: 'italic' }}>editado</div>}
                      </div>
                    )}
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

  const filteredItems = items.filter(i => {
    if (filterTag && i.tag !== filterTag) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  });

  const activeFiltersCount = [filterTag, filterPriority, filterStatus].filter(Boolean).length;

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

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tag size={16} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Filtros:</span>
        </div>

        {/* Etiqueta */}
        <select
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
            fontSize: '0.85rem', fontWeight: 600, color: filterTag ? '#1d3e83' : '#64748b',
            background: filterTag ? '#eff6ff' : '#f8fafc', cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="">Todas as Etiquetas</option>
          <option value="Sistema">Sistema</option>
          <option value="Site">Site</option>
          <option value="Chatbot">Chatbot</option>
          <option value="Outro">Outro</option>
        </select>

        {/* Prioridade */}
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
            fontSize: '0.85rem', fontWeight: 600, color: filterPriority ? '#1d3e83' : '#64748b',
            background: filterPriority ? '#eff6ff' : '#f8fafc', cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="">Todas as Prioridades</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
            fontSize: '0.85rem', fontWeight: 600, color: filterStatus ? '#1d3e83' : '#64748b',
            background: filterStatus ? '#eff6ff' : '#f8fafc', cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="">Todos os Status</option>
          <option value="To do">To do</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Concluído">Concluído</option>
        </select>

        {/* Limpar filtros */}
        {activeFiltersCount > 0 && (
          <button
            onClick={() => { setFilterTag(''); setFilterPriority(''); setFilterStatus(''); }}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca',
              fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', background: '#fef2f2',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <X size={14} /> Limpar ({activeFiltersCount})
          </button>
        )}

        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>
          {filteredItems.length} de {items.length} cartões
        </span>
      </div>

      <div className="table-container glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
        <table style={{ minWidth: '800px', width: '100%' }}>
          <thead style={{ background: '#eef2f6' }}>
            <tr>
              <th style={{ width: '120px' }}>STATUS</th>
              <th style={{ width: '300px' }}>CARTÃO / TÍTULO</th>
              <th style={{ width: '100px', textAlign: 'center' }}>ETIQUETA</th>
              <th style={{ width: '100px', textAlign: 'center' }}>PRIORIDADE</th>
              <th style={{ width: '120px' }}>DATA</th>
              <th style={{ width: '100px', textAlign: 'center' }}>CHECKLIST</th>
              <th style={{ textAlign: 'center', width: '100px' }}>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  {items.length === 0 ? 'Nenhum cartão adicionado ainda.' : 'Nenhum cartão corresponde aos filtros selecionados.'}
                </td>
              </tr>
            ) : filteredItems.map(i => {
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
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#e0f2fe', color: '#0369a1' }}>
                      {i.tag || 'Sistema'}
                    </span>
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
