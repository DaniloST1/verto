import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Funcionário',
};

export const Disputes = () => {
  const { disputes, clients, bids, addDispute, updateDispute, deleteDispute } = useData();
  const { user, users } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', clientId: '', bidId: '', date: '', status: 'agendada', result: 'pendente', responsible: user.id
  });

  const openModal = (dispute = null) => {
    if (dispute) {
      setEditingId(dispute.id);
      setFormData({ ...dispute });
    } else {
      setEditingId(null);
      setFormData({ name: '', clientId: '', bidId: '', date: '', status: 'agendada', result: 'pendente', responsible: user.id });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) updateDispute(editingId, formData);
    else addDispute(formData);
    setShowModal(false);
  };

  const getResponsibleName = (id) => users.find(u => u.id === id)?.name || 'Desconhecido';
  const getClient = (id) => clients.find(c => c.id === id);
  const getBidNumber = (id) => bids.find(b => b.id === id)?.number || 'Desconhecido';

  const formFields = (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Nome / Identificação</label>
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
          <label>Data e Horário</label>
          <input type="datetime-local" value={formData.date ? formData.date.slice(0, 16) : ''} onChange={e => setFormData({...formData, date: new Date(e.target.value).toISOString()})} />
        </div>
        <div className="form-group" style={{flex: 1}}>
          <label>Status</label>
          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option value="agendada">Agendada</option>
            <option value="em andamento">Em andamento</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </div>
        <div className="form-group" style={{flex: 1}}>
          <label>Resultado</label>
          <select value={formData.result} onChange={e => setFormData({...formData, result: e.target.value})}>
            <option value="pendente">Pendente</option>
            <option value="ganha">Ganha</option>
            <option value="perdida">Perdida</option>
          </select>
        </div>
      </div>

      {(user.role === 'supervisor' || user.role === 'admin') && (
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
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Disputas</h1>
        <button className="btn btn-primary" style={{ background: '#1d3e83' }} onClick={() => openModal()}>
          <Plus size={18}/> Nova Disputa
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead style={{ background: '#eef2f6' }}>
            <tr>
              <th>NOME</th>
              <th>CLIENTE</th>
              <th>EDITAL</th>
              <th>DATA/HORÁRIO</th>
              <th>STATUS</th>
              <th>RESULTADO</th>
              <th>RESPONSÁVEL</th>
              <th style={{ textAlign: 'center' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map(dispute => (
              <tr key={dispute.id}>
                <td style={{ fontWeight: 600 }}>{dispute.name}</td>
                <td>
                  {(() => {
                    const cl = getClient(dispute.clientId);
                    if (!cl) return <span style={{ color: '#94a3b8' }}>—</span>;
                    return (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{cl.name}</div>
                        {cl.cnpj && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{cl.cnpj}</div>}
                      </div>
                    );
                  })()}
                </td>
                <td>{getBidNumber(dispute.bidId)}</td>
                <td>{dispute.date ? new Date(dispute.date).toLocaleString('pt-BR') : '—'}</td>
                <td><span className="badge badge-info">{dispute.status.toUpperCase()}</span></td>
                <td>
                  <span className={`badge ${dispute.result === 'ganha' ? 'badge-success' : dispute.result === 'perdida' ? 'badge-danger' : 'badge-warning'}`}>
                    {dispute.result.toUpperCase()}
                  </span>
                </td>
                <td>{getResponsibleName(dispute.responsible)}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      className="btn"
                      style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }}
                      onClick={() => openModal(dispute)}
                    >
                      <Edit2 size={16} />
                    </button>
                    {(user.role === 'supervisor' || user.role === 'admin') && (
                      <button
                        className="btn"
                        style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px' }}
                        onClick={() => deleteDispute(dispute.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {disputes.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  Nenhuma disputa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Editar Disputa' : 'Nova Disputa'}
          onClose={() => setShowModal(false)}
        >
          {formFields}
        </Modal>
      )}
    </div>
  );
};
