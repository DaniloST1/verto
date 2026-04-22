import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, Calendar, Flag, Eye, X, Download, FileText, Upload } from 'lucide-react';
import { Modal } from '../components/Modal';
import { MultiSelectResponsible } from '../components/MultiSelectResponsible';
import { supabase } from '../lib/supabaseClient';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Colaborador',
  client: 'Cliente',
};

// Format datetime-local value from ISO string
const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
};

const formatDisplay = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' });
  } catch { return '—'; }
};

export const Contracts = () => {
  const { contracts, clients, bids, addContract, updateContract, deleteContract } = useData();
  const { user, users } = useAuth();
  const { addToast } = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'view'
  const [currentContract, setCurrentContract] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', clientId: '', bidId: '', value: 0, status: 'ativo', startDate: '', endDate: '', responsibleIds: user?.id ? [user.id] : [], attachmentUrl: ''
  });

  const openModal = (contract = null) => {
    setAttachmentFile(null);
    if (contract) {
      setEditingId(contract.id);
      setFormData({ ...contract });
    } else {
      setEditingId(null);
      setFormData({ name: '', clientId: '', bidId: '', value: 0, status: 'ativo', startDate: '', endDate: '', responsibleIds: user?.id ? [user.id] : [], attachmentUrl: '' });
    }
    setShowModal(true);
  };

  const uploadFile = async () => {
    if (!attachmentFile) return formData.attachmentUrl;
    setUploading(true);
    const fileExt = attachmentFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `contract-attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('Verto imagens')
      .upload(filePath, attachmentFile);

    if (uploadError) {
      addToast('Erro ao fazer upload do arquivo.', 'error');
      setUploading(false);
      return null;
    }

    const { data } = supabase.storage.from('Verto imagens').getPublicUrl(filePath);
    setUploading(false);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    let finalUrl = formData.attachmentUrl;
    if (attachmentFile) {
        const url = await uploadFile();
        if (url) finalUrl = url;
    }
    
    const finalData = { ...formData, attachmentUrl: finalUrl };
    
    if (editingId) {
      await updateContract(editingId, finalData);
      // Atualizar o visualização atual caso esteja sendo editado a partir dela
      if (currentContract && currentContract.id === editingId) {
        setCurrentContract({ ...finalData, id: editingId });
      }
    } else {
      await addContract(finalData);
    }
    
    setUploading(false);
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato permanentemente?')) {
      deleteContract(id);
    }
  };

  const getResponsibleNames = (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 'Não atribuído';
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };
    return ids.map(id => {
      const u = users.find(u => u.id === id);
      return u ? `${u.name} (${abr[u.role] || u.role})` : 'Desconhecido';
    }).join(', ');
  };
  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';
  const getBidNumber = (id) => bids.find(b => b.id === id)?.number || '—';

  const PDFView = () => {
    if (!currentContract) return null;

    return (
      <div className="pdf-view-container" style={{ padding: '20px 10px', background: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
             <button className="btn" style={{ background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setViewMode('list')}>
                <X size={18} /> Voltar para Lista
             </button>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Visualização do Contrato</h2>
             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
               <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1d3e83' }} onClick={() => openModal(currentContract)}>
                  <Edit2 size={18} /> Editar
               </button>
               {currentContract.attachmentUrl && (
                 <a href={currentContract.attachmentUrl} target="_blank" rel="noopener noreferrer" download className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', border: 'none' }}>
                    <Download size={18} /> Baixar Arquivo
                 </a>
               )}
             </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px', background: '#fff' }}>
             <div style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>NOME DO CONTRATO</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentContract.name || '-'}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CLIENTE</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{getClientName(currentContract.clientId)}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>EDITAL VINCULADO</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{getBidNumber(currentContract.bidId)}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>VALOR TOTAL</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {currentContract.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentContract.value) : '-'}
                   </p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</p>
                   <p style={{ fontWeight: 700 }}>{currentContract.status?.toUpperCase() || '-'}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>RESPONSÁVEIS</p>
                   <p style={{ fontWeight: 700 }}>{getResponsibleNames(currentContract.responsibleIds)}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>INÍCIO</p>
                   <p style={{ fontWeight: 700 }}>{formatDisplay(currentContract.startDate)}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>TÉRMINO</p>
                   <p style={{ fontWeight: 700 }}>{formatDisplay(currentContract.endDate)}</p>
                </div>
             </div>

             <div style={{ background: '#f8fafc', borderRadius: '12px', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px dashed #cbd5e1' }}>
                {currentContract.attachmentUrl ? (
                  currentContract.attachmentUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                    <iframe 
                      src={`${currentContract.attachmentUrl}#toolbar=0`} 
                      style={{ width: '100%', height: '1200px', border: 'none' }}
                      title="PDF Viewer"
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <FileText size={64} color="#64748b" style={{ marginBottom: '16px' }} />
                      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>O arquivo anexado não é um PDF para visualização direta.</p>
                      <a href={currentContract.attachmentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        Abrir em nova aba
                      </a>
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <X size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Nenhum contrato anexado</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {viewMode === 'view' ? (
        <PDFView />
      ) : (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Contratos</h1>
              <p style={{ color: 'var(--text-muted)' }}>Gestão de contratos ativos</p>
            </div>
            <button className="btn btn-primary" style={{ background: '#1d3e83' }} onClick={() => openModal()}>
              <Plus size={18}/> Novo Contrato
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead style={{ background: '#eef2f6' }}>
                <tr>
                  <th>NOME</th>
                  <th>CLIENTE</th>
                  <th>EDITAL</th>
                  <th>VALOR</th>
                  <th>STATUS</th>
                  <th>INÍCIO / FIM</th>
                  <th>RESPONSÁVEIS</th>
                  <th style={{ textAlign: 'center' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => (
                  <tr key={contract.id}>
                    <td style={{ fontWeight: 600 }}>{contract.name}</td>
                    <td>{getClientName(contract.clientId)}</td>
                    <td>{getBidNumber(contract.bidId)}</td>
                    <td style={{ fontWeight: 600 }}>R$ {Number(contract.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td><span className={`badge ${contract.status === 'ativo' ? 'badge-success' : contract.status === 'suspenso' ? 'badge-warning' : 'badge-danger'}`}>{contract.status.toUpperCase()}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#10b981" /> {formatDisplay(contract.startDate)}
                      </div>
                      <div style={{ color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Flag size={14} color="#ef4444" /> {formatDisplay(contract.endDate)}
                      </div>
                    </td>
                    <td>{getResponsibleNames(contract.responsibleIds)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px' }} onClick={() => { setCurrentContract(contract); setViewMode('view'); }} title="Ver Contrato">
                          <Eye size={16} />
                        </button>
                        <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }} onClick={() => openModal(contract)} title="Editar Contrato">
                          <Edit2 size={16} />
                        </button>
                        {(user?.role === 'supervisor' || user?.role === 'admin') && (
                          <button className="btn" style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px' }} onClick={() => handleDelete(contract.id)} title="Excluir Contrato">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Nenhum contrato cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
            <Modal title={editingId ? 'Editar Contrato' : 'Novo Contrato'} onClose={() => setShowModal(false)} maxWidth="600px">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nome do Contrato</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>

                <div style={{display: 'flex', gap: '16px'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Cliente</label>
                    <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Edital (Opcional)</label>
                    <select value={formData.bidId} onChange={e => setFormData({...formData, bidId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {bids.map(b => <option key={b.id} value={b.id}>{b.number} - {b.organ}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '16px'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Valor Total (R$)</label>
                    <input type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="ativo">Ativo</option>
                      <option value="encerrado">Encerrado</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

                {/* Date + Time fields */}
                <div style={{display: 'flex', gap: '16px'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Data e Hora de Início</label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(formData.startDate)}
                      onChange={e => setFormData({...formData, startDate: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Data e Hora de Término</label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(formData.endDate)}
                      onChange={e => setFormData({...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Anexo do Contrato (PDF) <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={e => setAttachmentFile(e.target.files[0])}
                      style={{ display: 'block', width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                    />
                    {formData.attachmentUrl && !attachmentFile && (
                      <a href={formData.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '0.85rem', flexShrink: 0, textDecoration: 'none', fontWeight: 600 }}>
                        Ver anexo atual
                      </a>
                    )}
                  </div>
                </div>

                {(user?.role === 'supervisor' || user?.role === 'admin') && (
                  <div style={{ display: 'flex' }}>
                    <MultiSelectResponsible
                      selectedIds={formData.responsibleIds || []}
                      onChange={val => setFormData({ ...formData, responsibleIds: val })}
                      users={users}
                    />
                  </div>
                )}

                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px'}}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }} disabled={uploading}>
                    {uploading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </Modal>
          )}
    </>
  );
};
