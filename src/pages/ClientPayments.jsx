import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckCircle, AlertCircle, Clock, MessageCircle, Edit2, Trash2, Filter, X } from 'lucide-react';
import { Modal } from '../components/Modal';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';

// Auto-status: if due date has passed and status is still 'pendente' → 'atrasado'
const computeStatus = (record) => {
  if (record.status === 'pago') return 'pago';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(record.dueDate);
  due.setHours(0, 0, 0, 0);
  if (due < today) return 'atrasado';
  return 'pendente';
};

const StatusBadge = ({ status }) => {
  const config = {
    pago:     { className: 'badge badge-success', label: 'Pago',     icon: <CheckCircle size={12} /> },
    pendente: { className: 'badge badge-warning',  label: 'Pendente', icon: <Clock size={12} /> },
    atrasado: { className: 'badge badge-overdue',  label: 'Atrasado', icon: <AlertCircle size={12} /> },
  };
  const { className, label, icon } = config[status] || config.pendente;
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {icon} {label}
    </span>
  );
};

export const ClientPayments = () => {
  const { clients, clientPayments, updatePaymentStatus } = useData();
  const { user } = useAuth();
  const { addToast } = useToast();

  const isFinance = user.role === 'finance' || user.role === 'admin';

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [filterName, setFilterName] = useState('');
  const [filterCnpj, setFilterCnpj] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterMonth, setFilterMonth] = useState(currentMonth.toString());
  const [filterYear, setFilterYear] = useState(currentYear.toString());

  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    dueDate: '', value: 0, status: 'pendente', paymentMethod: 'Boleto bancário'
  });

  // Lock body scroll when modal open
  useEffect(() => {
    if (editingRecord) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [editingRecord]);

  const clearFilters = () => {
    setFilterName('');
    setFilterCnpj('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('Todos');
    setFilterMonth(currentMonth.toString());
    setFilterYear(currentYear.toString());
  };

  const allRecords = useMemo(() => {
    let records = [];
    const yearToUse = parseInt(filterYear) || currentYear;

    clients.forEach(client => {
      const cp = clientPayments.find(c => c.clientId === client.id && c.year === yearToUse);
      const monthsToGenerate = filterMonth ? [parseInt(filterMonth) - 1] : [0,1,2,3,4,5,6,7,8,9,10,11];

      monthsToGenerate.forEach(i => {
        const dueDay = client.due_day || client.cashValue ? 10 : 10; // default 10
        const dueDayNum = client.due_day || 10;
        const monthData = cp?.months?.[i] || {
          status: 'pendente',
          dueDate: `${yearToUse}-${String(i + 1).padStart(2, '0')}-${String(dueDayNum).padStart(2,'0')}`,
          value: client.cash_value || client.cashValue || 0,
          paymentMethod: 'Boleto bancário',
          proof: null
        };

        const raw = {
          id: `${client.id}-${yearToUse}-${i}`,
          clientId: client.id,
          clientName: client.name,
          cnpj: client.cnpj,
          contact: client.contact,
          monthIndex: i,
          year: yearToUse,
          reference: `${MONTH_NAMES[i]}/${yearToUse}`,
          status: monthData.status,
          value: monthData.value,
          dueDate: monthData.dueDate,
          paymentMethod: monthData.paymentMethod,
          proof: monthData.proof
        };
        records.push({ ...raw, computedStatus: computeStatus(raw) });
      });
    });
    return records;
  }, [clients, clientPayments, filterMonth, filterYear, currentYear]);

  const filteredRecords = useMemo(() => {
    const digits = (s = '') => s.replace(/\D/g, '');
    return allRecords.filter(r => {
      if (filterName && !r.clientName.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterCnpj) {
        const qDigits = digits(filterCnpj);
        const formattedMatch = (r.cnpj || '').includes(filterCnpj);
        const digitMatch = qDigits && digits(r.cnpj || '').includes(qDigits);
        if (!formattedMatch && !digitMatch) return false;
      }

      const statusToFilter = filterStatus.toLowerCase();
      if (filterStatus !== 'Todos' && r.computedStatus !== statusToFilter) return false;

      if (filterStartDate && new Date(r.dueDate) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(r.dueDate) > new Date(filterEndDate)) return false;
      return true;
    });
  }, [allRecords, filterName, filterCnpj, filterStatus, filterStartDate, filterEndDate]);

  const openEditModal = (record) => {
    if (!isFinance) return;
    setEditingRecord(record);
    setEditForm({
      dueDate: record.dueDate,
      value: record.value,
      status: record.status,
      paymentMethod: record.paymentMethod
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updatePaymentStatus(editingRecord.clientId, editingRecord.year, editingRecord.monthIndex, {
      dueDate: editForm.dueDate,
      value: editForm.value,
      status: editForm.status,
      paymentMethod: editForm.paymentMethod
    });
    setEditingRecord(null);
  };

  const clearMonthRecord = (record) => {
    if (!isFinance) return;
    updatePaymentStatus(record.clientId, record.year, record.monthIndex, {
      status: 'pendente', paymentMethod: 'Boleto bancário', proof: null
    });
  };

  const sendWhatsApp = (record) => {
    if (!record.contact) { addToast('Cliente não possui contato cadastrado.', 'error'); return; }
    const dtArr = record.dueDate.split('-');
    const brDate = `${dtArr[2]}/${dtArr[1]}/${dtArr[0]}`;
    const msg = encodeURIComponent(`Olá ${record.clientName}, tudo bem? Identificamos que a fatura referente ao mês de ${record.reference} no valor de R$ ${record.value.toFixed(2)}, com vencimento para ${brDate}, está constando em aberto. Por favor, poderia verificar? A Verto Soluções agradece.`);
    window.open(`https://wa.me/55${record.contact.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div>
      {/* Filter Section */}
      <div className="glass-panel payment-filter-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Filtros</h3>
        
        <div className="filter-grid-container" style={{ marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome da Empresa</label>
            <input type="text" placeholder="Buscar por nome..." value={filterName} onChange={e => setFilterName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CNPJ</label>
            <input type="text" placeholder="00.000.000/0000-00" value={filterCnpj} onChange={e => setFilterCnpj(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Data Início (Vencimento)</label>
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Data Fim (Vencimento)</label>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
          </div>
        </div>

        <div className="filter-grid-container">
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mês</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">Todos</option>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ano</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              {[2024,2025,2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="filter-actions-cell">
            <button className="btn btn-secondary" onClick={clearFilters} style={{ flex: 1 }}><X size={16} /> Limpar</button>
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
          .payment-filter-panel {
            padding: 16px !important;
          }
        }
      `}</style>

      {/* Table Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--text-main)', margin: 0 }}>Histórico de Mensalidades</h3>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> Pago</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span> Pendente</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#be123c', display: 'inline-block' }}></span> Atrasado</span>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead style={{ background: '#eef2f6' }}>
              <tr>
                <th>CLIENTE</th>
                <th>REFERÊNCIA</th>
                <th>VENCIMENTO</th>
                <th>VALOR</th>
                <th>STATUS</th>
                <th>FORMA PAGAMENTO</th>
                <th style={{ textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const isOverdue = record.computedStatus === 'atrasado';
                return (
                  <tr key={record.id} style={isOverdue ? { background: '#fff5f5' } : {}}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{record.clientName}</div>
                      {record.cnpj && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{record.cnpj}</div>}
                    </td>
                    <td>{record.reference}</td>
                    <td style={{ color: isOverdue ? '#be123c' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                      {formatDate(record.dueDate)}
                    </td>
                    <td style={{ fontWeight: 600 }}>R$ {record.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td><StatusBadge status={record.computedStatus} /></td>
                    <td>{record.paymentMethod}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn"
                          style={{ padding: '6px', background: 'var(--surface-color)', border: '1px solid #cbd5e1', color: '#25D366' }}
                          title="Cobrar via WhatsApp"
                          onClick={() => sendWhatsApp(record)}
                        >
                          <MessageCircle size={16} />
                        </button>
                        {isFinance && (
                          <>
                            <button
                              className="btn"
                              style={{ padding: '6px', background: 'var(--surface-color)', border: '1px solid #cbd5e1', color: '#3b82f6' }}
                              title="Editar"
                              onClick={() => openEditModal(record)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px' }}
                              title="Limpar / Resetar Mês"
                              onClick={() => clearMonthRecord(record)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    Nenhuma mensalidade encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRecord && (
        <Modal
          title={`Editar Mensalidade — ${editingRecord.reference}`}
          onClose={() => setEditingRecord(null)}
          maxWidth="420px"
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px', marginTop: '-8px' }}>
            {editingRecord.clientName}
          </p>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Data de Vencimento</label>
              <input type="date" value={editForm.dueDate} onChange={e => setEditForm({...editForm, dueDate: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Valor (R$)</label>
              <input type="number" step="0.01" value={editForm.value} onChange={e => setEditForm({...editForm, value: parseFloat(e.target.value)})} required />
            </div>
            <div className="form-group">
              <label>Forma de Pagamento</label>
              <select value={editForm.paymentMethod} onChange={e => setEditForm({...editForm, paymentMethod: e.target.value})}>
                <option value="Boleto bancário">Boleto bancário</option>
                <option value="PIX">PIX</option>
                <option value="Transferência">Transferência</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
