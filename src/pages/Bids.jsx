import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, Filter, X, Eye, Link as LinkIcon, Download, Search, Check, MessageCircle, FileText, Upload } from 'lucide-react';
import { Modal } from '../components/Modal';
import { MultiSelectResponsible } from '../components/MultiSelectResponsible';
import { supabase } from '../lib/supabaseClient';

export const Bids = () => {
  const { bids, clients, addBid, updateBid, deleteBid } = useData();
  const { user, users } = useAuth();
  const { addToast } = useToast();

  const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';
  const ROLE_NAMES = { admin: 'Administrador', supervisor: 'Supervisor', finance: 'Financeiro', employee: 'Colaborador', client: 'Cliente' };

  const [viewMode, setViewMode] = useState('list'); // 'list', 'links', 'view'
  const [currentBid, setCurrentBid] = useState(null);

  // Filter State
  const [filterDate, setFilterDate] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterNumber, setFilterNumber] = useState('');
  const [filterCriterion, setFilterCriterion] = useState('Todos');
  const [filterDispute, setFilterDispute] = useState('Todos');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    number: '', organ: '', estimatedValue: 0, status: 'Em análise',
    responsibleIds: user?.id ? [user.id] : [], object: '', originPortal: '', clientsLinked: [],
    disputeDate: '', disputeStartTime: '', disputeEndTime: '',
    attachmentUrl: '', criterion: 'Maior Desconto'
  });
  
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  const clearFilters = () => {
    setFilterDate(''); setFilterName(''); setFilterNumber('');
    setFilterCriterion('Todos'); setFilterDispute('Todos');
  };

  const getResponsibleNames = (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 'Não atribuído';
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };
    return ids.map(id => {
      const u = users.find(usr => usr.id === id);
      return u ? `${u.name} (${abr[u.role] || u.role})` : 'Desconhecido';
    }).join(', ');
  };



  const getStatusStyle = (status) => {
    let s = status?.toLowerCase() || '';
    if (s === 'aberto') s = 'em análise';
    if (s.includes('vitória') || s.includes('vitoria') || s.includes('homologado')) return { bg: '#dcfce7', color: '#166534' };
    if (s.includes('disputa') || s.includes('seleção')) return { bg: '#dbeafe', color: '#1e40af' };
    if (s.includes('proposta') || s.includes('análise') || s.includes('analise')) return { bg: '#fef3c7', color: '#92400e' };
    if (s.includes('desclassificado')) return { bg: '#fee2e2', color: '#991b1b' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  const filteredBids = useMemo(() => {
    return bids.filter(b => {
      if (filterName && !b.object?.toLowerCase().includes(filterName.toLowerCase()) && !b.organ?.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterNumber && !b.number?.includes(filterNumber)) return false;
      if (filterDispute !== 'Todos' && b.status !== filterDispute) return false;
      if (filterDate && b.disputeDate !== filterDate) return false;
      return true;
    });
  }, [bids, filterName, filterNumber, filterDispute, filterDate]);

  const openForm = (bid = null) => {
    if (bid) {
      setEditingId(bid.id);
      setFormData({
        ...bid,
        responsibleIds: bid.responsibleIds || [],
        disputeDate: bid.disputeDate || '',
        disputeStartTime: bid.disputeStartTime || '',
        disputeEndTime: bid.disputeEndTime || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        number: '', organ: '', estimatedValue: 0, status: 'Em análise',
        responsibleIds: user?.id ? [user.id] : [], object: '', originPortal: '', clientsLinked: [],
        disputeDate: '', disputeStartTime: '', disputeEndTime: '',
        attachmentUrl: '', criterion: 'Maior Desconto'
      });
    }
    setAttachmentFile(null);
    setShowModal(true);
  };

  const uploadFile = async () => {
    if (!attachmentFile) return formData.attachmentUrl;
    setUploading(true);
    const fileExt = attachmentFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `bid-attachments/${fileName}`;

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

    // Validação de horário
    if (formData.disputeStartTime && formData.disputeEndTime) {
      if (formData.disputeEndTime <= formData.disputeStartTime) {
        addToast("O horário de término não pode ser menor ou igual ao de início.", 'error');
        return;
      }
    }

    const finalAttachmentUrl = await uploadFile();
    const updatedData = { ...formData, attachmentUrl: finalAttachmentUrl };

    if (editingId) {
      updateBid(editingId, updatedData);
      if (currentBid && currentBid.id === editingId) {
        setCurrentBid({...updatedData, id: editingId});
      }
    } else {
      addBid(updatedData);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir este edital permanentemente?')) {
      deleteBid(id);
      if (currentBid?.id === id) setViewMode('list');
    }
  };

  const renderList = () => (
    <>
      <div className="page-header" style={{ marginBottom: '8px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Editais</h1>
          <p style={{ color: 'var(--text-muted)' }}>Documentos e publicações</p>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: '8px', background: '#1d3e83' }} onClick={() => openForm()}>
            <Plus size={18} /> Novo Edital
          </button>
      </div>

      <div className="glass-panel bid-filter-panel" style={{ padding: '24px', marginBottom: '24px', borderRadius: '12px', marginTop: '24px' }}>
        <div className="filter-flex-container">
          <div className="filter-item">
            <label>Data</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="filter-item" style={{ flexGrow: 2 }}>
            <label>Nome do Edital</label>
            <input type="text" placeholder="Buscar por título..." value={filterName} onChange={e => setFilterName(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>N° do Pregão</label>
            <input type="text" placeholder="Ex: 123/2026" value={filterNumber} onChange={e => setFilterNumber(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>Critério</label>
            <select value={filterCriterion} onChange={e => setFilterCriterion(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Maior Desconto">Maior Desconto</option>
              <option value="Menor Preço">Menor Preço</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Status</label>
            <select value={filterDispute} onChange={e => setFilterDispute(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Em análise">Em análise</option>
              <option value="Proposta inicial cadastrada">Proposta inicial cadastrada</option>
              <option value="Em disputa">Em disputa</option>
              <option value="Seleção de Fornecedores">Seleção de Fornecedores</option>
              <option value="Homologado">Homologado</option>
              <option value="Vitória">Vitória</option>
              <option value="Desclassificado">Desclassificado</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={clearFilters} style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
              <X size={16} /> Limpar
            </button>
            <button className="btn btn-primary" style={{ background: '#1d3e83' }}>
              <Filter size={16} /> Filtrar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .filter-flex-container {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }
        .filter-item {
          flex: 1;
          min-width: 150px;
        }
        .filter-item label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          display: block;
          marginBottom: 4px;
        }
        .filter-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .filter-item {
            min-width: calc(50% - 8px);
          }
          .filter-actions {
            width: 100%;
          }
          .filter-actions button {
            flex: 1;
          }
        }
        @media (max-width: 480px) {
          .filter-item {
            min-width: 100%;
          }
        }
      `}</style>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr)) !important' }}>
        {filteredBids.map(bid => (
          <div key={bid.id} className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '16px' }}>{bid.organ || 'Sem Nome'}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    PREGÃO
                  </p>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{bid.number || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    CRITÉRIO
                  </p>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{bid.criterion || 'Maior Desconto'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    DATA/HORA DISPUTA
                  </p>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>
                    {bid.disputeDate ? bid.disputeDate.split('-').reverse().join('/') : '-'}
                    {bid.disputeStartTime && (
                      <span style={{ marginLeft: '4px' }}>
                         às {bid.disputeStartTime} {bid.disputeEndTime ? ` até ${bid.disputeEndTime}` : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>STATUS</p>
                   <span style={{ 
                     padding: '4px 12px', 
                     borderRadius: '16px', 
                     fontSize: '0.75rem', 
                     fontWeight: 700,
                     background: getStatusStyle(bid.status).bg,
                     color: getStatusStyle(bid.status).color,
                     display: 'inline-block'
                   }}>
                    {bid.status === 'aberto' ? 'Em análise' : (bid.status || 'Em análise')}
                   </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>RESPONSÁVEIS</p>
                   <p style={{ fontWeight: 500, color: '#475569', fontSize: '0.9rem' }}>
                    {getResponsibleNames(bid.responsibleIds)}
                   </p>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '8px', justifyContent: 'space-between', background: '#f8fafc', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px' }} onClick={() => { setCurrentBid(bid); setViewMode('view'); }}>
                  <Eye size={16} /> Ver
                </button>
                 <button className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px' }} onClick={() => { setCurrentBid(bid); setViewMode('links'); }}>
                  <LinkIcon size={16} /> Vínculos
                </button>
                {bid.attachmentUrl && (
                  <a href={bid.attachmentUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} /> Edital
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', minWidth: '90px' }} onClick={() => openForm(bid)}>
                    <Edit2 size={16} /> Editar
                  </button>
                  <button className="btn btn-danger" style={{ padding: '8px 10px', borderRadius: '8px' }} onClick={() => handleDelete(bid.id)}>
                    <Trash2 size={16} />
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const LinkClientView = () => {
    const [searchClient, setSearchClient] = useState('');
    const [selectedClientForAdd, setSelectedClientForAdd] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [localLinked, setLocalLinked] = useState(currentBid.clientsLinked || []);

    const availableClients = clients.filter(c => {
      if (localLinked.includes(c.id)) return false;
      if (!searchClient) return true;
      const q = searchClient.toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      const nameMatch = c.name.toLowerCase().includes(q);
      const cnpjFormatted = (c.cnpj || '').includes(searchClient);
      const cnpjDigits = qDigits && (c.cnpj || '').replace(/\D/g, '').includes(qDigits);
      return nameMatch || cnpjFormatted || cnpjDigits;
    });
    
    const handleSaveLinks = () => {
      updateBid(currentBid.id, { clientsLinked: localLinked });
      setCurrentBid({ ...currentBid, clientsLinked: localLinked });
      addToast('Vínculos atualizados com sucesso.', 'success');
      setViewMode('list');
    };

    const handleSelectAutocomple = (c) => {
      setSelectedClientForAdd(c);
      setSearchClient(`${c.name} - ${c.cnpj || 'Sem CNPJ'}`);
      setIsDropdownOpen(false);
    };

    const handleAddClick = () => {
      if (selectedClientForAdd) {
        setLocalLinked([...localLinked, selectedClientForAdd.id]);
        setSelectedClientForAdd(null);
        setSearchClient('');
      } else if (availableClients.length === 1 && searchClient) {
        // Fallback if they just typed and there's only 1 match
        setLocalLinked([...localLinked, availableClients[0].id]);
        setSelectedClientForAdd(null);
        setSearchClient('');
      }
    };

    return (
      <div className="animate-fade-in">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Editais</h1>
            <p style={{ color: 'var(--text-muted)' }}>Documentos e publicações</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setViewMode('list')} style={{ background: '#fff', borderRadius: '8px' }}>Voltar para Lista</button>
        </div>

        <div className="glass-panel" style={{ padding: '32px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#1e293b' }}>Vincular Clientes ao Edital</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{currentBid.organ || 'Sem Título'} ({currentBid.number})</p>

          <div style={{ marginBottom: '32px' }}>
             <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Adicionar Cliente</label>
             <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Selecione um cliente..." 
                    value={searchClient} 
                    onChange={e => { setSearchClient(e.target.value); setIsDropdownOpen(true); setSelectedClientForAdd(null); }} 
                    onFocus={() => setIsDropdownOpen(true)}
                    style={{ paddingLeft: '40px', background: selectedClientForAdd ? '#f59e0b' : '#fff', color: selectedClientForAdd ? '#fff' : 'inherit' }}
                  />
                  {isDropdownOpen && searchClient && !selectedClientForAdd && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                      <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                        <Search size={14} /> Buscar por nome ou CNPJ...
                      </div>
                      {availableClients.length === 0 ? (
                         <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>Nenhum cliente encontrado.</div>
                      ) : (
                         availableClients.slice(0, 5).map(c => (
                           <div key={c.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => handleSelectAutocomple(c)}>
                             <div>
                               <p style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</p>
                               <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.cnpj || 'Sem CNPJ'}</p>
                             </div>
                           </div>
                         ))
                      )}
                    </div>
                  )}
                </div>
                <button className="btn btn-success" style={{ padding: '0 24px', borderRadius: '8px' }} onClick={handleAddClick} disabled={!selectedClientForAdd && availableClients.length !== 1}>
                  + Adicionar
                </button>
             </div>
          </div>

          <div className="table-container" style={{ borderRadius: '8px', overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--surface-border)' }}>
            <table style={{ minWidth: '600px' }}>
              <thead style={{ background: '#eef2f6', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th>NOME DO CLIENTE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {localLinked.map(id => {
                  const c = clients.find(cl => cl.id === id);
                  if (!c) return null;
                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {c.name}
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{c.cnpj}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700,
                          background: '#10b981', color: '#fff'
                        }}>
                          Vinculado
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '100px' }}>
                        <button className="btn btn-secondary" style={{ color: '#ef4444', border: 'none', background: 'transparent', whiteSpace: 'nowrap', minWidth: '90px' }} onClick={() => setLocalLinked(localLinked.filter(lid => lid !== id))}>
                          <Trash2 size={16} /> Remover
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {localLinked.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nenhum cliente vinculado a este edital.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
             <button className="btn btn-secondary" onClick={() => setViewMode('list')} style={{ background: '#fff' }}>Cancelar</button>
             <button className="btn btn-primary" onClick={handleSaveLinks} style={{ background: '#1d3e83' }}>Salvar Vínculos</button>
          </div>
        </div>
      </div>
    );
  };

  const PDFView = () => {
    if (!currentBid) return null;

    return (
      <div className="pdf-view-container" style={{ padding: '20px 10px', background: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
             <button className="btn" style={{ background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setViewMode('list')}>
                <X size={18} /> Voltar para Lista
             </button>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Visualização do Edital</h2>
             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
               <button className="btn" style={{ background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setViewMode('links')}>
                  <LinkIcon size={18} /> Vínculos
               </button>
               <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1d3e83' }} onClick={() => openForm(currentBid)}>
                  <Edit2 size={18} /> Editar
               </button>
               {currentBid.attachmentUrl && (
                 <a href={currentBid.attachmentUrl} target="_blank" rel="noopener noreferrer" download className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', border: 'none' }}>
                    <Download size={18} /> Baixar Arquivo
                 </a>
               )}
             </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px', background: '#fff' }}>
             <div style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ÓRGÃO</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentBid.organ || '-'}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PREGÃO</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentBid.number || '-'}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CRITÉRIO</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentBid.criterion || 'Maior Desconto'}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>VALOR ESTIMADO</p>
                   <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {currentBid.estimatedValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBid.estimatedValue) : '-'}
                   </p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</p>
                   <p style={{ fontWeight: 700 }}>{currentBid.status?.toUpperCase() || 'EM ANÁLISE'}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>RESPONSÁVEIS</p>
                   <p style={{ fontWeight: 700 }}>{getResponsibleNames(currentBid.responsibleIds)}</p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DATA DA DISPUTA</p>
                   <p style={{ fontWeight: 700 }}>
                     {currentBid.disputeDate ? currentBid.disputeDate.split('-').reverse().join('/') : '-'}
                   </p>
                </div>
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>HORÁRIO DA DISPUTA</p>
                   <p style={{ fontWeight: 700 }}>
                     {currentBid.disputeStartTime ? `${currentBid.disputeStartTime} ${currentBid.disputeEndTime ? `até ${currentBid.disputeEndTime}` : ''}` : '-'}
                   </p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PORTAL DE ORIGEM</p>
                   {currentBid.originPortal ? (
                      <a href={currentBid.originPortal} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>{currentBid.originPortal}</a>
                   ) : <p style={{ fontWeight: 700 }}>-</p>}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                   <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>OBJETO</p>
                   <p style={{ fontWeight: 600, color: '#475569', whiteSpace: 'pre-line' }}>{currentBid.object || '-'}</p>
                </div>
             </div>

             <div style={{ background: '#f8fafc', borderRadius: '12px', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px dashed #cbd5e1' }}>
                {currentBid.attachmentUrl ? (
                  currentBid.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe 
                      src={`${currentBid.attachmentUrl}#toolbar=0`} 
                      style={{ width: '100%', height: '1200px', border: 'none' }}
                      title="PDF Viewer"
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <FileText size={64} color="#64748b" style={{ marginBottom: '16px' }} />
                      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>O arquivo anexado não é um PDF para visualização direta.</p>
                      <a href={currentBid.attachmentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        Abrir em nova aba
                      </a>
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <X size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Nenhum edital anexado</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {viewMode === 'list' && renderList()}
      {viewMode === 'links' && currentBid && <LinkClientView />}
      {viewMode === 'view' && currentBid && <PDFView />}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Edital' : 'Novo Edital'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Órgão Organizador</label>
              <input type="text" value={formData.organ} onChange={e => setFormData({ ...formData, organ: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 120px' }}>
                <label>Número do Pregão</label>
                <input type="text" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} required />
              </div>
              <div className="form-group" style={{ flex: '1 1 120px' }}>
                <label>Critério</label>
                <select value={formData.criterion || 'Maior Desconto'} onChange={e => setFormData({ ...formData, criterion: e.target.value })} required>
                  <option value="Maior Desconto">Maior Desconto</option>
                  <option value="Menor Preço">Menor Preço</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: '1 1 120px' }}>
                <label>Valor Estimado (R$)</label>
                <input type="number" step="0.01" value={formData.estimatedValue} onChange={e => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) })} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Em análise">Em análise</option>
                  <option value="Proposta inicial cadastrada">Proposta inicial cadastrada</option>
                  <option value="Em disputa">Em disputa</option>
                  <option value="Seleção de Fornecedores">Seleção de Fornecedores</option>
                  <option value="Homologado">Homologado</option>
                  <option value="Vitória">Vitória</option>
                  <option value="Desclassificado">Desclassificado</option>
                </select>
              </div>
              <div style={{ display: 'flex', flex: 1 }}>
                <MultiSelectResponsible
                  selectedIds={formData.responsibleIds || []}
                  onChange={val => setFormData({ ...formData, responsibleIds: val })}
                  users={users}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Portal de Origem (URL)</label>
              <input type="url" value={formData.originPortal} onChange={e => setFormData({ ...formData, originPortal: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Anexar Edital (Arquivo)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} style={{ flex: 1 }} />
                {(formData.attachmentUrl || uploading) && (
                  <span style={{ fontSize: '0.8rem', color: uploading ? '#3b82f6' : '#10b981' }}>
                    {uploading ? 'Fazendo upload...' : '✓ Arquivo salvo'}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Data da Disputa</label>
                <input 
                  type="date" 
                  value={formData.disputeDate ? (typeof formData.disputeDate === 'string' && formData.disputeDate.includes('T') ? formData.disputeDate.split('T')[0] : formData.disputeDate) : ''} 
                  onChange={e => setFormData({ ...formData, disputeDate: e.target.value })} 
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Hora Início</label>
                <input type="time" value={formData.disputeStartTime || ''} onChange={e => setFormData({ ...formData, disputeStartTime: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Hora Término</label>
                <input type="time" value={formData.disputeEndTime || ''} onChange={e => setFormData({ ...formData, disputeEndTime: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Objeto (Descrição)</label>
              <textarea rows="3" value={formData.object} onChange={e => setFormData({ ...formData, object: e.target.value })}></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
