import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, Filter, X } from 'lucide-react';
import { Modal } from '../components/Modal';

// ---- Mask helpers ----
const maskCNPJ = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0,2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
  if (v.length <= 12) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
};

const maskCPF = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0,3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
};

const maskCPFCNPJ = (v = '') => {
  const digits = v.replace(/\D/g, '');
  return digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
};

const maskPhone = (v = '') => {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
};

const isValidCNPJ = (v = '') => v.replace(/\D/g, '').length === 14;
const isValidEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v = '') => v.replace(/\D/g, '').length >= 10;

const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';

export const Clients = () => {
  const { clients, addClient, updateClient, deleteClient } = useData();
  const { user, users } = useAuth();
  const { addToast } = useToast();

  const [filterName, setFilterName] = useState('');
  const [filterCnpj, setFilterCnpj] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const emptyForm = {
    name: '', cnpj: '', contact: '', email: '', status: 'apto', responsible_id: '',
    cash_value: 0, notes: '',
    cpf_cnpj_responsible: '', state_registration: '', due_day: 10, contract_end: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // Lock body scroll when modal open
  useEffect(() => {
    if (showModal) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  const clearFilters = () => {
    setFilterName('');
    setFilterCnpj('');
    setFilterStatus('Todos');
  };

  const filteredClients = useMemo(() => {
    const digits = (s = '') => s.replace(/\D/g, '');
    return clients.filter(c => {
      if (filterName && !c.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterCnpj) {
        const queryDigits = digits(filterCnpj);
        const clientDigits = digits(c.cnpj || '');
        // Match either formatted string or raw digits
        const formattedMatch = (c.cnpj || '').includes(filterCnpj);
        const digitMatch = queryDigits && clientDigits.includes(queryDigits);
        if (!formattedMatch && !digitMatch) return false;
      }
      if (filterStatus !== 'Todos') {
        const clientStatus = c.status === 'apto' ? 'Ativado' : 'Inativo';
        if (clientStatus !== filterStatus) return false;
      }
      return true;
    });
  }, [clients, filterName, filterCnpj, filterStatus]);

  const openForm = (client = null) => {
    if (client) {
      setEditingId(client.id);
      setFormData({ 
        ...emptyForm, 
        ...client,
        cash_value: client.cashValue ?? client.cash_value,
        responsible_id: client.responsible ?? client.responsible_id,
        contract_end: client.contractEnd ?? client.contract_end
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm);
    }
    setFieldErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    if (!isValidCNPJ(formData.cnpj)) errors.cnpj = 'CNPJ deve ter 14 dígitos (00.000.000/0000-00)';
    if (formData.email && !isValidEmail(formData.email)) errors.email = 'E-mail inválido';
    if (formData.contact && !isValidPhone(formData.contact)) errors.contact = 'Telefone inválido (mín. 10 dígitos)';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (editingId) updateClient(editingId, formData);
    else addClient(formData);
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir cliente?')) deleteClient(id);
  };

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '8px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Clientes</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestão de carteira e contratos</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()} style={{ borderRadius: '8px' }}>
            <Plus size={18} /> Novo Cliente
          </button>
      </div>

      <div className="glass-panel client-filter-panel" style={{ padding: '24px', marginBottom: '24px', borderRadius: '12px', marginTop: '24px' }}>
        <div className="filter-grid-container">
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome da Empresa</label>
            <input type="text" placeholder="Buscar por nome..." value={filterName} onChange={e => setFilterName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CNPJ</label>
            <input type="text" placeholder="00.000.000/0000-00" value={filterCnpj} onChange={e => setFilterCnpj(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Ativado">Ativado</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <div className="filter-actions-cell">
            <button className="btn btn-secondary" onClick={clearFilters} style={{ flex: 1, background: '#fff', border: '1px solid #cbd5e1' }}><X size={16} /> Limpar</button>
            <button className="btn btn-primary" style={{ flex: 1, background: '#1d3e83' }}><Filter size={16} /> Filtrar</button>
          </div>
        </div>
      </div>

      <style>{`
        .filter-grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          align-items: end;
        }
        .filter-actions-cell {
          display: flex;
          gap: 8px;
        }
        @media (max-width: 600px) {
          .filter-grid-container {
            grid-template-columns: 1fr 1fr;
          }
          .filter-actions-cell {
            grid-column: span 2;
          }
        }
        @media (max-width: 400px) {
          .filter-grid-container {
            grid-template-columns: 1fr;
          }
          .filter-actions-cell {
            grid-column: span 1;
          }
          .client-filter-panel {
            padding: 16px !important;
          }
        }
      `}</style>

      <div className="table-container">
        <table>
          <thead style={{ background: '#eef2f6' }}>
            <tr>
              <th>NOME DA EMPRESA</th>
              <th>CNPJ</th>
              <th>EMAIL</th>
              <th>TELEFONE</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'center' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</td>
                <td>{c.cnpj || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.contact || '-'}</td>
                <td>
                  <span style={{
                    padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700,
                    border: c.status === 'apto' ? '1px solid #10b981' : '1px solid #ef4444',
                    color: c.status === 'apto' ? '#10b981' : '#ef4444',
                    background: '#fff'
                  }}>
                    {c.status === 'apto' ? 'ATIVADO' : 'INATIVO'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }} onClick={() => openForm(c)}>
                      <Edit2 size={16} />
                    </button>
                    {(user.role === 'admin' || user.role === 'supervisor') && (
                      <button className="btn" style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px' }} onClick={() => handleDelete(c.id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
          onClose={() => setShowModal(false)}
          maxWidth="680px"
        >
          <form onSubmit={handleSubmit}>
            {/* Nome */}
            <div className="form-group">
              <label>Nome da Empresa *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => set('name', e.target.value)}
                className={fieldErrors.name ? 'input-error' : ''}
              />
              {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
            </div>

            {/* CNPJ + CPF Responsável */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>CNPJ Principal *</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={e => set('cnpj', maskCNPJ(e.target.value))}
                  maxLength={18}
                  className={fieldErrors.cnpj ? 'input-error' : ''}
                />
                {fieldErrors.cnpj && <span className="field-error-msg">{fieldErrors.cnpj}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>CPF/CNPJ Responsável (Opcional)</label>
                <input
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={formData.cpf_cnpj_responsible || ''}
                  onChange={e => set('cpf_cnpj_responsible', maskCPFCNPJ(e.target.value))}
                  maxLength={18}
                />
              </div>
            </div>

            {/* Inscrição Estadual + Email */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Inscrição Estadual</label>
                <input
                  type="text"
                  value={formData.state_registration || ''}
                  onChange={e => set('state_registration', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>E-mail *</label>
                <input
                  type="email"
                  placeholder="email@empresa.com.br"
                  value={formData.email}
                  onChange={e => set('email', e.target.value)}
                  className={fieldErrors.email ? 'input-error' : ''}
                />
                {fieldErrors.email && <span className="field-error-msg">{fieldErrors.email}</span>}
              </div>
            </div>

            {/* Telefone + Dia Vencimento */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Telefone *</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={formData.contact}
                  onChange={e => set('contact', maskPhone(e.target.value))}
                  maxLength={15}
                  className={fieldErrors.contact ? 'input-error' : ''}
                />
                {fieldErrors.contact && <span className="field-error-msg">{fieldErrors.contact}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Dia de Vencimento *</label>
                <input
                  type="number" min="1" max="31"
                  value={formData.due_day || 10}
                  onChange={e => set('due_day', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Valor + Validade */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Valor Recorrente do Contrato (R$) *</label>
                <input
                  type="number" step="0.01"
                  value={formData.cash_value}
                  onChange={e => set('cash_value', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Validade do Contrato *</label>
                <input
                  type="date"
                  value={formData.contract_end || ''}
                  onChange={e => set('contract_end', e.target.value)}
                />
              </div>
            </div>

            {/* Status + Responsável */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Status do Sistema *</label>
                <select value={formData.status} onChange={e => set('status', e.target.value)}>
                  <option value="apto">Ativado</option>
                  <option value="pendente">Inativo</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Responsável de Gestão</label>
                <select value={formData.responsible_id || ''} onChange={e => set('responsible_id', e.target.value)}>
                  <option value="">Selecione...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
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
