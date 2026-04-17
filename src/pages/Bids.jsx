import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, Filter, X, Eye, Link as LinkIcon, Download, Search, Check, MessageCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

export const Bids = () => {
  const { bids, clients, addBid, updateBid, deleteBid } = useData();
  const { user, users } = useAuth();
  const { addToast } = useToast();

  const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';
  const ROLE_NAMES = { admin: 'Administrador', supervisor: 'Supervisor', finance: 'Financeiro', employee: 'Colaborador' };

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
    number: '', organ: '', estimatedValue: 0, status: 'aberto',
    responsible: '', object: '', originPortal: '', clientsLinked: [],
    disputeDate: '', disputeStartTime: '', disputeEndTime: ''
  });

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

  const getResponsibleStr = (id) => {
    const u = users.find(usr => usr.id === id);
    if (!u) return 'Não atribuído';
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };
    return `${u.name} (${abr[u.role] || u.role})`;
  };

  const filteredBids = useMemo(() => {
    return bids.filter(b => {
      if (filterName && !b.object?.toLowerCase().includes(filterName.toLowerCase()) && !b.organ?.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterNumber && !b.number?.includes(filterNumber)) return false;
      if (filterDispute !== 'Todos' && b.status !== filterDispute.toLowerCase()) return false;
      if (filterDate && b.disputeDate !== filterDate) return false;
      return true;
    });
  }, [bids, filterName, filterNumber, filterDispute, filterDate]);

  const openForm = (bid = null) => {
    if (bid) {
      setEditingId(bid.id);
      setFormData({
        ...bid,
        disputeDate: bid.disputeDate || '',
        disputeStartTime: bid.disputeStartTime || '',
        disputeEndTime: bid.disputeEndTime || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        number: '', organ: '', estimatedValue: 0, status: 'aberto',
        responsible: '', object: '', originPortal: '', clientsLinked: [],
        disputeDate: '', disputeStartTime: '', disputeEndTime: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateBid(editingId, formData);
      if (currentBid && currentBid.id === editingId) {
        setCurrentBid({...formData, id: editingId});
      }
    } else {
      addBid(formData);
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
              <option value="Maior Lance">Maior Lance</option>
              <option value="Menor Preço">Menor Preço</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Disputa</label>
            <select value={filterDispute} onChange={e => setFilterDispute(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Aberto">Aberto</option>
              <option value="Fechado">Fechado</option>
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

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
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
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{bid.criterion || 'Maior Lance'}</p>
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
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DISPUTA</p>
                   <p style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{bid.status}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESPONSÁVEL</p>
                   <p style={{ fontWeight: 500, color: '#475569', fontSize: '0.9rem' }}>
                    {getResponsibleStr(bid.responsible)}
                   </p>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '8px', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px' }} onClick={() => { setCurrentBid(bid); setViewMode('view'); }}>
                  <Eye size={16} /> Ver
                </button>
                <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '8px' }} onClick={() => { setCurrentBid(bid); setViewMode('links'); }}>
                  <LinkIcon size={16} /> Vínculos
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }} onClick={() => openForm(bid)}>
                    <Edit2 size={16} /> Editar
                  </button>
                  <button className="btn btn-danger" style={{ padding: '8px', borderRadius: '8px' }} onClick={() => handleDelete(bid.id)}>
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
    return (
      <div className="animate-fade-in">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Editais</h1>
            <p style={{ color: 'var(--text-muted)' }}>Documentos e publicações</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setViewMode('list')} style={{ background: '#fff', borderRadius: '8px' }}>Voltar para Lista</button>
        </div>

        <div className="glass-panel" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
             <div>
               <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '4px' }}>{currentBid.organ || 'Edital Sem Nome'}</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Dados do edital {currentBid.number}</p>
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
               <button className="btn btn-secondary" onClick={() => setViewMode('links')} style={{ background: '#fff', color: '#1e293b' }}><LinkIcon size={16}/> Ver Clientes Vinculados</button>
               <button className="btn btn-secondary" style={{ background: '#fff', color: '#3b82f6' }}><Download size={16}/> Baixar PDF</button>
               {(user.role === 'admin' || user.role === 'supervisor') && (
                 <>
                   <button className="btn btn-primary" onClick={() => openForm(currentBid)} style={{ background: '#1d3e83' }}><Edit2 size={16}/> Editar</button>
                   <button className="btn btn-danger" onClick={() => handleDelete(currentBid.id)}><Trash2 size={16}/> Apagar</button>
                 </>
               )}
             </div>
          </div>
          
          {/* PDF Viewer Mock Container */}
          <div style={{ background: '#e2e8f0', minHeight: '600px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '32px' }}>
             <div style={{ width: '850px', minHeight: '800px', background: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '48px' }}>
                <h2 style={{ color: '#0f172a', textAlign: 'center', marginBottom: '32px' }}>Termo de Referência - {currentBid.organ}</h2>
                <div style={{ borderBottom: '2px solid #1d3e83', paddingBottom: '8px', marginBottom: '24px' }}>
                  <p><strong>Pregão:</strong> {currentBid.number}</p>
                  <p><strong>Status:</strong> {currentBid.status.toUpperCase()}</p>
                  <p><strong>Valor Estimado:</strong> R$ {Number(currentBid.estimatedValue).toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                  <p>
                    <strong>Data/Hora Disputa:</strong> {currentBid.disputeDate ? currentBid.disputeDate.split('-').reverse().join('/') : '-'}
                    {currentBid.disputeStartTime && ` às ${currentBid.disputeStartTime}`}
                    {currentBid.disputeEndTime && ` até ${currentBid.disputeEndTime}`}
                  </p>
                  <p><strong>Objeto:</strong> {currentBid.object}</p>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.8' }}>
                   <p>Este documento simula o Anexo em PDF fornecido pela origem organizadora do certame.</p>
                   <br/>
                   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                   <br/>
                   <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                </div>
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
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Número do Pregão</label>
                <input type="text" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Valor Estimado (R$)</label>
                <input type="number" step="0.01" value={formData.estimatedValue} onChange={e => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) })} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="aberto">Aberto</option>
                  <option value="em analise">Em Análise</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Responsável</label>
                <select value={formData.responsible || ''} onChange={e => setFormData({ ...formData, responsible: e.target.value })}>
                  <option value="">Selecione...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Portal de Origem (URL)</label>
              <input type="url" value={formData.originPortal} onChange={e => setFormData({ ...formData, originPortal: e.target.value })} />
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
