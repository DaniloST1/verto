import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, Filter, X, Eye, ArrowLeft, TrendingUp, Building, Briefcase, DollarSign, Activity, FileText, Gavel, BarChart2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

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
  const { clients, bids, disputes, contracts, cashFlow, clientPayments, addClient, updateClient, deleteClient } = useData();
  const { user, users } = useAuth();
  const { addToast } = useToast();

  const [filterName, setFilterName] = useState('');
  const [filterCnpj, setFilterCnpj] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const emptyForm = {
    name: '', cnpj: '', contact: '', email: '', status: 'apto', responsible_id: '',
    cash_value: 0, notes: '',
    cpf_cnpj_responsible: '', state_registration: '', due_day: 10,
    contract_start: '', contract_end: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // Lock body scroll when modal open
  useEffect(() => {
    if (showModal) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  // Keep viewingClient in sync when clients state updates (e.g. after an edit)
  useEffect(() => {
    if (viewingClient) {
      const updated = clients.find(c => c.id === viewingClient.id);
      if (updated) setViewingClient(updated);
    }
  }, [clients]);

  const clearFilters = () => {
    setFilterName('');
    setFilterCnpj('');
    setFilterStatus('Todos');
  };

  const getResponsibleStr = (id) => {
    const u = users.find(usr => usr.id === id);
    if (!u) return 'Não atribuído';
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Func' };
    return `${u.name} (${abr[u.role] || u.role})`;
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
      // Normalize dates: DataContext converts snake_case to camelCase,
      // so contract_end comes back as contractEnd, contract_start as contractStart
      const resolvedContractEnd = client.contract_end ?? client.contractEnd ?? '';
      const resolvedContractStart = client.contract_start ?? client.contractStart ?? '';
      // Ensure short date format (YYYY-MM-DD) for <input type='date'>
      const toDateInput = (val) => {
        if (!val) return '';
        // If it's already YYYY-MM-DD, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        // If it's an ISO string with time, take date part
        return val.split('T')[0];
      };
      setFormData({
        ...emptyForm,
        ...client,
        cash_value: client.cashValue ?? client.cash_value ?? 0,
        responsible_id: client.responsible ?? client.responsible_id ?? '',
        contract_start: toDateInput(resolvedContractStart),
        contract_end: toDateInput(resolvedContractEnd),
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
    // Strip stale camelCase duplicates that conflict with snake_case when DataContext serializes
    const { contractEnd, contractStart, cashValue, responsible, clientPayments: _cp, ...cleanData } = formData;
    if (editingId) updateClient(editingId, cleanData);
    else addClient(cleanData);
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir cliente?')) deleteClient(id);
  };

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  if (viewingClient) {
    const c = viewingClient;
    const clientBids = bids.filter(b => b.clientsLinked && b.clientsLinked.includes(c.id));
    const clientDisputes = disputes.filter(d => d.clientId === c.id);
    const clientContracts = contracts.filter(con => con.clientId === c.id);

    const formatCurrency = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    // Extract real revenue from Client Payments registry
    let paidList = [];
    clientPayments.filter(cp => cp.clientId === c.id).forEach(cp => {
       if (cp.months) {
           Object.entries(cp.months).forEach(([mIdx, monthData]) => {
              if (monthData && monthData.status === 'pago') {
                 paidList.push({ year: cp.year, monthIndex: parseInt(mIdx), value: Number(monthData.value) || 0 });
              }
           });
       }
    });

    const totalRevenue = paidList.reduce((acc, curr) => acc + curr.value, 0);

    const monthlyData = paidList.reduce((acc, curr) => {
      const sortKeyDate = new Date(curr.year, curr.monthIndex, 1);
      const monthYear = sortKeyDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
      if (!acc[monthYear]) acc[monthYear] = { name: monthYear, Receita: 0, sortKey: sortKeyDate.getTime() };
      acc[monthYear].Receita += curr.value;
      return acc;
    }, {});
    
    const chartData = Object.values(monthlyData).sort((a,b) => a.sortKey - b.sortKey);

    return (
      <div className="client-viewer fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => setViewingClient(null)}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: '#0f172a', margin: 0 }}>{c.name}</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Visualização detalhada e mapa de resultados</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ flex: '1 1 300px', padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', marginBottom: '16px' }}><Building size={18}/> Ficha Cadastral</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div><strong style={{ color: '#64748b' }}>CNPJ Principal:</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{c.cnpj || '-'}</span></div>
              <div><strong style={{ color: '#64748b' }}>CPF/CNPJ do Responsável:</strong> {c.cpf_cnpj_responsible || '-'}</div>
              <div><strong style={{ color: '#64748b' }}>Inscrição Estadual:</strong> {c.state_registration || '-'}</div>
              <div><strong style={{ color: '#64748b' }}>Telefone:</strong> {c.contact || '-'}</div>
              <div><strong style={{ color: '#64748b' }}>Email:</strong> {c.email || '-'}</div>
              <div><strong style={{ color: '#64748b' }}>Responsável de Gestão (Verto):</strong> {getResponsibleStr(c.responsible_id || c.responsible)}</div>
              <div><strong style={{ color: '#64748b' }}>Mês/Dia de Cobrança:</strong> Dia {c.due_day || 10}</div>
              <div><strong style={{ color: '#64748b' }}>Valor de Honorário:</strong> {formatCurrency(c.cash_value || 0)}</div>
              <div><strong style={{ color: '#64748b' }}>Início do Contrato:</strong> {(() => {
                const val = c.contract_start || c.contractStart;
                if (!val) return '-';
                const d = new Date(val.includes('T') ? val : val + 'T12:00:00');
                return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR');
              })()}</div>
              <div><strong style={{ color: '#64748b' }}>Término do Contrato:</strong> {(() => {
                const val = c.contract_end || c.contractEnd;
                if (!val) return '-';
                const d = new Date(val.includes('T') ? val : val + 'T12:00:00');
                return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR');
              })()}</div>
              <div><strong style={{ color: '#64748b' }}>Status Operacional:</strong> <span style={{ color: c.status==='apto'? '#10b981':'#ef4444', fontWeight: 600 }}>{c.status === 'apto' ? 'ATIVADO' : 'INATIVO'}</span></div>
            </div>
            {c.notes && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                <strong style={{display:'block', marginBottom:'4px', color:'#1e293b'}}>Observações Internas:</strong>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{c.notes}</p>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ flex: '2 1 500px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', marginBottom: '24px' }}><BarChart2 size={18}/> Retorno Estratégico</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '32px' }}>
               <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap:'6px' }}><FileText size={14}/> Editais Mapeados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '8px' }}>{clientBids.length}</div>
               </div>
               <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap:'6px' }}><Gavel size={14}/> Disputas</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '8px' }}>{clientDisputes.length}</div>
               </div>
               <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap:'6px' }}><Briefcase size={14}/> Contratos Ativos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '8px' }}>{clientContracts.length}</div>
               </div>
               <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap:'6px' }}><DollarSign size={14}/> Receita Realizada</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981', marginTop: '8px' }}>{formatCurrency(totalRevenue)}</div>
               </div>
            </div>

            <div style={{ flex: 1, minHeight: '280px', width: '100%' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px', fontWeight: 600 }}>Evolução de Receita (Meses Históricos)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false}/>
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{fill: 'rgba(0,0,0,0.05)'}}/>
                  <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {chartData.length === 0 && (
                <div style={{ position: 'absolute', top: '70%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Sem histórico de pagamentos registrados ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <th>RESPONSÁVEL</th>
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
                <td style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                  {getResponsibleStr(c.responsible_id || c.responsible)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="btn" style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px' }} onClick={() => setViewingClient(c)} title="Ver Dados">
                      <Eye size={16} />
                    </button>
                    <button className="btn" style={{ padding: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#3b82f6', borderRadius: '8px' }} onClick={() => openForm(c)} title="Editar">
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

            {/* Valor + Validades */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Valor Recorrente (R$) *</label>
                <input
                  type="number" step="0.01"
                  value={formData.cash_value}
                  onChange={e => set('cash_value', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Início do Contrato</label>
                <input
                  type="date"
                  value={formData.contract_start || ''}
                  onChange={e => set('contract_start', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Término do Contrato *</label>
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

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Observações Adicionais</label>
              <textarea
                rows={3}
                placeholder="Insira detalhes pertinentes sobre este cliente..."
                value={formData.notes || ''}
                onChange={e => set('notes', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
