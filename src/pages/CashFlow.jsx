import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export const CashFlow = () => {
  const { cashFlow, addCashFlow, deleteCashFlow } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', date: new Date().toISOString(), value: 0, type: 'despesa', specificType: 'operacional', status: 'pago'
  });

  const [filterQuery, setFilterQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const isFinance = user.role === 'finance' || user.role === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    addCashFlow(formData);
    setShowModal(false);
  };

  const filteredCashFlow = useMemo(() => {
    return cashFlow.filter(c => {
       if (filterQuery && !c.name.toLowerCase().includes(filterQuery.toLowerCase()) && !(c.specificType||'').toLowerCase().includes(filterQuery.toLowerCase())) return false;
       if (filterMonth !== 'Todos') {
          const m = new Date(c.date).getMonth() + 1;
          if (m.toString() !== filterMonth) return false;
       }
       if (filterYear !== 'Todos') {
          const y = new Date(c.date).getFullYear();
          if (y.toString() !== filterYear) return false;
       }
       return true;
    });
  }, [cashFlow, filterQuery, filterMonth, filterYear]);

  const balance = filteredCashFlow.reduce((acc, curr) => curr.type === 'receita' ? acc + curr.value : acc - curr.value, 0);
  const totalReceitas = filteredCashFlow.filter(c => c.type === 'receita').reduce((a, b) => a + b.value, 0);
  const totalDespesas = filteredCashFlow.filter(c => c.type === 'despesa').reduce((a, b) => a + b.value, 0);

  const pieData = [
    { name: 'Receitas', value: totalReceitas },
    { name: 'Despesas', value: totalDespesas }
  ].filter(d => d.value > 0);
  
  const COLORS = ['#10b981', '#ef4444'];

  const receitasPorTipo = filteredCashFlow.filter(c => c.type === 'receita').reduce((acc, curr) => {
    const key = curr.specificType === 'mensalidade' ? 'Mensalidade' : curr.specificType === 'comissao' ? 'Comissão' : 'Outros';
    acc[key] = (acc[key] || 0) + curr.value;
    return acc;
  }, {});
  const pieReceitas = Object.keys(receitasPorTipo).map(key => ({ name: key, value: receitasPorTipo[key] }));

  const despesasPorTipo = filteredCashFlow.filter(c => c.type === 'despesa').reduce((acc, curr) => {
    const key = curr.specificType.charAt(0).toUpperCase() + curr.specificType.slice(1);
    acc[key] = (acc[key] || 0) + curr.value;
    return acc;
  }, {});
  const pieDespesas = Object.keys(despesasPorTipo).map(key => ({ name: key, value: despesasPorTipo[key] }));

  const monthlyBalanceData = useMemo(() => {
     const dataByMonth = {};
     filteredCashFlow.forEach(c => {
       const d = new Date(c.date);
       const key = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
       if (!dataByMonth[key]) dataByMonth[key] = { name: key, Receita: 0, Despesa: 0, sortKey: d.getFullYear()*100 + d.getMonth() };
       if (c.type === 'receita') dataByMonth[key].Receita += c.value;
       else dataByMonth[key].Despesa += c.value;
     });
     return Object.values(dataByMonth).sort((a,b) => a.sortKey - b.sortKey);
  }, [filteredCashFlow]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fluxo de Caixa</h1>
        {isFinance && (
          <button className="btn btn-primary" onClick={() => {
            setFormData({ name: '', date: new Date().toISOString(), value: 0, type: 'despesa', specificType: 'operacional', status: 'pago' });
            setShowModal(true);
          }}><Plus size={18}/> Novo Lançamento</button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Buscar por Empresa/Nome</label>
          <input type="text" placeholder="Ex: Mensalidade Verto..." value={filterQuery} onChange={e => setFilterQuery(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mês</label>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: '100%' }}>
            <option value="Todos">Todos os Meses</option>
            {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
              <option key={i+1} value={(i+1).toString()}>{m}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ano</label>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: '100%' }}>
            <option value="Todos">Todos os Anos</option>
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="cashflow-summary-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--success)', margin: 0 }}>
          <span className="title"><TrendingUp size={16} /> Total Receitas</span>
          <span className="value" style={{color: 'var(--success)'}}>R$ {totalReceitas.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--error)', margin: 0 }}>
          <span className="title"><TrendingDown size={16} /> Total Despesas</span>
          <span className="value" style={{color: 'var(--error)'}}>R$ {totalDespesas.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="stat-card glass-panel" style={{ borderLeft: balance >= 0 ? '4px solid var(--primary)' : '4px solid var(--warning)', margin: 0 }}>
          <span className="title">Saldo Líquido</span>
          <span className="value" style={{color: balance >= 0 ? 'var(--primary)' : 'var(--warning)'}}>R$ {balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      <div className="cashflow-charts-grid" style={{ marginBottom: '32px' }}>
        <div className="glass-panel" style={{padding: '20px', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '16px', fontSize: '1.1rem', textAlign: 'center'}}>Receita vs Despesa</h3>
          <div style={{flex: 1}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-panel" style={{padding: '20px', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '16px', fontSize: '1.1rem', textAlign: 'center'}}>Detalhamento de Receitas</h3>
          <div style={{flex: 1}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieReceitas} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieReceitas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{padding: '20px', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '16px', fontSize: '1.1rem', textAlign: 'center'}}>Despesas por Categoria</h3>
          <div style={{flex: 1}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieDespesas} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({name, percent}) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}>
                  {pieDespesas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#ef4444', '#f87171', '#fca5a5', '#fecaca'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits:2})}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{padding: '20px', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1', height: '350px'}}>
          <h3 style={{marginBottom: '16px', fontSize: '1.2rem', color: '#1e293b'}}>Comparativo Mensal (Entrada vs Saída)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBalanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3}/>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`} />
              <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits:2})}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        .cashflow-summary-grid, .cashflow-charts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .cashflow-charts-grid {
          height: 350px;
        }
        @media (max-width: 1024px) {
          .cashflow-summary-grid, .cashflow-charts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .cashflow-summary-grid, .cashflow-charts-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .cashflow-charts-grid {
             height: auto;
          }
          .cashflow-charts-grid > div {
            height: 300px;
          }
        }
      `}</style>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Status</th>
              {isFinance && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCashFlow.sort((a,b) => new Date(b.date) - new Date(a.date)).map(item => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{item.name}</td>
                <td>
                  <span className={`badge ${item.type === 'receita' ? 'badge-success' : 'badge-danger'}`}>
                    {item.type.toUpperCase()}
                  </span>
                </td>
                <td>{item.specificType}</td>
                <td style={{color: item.type === 'receita' ? 'var(--success)' : 'var(--error)', fontWeight: 500}}>
                  {item.type === 'receita' ? '+' : '-'} R$ {item.value.toLocaleString(undefined, {minimumFractionDigits:2})}
                </td>
                <td><span className="badge badge-info">{item.status.toUpperCase()}</span></td>
                {isFinance && (
                  <td>
                    <button className="btn btn-danger" style={{padding: '6px'}} onClick={() => deleteCashFlow(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>Novo Lançamento</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Descrição</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              
              <div className="form-group" style={{display: 'flex', gap: '16px'}}>
                <div style={{flex: 1}}>
                  <label>Valor (R$)</label>
                  <input type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} required />
                </div>
                <div style={{flex: 1}}>
                  <label>Data</label>
                  <input type="date" value={formData.date ? formData.date.split('T')[0] : ''} onChange={e => setFormData({...formData, date: new Date(e.target.value).toISOString()})} required />
                </div>
              </div>

              <div className="form-group" style={{display: 'flex', gap: '16px'}}>
                <div style={{flex: 1}}>
                  <label>Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div style={{flex: 1}}>
                  <label>Categoria</label>
                  <select value={formData.specificType} onChange={e => setFormData({...formData, specificType: e.target.value})}>
                    {formData.type === 'receita' ? (
                      <>
                        <option value="mensalidade">Mensalidade</option>
                        <option value="comissao">Comissão</option>
                        <option value="outros">Outros</option>
                      </>
                    ) : (
                      <>
                        <option value="operacional">Operacional</option>
                        <option value="impostos">Impostos</option>
                        <option value="pessoal">Pessoal</option>
                        <option value="outros">Outros</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="pago">Pago / Recebido</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px'}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Lançar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
