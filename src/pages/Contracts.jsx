import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Calendar, Flag } from 'lucide-react';
import { Modal } from '../components/Modal';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Colaborador',
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', clientId: '', bidId: '', value: 0, status: 'ativo', startDate: '', endDate: '', responsible: user?.id || ''
  });

  const openModal = (contract = null) => {
    if (contract) {
      setEditingId(contract.id);
      setFormData({ ...contract });
    } else {
      setEditingId(null);
      setFormData({ name: '', clientId: '', bidId: '', value: 0, status: 'ativo', startDate: '', endDate: '', responsible: user?.id || '' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) updateContract(editingId, formData);
    else addContract(formData);
    setShowModal(false);
  };

  const getResponsibleName = (id) => {
    const u = users.find(u => u.id === id);
    if (!u) return 'Desconhecido';
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };
    return `${u.name} (${abr[u.role] || u.role})`;
  };
  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';
  const getBidNumber = (id) => bids.find(b => b.id === id)?.number || '—';

  // All roles can create/delete now (per user request)
  return (
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
              <th>RESPONSÁVEL</th>
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
                <td>{getResponsibleName(contract.responsible)}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }} onClick={() => openModal(contract)}>
                      <Edit2 size={16} />
                    </button>
                    {(user?.role === 'supervisor' || user?.role === 'admin') && (
                      <button className="btn" style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px' }} onClick={() => deleteContract(contract.id)}>
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

      {showModal && (
        <Modal title={editingId ? 'Editar Contrato' : 'Novo Contrato'} onClose={() => setShowModal(false)}>
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

            {(user?.role === 'supervisor' || user?.role === 'admin') && (
              <div className="form-group">
                <label>Responsável</label>
                <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({ROLE_NAMES[u.role] || u.role})</option>)}
                </select>
              </div>
            )}

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px'}}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
