import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, List, Search } from 'lucide-react';
import { Modal } from '../components/Modal';

const ROLE_NAMES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  finance: 'Financeiro',
  employee: 'Colaborador',
  client: 'Cliente',
};

export const Disputes = () => {
  const { disputes, clients, bids, addDispute, updateDispute, deleteDispute } = useData();
  const { user, users } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDayDate, setActiveDayDate] = useState(null);
  const [responsibleInput, setResponsibleInput] = useState('');
  const [showRespSuggestions, setShowRespSuggestions] = useState(false);
  
  // Filter states
  const [filterSearch, setFilterSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      if (filterDate && d.date !== filterDate) return false;
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterResult && d.result !== filterResult) return false;
      if (filterClient && d.clientId !== filterClient) return false;
      if (filterSearch && !d.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      return true;
    });
  }, [disputes, filterSearch, filterClient, filterStatus, filterResult, filterDate]);

  const clearFilters = () => {
    setFilterSearch('');
    setFilterClient('');
    setFilterStatus('');
    setFilterResult('');
    setFilterDate('');
  };
  
  const [formData, setFormData] = useState({
    name: '', clientId: '', bidId: '', date: '', start_time: '', end_time: '', status: 'agendada', result: 'pendente', responsible: user?.id || ''
  });

  const getResponsibleStr = (id) => {
    const u = users.find(usr => usr.id === id);
    if (!u) return 'Não atribuído';
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };
    return `${u.name} (${abr[u.role] || u.role})`;
  };

  const responsibleSuggestions = useMemo(() => {
    if (!responsibleInput || !showRespSuggestions) return [];
    const lower = responsibleInput.toLowerCase();
    const abr = { admin: 'Admin', finance: 'Financ', supervisor: 'Superv', employee: 'Colab' };
    return users.filter(u => {
      const roleStr = abr[u.role] || u.role;
      return u.name.toLowerCase().includes(lower) || roleStr.toLowerCase().includes(lower);
    }).slice(0, 5);
  }, [responsibleInput, users, showRespSuggestions]);

  const openModal = (dispute = null) => {
    if (dispute) {
      setEditingId(dispute.id);
      setFormData({ ...dispute });
      setResponsibleInput(dispute.responsible ? getResponsibleStr(dispute.responsible) : '');
    } else {
      setEditingId(null);
      setFormData({ name: '', clientId: '', bidId: '', date: '', start_time: '', end_time: '', status: 'agendada', result: 'pendente', responsible: user?.id || '' });
      setResponsibleInput(user?.id ? getResponsibleStr(user.id) : '');
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.start_time && formData.end_time) {
      if (formData.end_time <= formData.start_time) {
        addToast("O horário de término não pode ser menor ou igual ao de início.", 'error');
        return;
      }
    }
    if (editingId) updateDispute(editingId, formData);
    else addDispute(formData);
    setShowModal(false);
  };

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
          <label>Data</label>
          <input type="date" value={formData.date ? (typeof formData.date === 'string' && formData.date.includes('T') ? formData.date.split('T')[0] : formData.date) : ''} onChange={e => setFormData({...formData, date: e.target.value})} required />
        </div>
        <div className="form-group" style={{flex: 1}}>
          <label>Horário (Início)</label>
          <input type="time" value={formData.start_time || ''} onChange={e => setFormData({...formData, start_time: e.target.value})} />
        </div>
        <div className="form-group" style={{flex: 1}}>
          <label>Horário (Término)</label>
          <input type="time" value={formData.end_time || ''} onChange={e => setFormData({...formData, end_time: e.target.value})} />
        </div>
      </div>

      <div style={{display: 'flex', gap: '16px'}}>
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
        <div className="form-group" style={{ flex: 1, position: 'relative' }}>
          <label>Responsável</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Busque por nome ou função..."
              value={responsibleInput}
              style={{ paddingLeft: '36px' }}
              onChange={e => {
                setResponsibleInput(e.target.value);
                setShowRespSuggestions(true);
              }}
              onFocus={() => setShowRespSuggestions(true)}
              onBlur={() => setTimeout(() => setShowRespSuggestions(false), 200)}
            />
          </div>
          {showRespSuggestions && responsibleSuggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {responsibleSuggestions.map(u => (
                <div key={u.id} className="autocomplete-item" onClick={() => {
                  setFormData({ ...formData, responsible: u.id });
                  setResponsibleInput(getResponsibleStr(u.id));
                  setShowRespSuggestions(false);
                }}>
                  <strong>{u.name}</strong>
                  <span>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px'}}>
        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
        <button type="submit" className="btn btn-primary" style={{ background: '#1d3e83' }}>Salvar</button>
      </div>
    </form>
  );

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const weeks = [];
    let days = [];
    for (let i = 0; i < firstDay; i++) {
       days.push(<td key={`empty-${i}`} style={{ border: '1px solid #f1f5f9', background: '#fafafa' }}></td>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
       const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
       const dayDisputes = filteredDisputes.filter(disp => disp.date && disp.date.startsWith(dateStr)).sort((a,b) => new Date(a.date) - new Date(b.date));
       const isToday = new Date().toISOString().startsWith(dateStr);
       days.push(
         <td key={d} style={{ verticalAlign: 'top', padding: '8px', border: '1px solid #e2e8f0', minHeight: '120px', height: '120px', width: '14.28%', background: isToday ? '#f0fdfa' : '#fff' }}>
           <div style={{ fontWeight: 600, color: isToday ? '#0f766e' : '#64748b', marginBottom: '8px', textAlign: 'right' }}>
             <span onClick={() => setActiveDayDate(dateStr)} style={{ background: isToday ? '#ccfbf1' : 'transparent', padding: '2px 8px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = isToday ? '#ccfbf1' : 'transparent'} title="Ver todas as disputas do dia">{d}</span>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
             {dayDisputes.map(disp => {
               const timeKey = disp.start_time || (disp.date && disp.date.includes('T') ? new Date(disp.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '00:00');
               const statusColors = {
                 'agendada': { bg: '#ecfeff', color: '#0891b2', border: '#06b6d4' },
                 'em andamento': { bg: '#fffbeb', color: '#d97706', border: '#f59e0b' },
                 'finalizada': { bg: '#f0fdf4', color: '#16a34a', border: '#22c55e' }
               };
               const c = statusColors[disp.status] || statusColors['agendada'];
               return (
                 <div key={disp.id} onClick={() => openModal(disp)} style={{ fontSize: '0.7rem', padding: '4px 6px', background: c.bg, color: c.color, borderRadius: '4px', cursor: 'pointer', borderLeft: `3px solid ${c.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${timeKey} - ${disp.name}`}>
                   <strong>{timeKey}</strong> {getClient(disp.clientId)?.name?.split(' ')[0] || ''}
                 </div>
               );
             })}
           </div>
         </td>
       );
       if (days.length === 7) {
         weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
         days = [];
       }
    }
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(<td key={`empty-end-${days.length}`} style={{ border: '1px solid #f1f5f9', background: '#fafafa' }}></td>);
      }
      weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
    }
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return (
       <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>{monthNames[month]} de {year}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
               <button className="btn" style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={prevMonth}>&lt; Anterior</button>
               <button className="btn" style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={() => setCurrentDate(new Date())}>Hoje</button>
               <button className="btn" style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1' }} onClick={nextMonth}>Próximo &gt;</button>
            </div>
         </div>
         <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
             <thead>
               <tr>
                 {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(d => (
                   <th key={d} style={{ padding: '12px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '0.85rem' }}>{d}</th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {weeks}
             </tbody>
           </table>
         </div>
       </div>
    );
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a', margin: 0 }}>Disputas</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Gerenciamento de lances e pregões</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '4px' }}>
            <button className={`btn ${viewMode === 'list' ? 'btn-primary' : ''}`} style={{ padding: '6px 12px', background: viewMode === 'list' ? '#fff' : 'transparent', color: viewMode === 'list' ? '#1e293b' : '#64748b', border: 'none', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }} onClick={() => setViewMode('list')}>
              <List size={16} /> Lista
            </button>
            <button className={`btn ${viewMode === 'calendar' ? 'btn-primary' : ''}`} style={{ padding: '6px 12px', background: viewMode === 'calendar' ? '#fff' : 'transparent', color: viewMode === 'calendar' ? '#1e293b' : '#64748b', border: 'none', boxShadow: viewMode === 'calendar' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }} onClick={() => setViewMode('calendar')}>
              <CalendarIcon size={16} /> Calendário
            </button>
          </div>
          <button className="btn btn-primary" style={{ background: '#1d3e83' }} onClick={() => openModal()}>
            <Plus size={18}/> Nova Disputa
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Buscar por Nome</label>
            <input 
              type="text" 
              placeholder="Ex: Pregão 001..." 
              value={filterSearch} 
              onChange={e => setFilterSearch(e.target.value)} 
              style={{ padding: '10px', fontSize: '0.9rem' }} 
            />
          </div>
          <div style={{ width: '180px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Data</label>
            <input 
              type="date" 
              value={filterDate} 
              onChange={e => setFilterDate(e.target.value)} 
              style={{ padding: '10px', fontSize: '0.9rem' }} 
            />
          </div>
          <div style={{ width: '220px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Cliente</label>
            <select 
              value={filterClient} 
              onChange={e => setFilterClient(e.target.value)} 
              style={{ padding: '10px', fontSize: '0.9rem' }}
            >
              <option value="">Todos os Clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ width: '160px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Status</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)} 
              style={{ padding: '10px', fontSize: '0.9rem' }}
            >
              <option value="">Status: Todos</option>
              <option value="agendada">Agendada</option>
              <option value="em andamento">Em andamento</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
          <div style={{ width: '160px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Resultado</label>
            <select 
              value={filterResult} 
              onChange={e => setFilterResult(e.target.value)} 
              style={{ padding: '10px', fontSize: '0.9rem' }}
            >
              <option value="">Resultado: Todos</option>
              <option value="pendente">Pendente</option>
              <option value="ganha">Ganha</option>
              <option value="perdida">Perdida</option>
              <option value="desclassificado">Desclassificado</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={clearFilters} style={{ padding: '11px 20px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0' }}>
            Limpar
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? renderCalendar() : (
      <div className="table-container animate-fade-in">
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
            {filteredDisputes.map(dispute => (
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
                <td>
                  <div>
                    <div style={{ color: '#1e293b', fontWeight: 500 }}>
                      {dispute.date ? (dispute.date.includes('T') ? new Date(dispute.date).toLocaleDateString('pt-BR') : dispute.date.split('-').reverse().join('/')) : '—'}
                    </div>
                    {(dispute.start_time || dispute.end_time) && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {dispute.start_time || '-'} às {dispute.end_time || '-'}
                      </div>
                    )}
                  </div>
                </td>
                <td><span className="badge badge-info">{dispute.status.toUpperCase()}</span></td>
                <td>
                  <span className={`badge ${dispute.result === 'ganha' ? 'badge-success' : dispute.result === 'perdida' ? 'badge-danger' : 'badge-warning'}`}>
                    {dispute.result.toUpperCase()}
                  </span>
                </td>
                <td>{getResponsibleStr(dispute.responsible)}</td>
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
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Disputa' : 'Nova Disputa'}
          onClose={() => setShowModal(false)}
        >
          {formFields}
        </Modal>
      )}

      {activeDayDate && (
        <Modal
          title={`Disputas em ${activeDayDate.split('-').reverse().join('/')}`}
          onClose={() => setActiveDayDate(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const dayItems = disputes.filter(disp => disp.date && disp.date.startsWith(activeDayDate)).sort((a,b) => new Date(a.date) - new Date(b.date));
              if (dayItems.length === 0) return <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Nenhuma disputa agendada para este dia.</div>;
              return dayItems.map(disp => {
                const statusColors = {
                 'agendada': { bg: '#ecfeff', border: '#06b6d4', color: '#0891b2' },
                 'em andamento': { bg: '#fffbeb', border: '#f59e0b', color: '#d97706' },
                 'finalizada': { bg: '#f0fdf4', border: '#22c55e', color: '#16a34a' }
                };
                const c = statusColors[disp.status] || statusColors['agendada'];
                const timeStr = disp.start_time || (disp.date.includes('T') ? new Date(disp.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '00:00');
                
                return (
                  <div key={disp.id} style={{ padding: '16px', background: '#f8fafc', borderLeft: `6px solid ${c.border}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>{timeStr} - {disp.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        <strong>Cliente:</strong> {getClient(disp.clientId)?.name || 'N/A'}<br/>
                        <strong>Responsável:</strong> {getResponsibleStr(disp.responsible)}<br/>
                        {(disp.start_time || disp.end_time) && <span><strong>Duração:</strong> {disp.start_time || '...'} às {disp.end_time || '...'}</span>}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.color, padding: '4px 8px', borderRadius: '12px' }}>{disp.status.toUpperCase()}</span>
                    </div>
                  </div>
                );
              });
            })()}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
               <button className="btn btn-secondary" onClick={() => setActiveDayDate(null)}>Fechar</button>
               <button className="btn btn-primary" onClick={() => {
                 setActiveDayDate(null);
                 setEditingId(null);
                 const datePrefix = activeDayDate;
                 setFormData({ name: '', clientId: '', bidId: '', date: datePrefix, start_time: '', end_time: '', status: 'agendada', result: 'pendente', responsible: user?.id || '' });
                 setShowModal(true);
               }}>Adicionar Nova</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
