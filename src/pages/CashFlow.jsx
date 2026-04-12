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

  const isFinance = user.role === 'finance' || user.role === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    addCashFlow(formData);
    setShowModal(false);
  };

  const balance = cashFlow.reduce((acc, curr) => curr.type === 'receita' ? acc + curr.value : acc - curr.value, 0);
  const totalReceitas = cashFlow.filter(c => c.type === 'receita').reduce((a, b) => a + b.value, 0);
  const totalDespesas = cashFlow.filter(c => c.type === 'despesa').reduce((a, b) => a + b.value, 0);

  const pieData = [
    { name: 'Receitas', value: totalReceitas },
    { name: 'Despesas', value: totalDespesas }
  ];
  const COLORS = ['#2ed573', '#ff4757'];

  const receitasPorTipo = cashFlow.filter(c => c.type === 'receita').reduce((acc, curr) => {
    acc[curr.specificType] = (acc[curr.specificType] || 0) + curr.value;
    return acc;
  }, {});
  const pieReceitas = Object.keys(receitasPorTipo).map(key => ({ name: key, value: receitasPorTipo[key] }));

  const despesasPorTipo = cashFlow.filter(c => c.type === 'despesa').reduce((acc, curr) => {
    acc[curr.specificType] = (acc[curr.specificType] || 0) + curr.value;
    return acc;
  }, {});
  const pieDespesas = Object.keys(despesasPorTipo).map(key => ({ name: key, value: despesasPorTipo[key] }));

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

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--success)'}}>
          <span className="title"><TrendingUp size={16} /> Total Receitas</span>
          <span className="value" style={{color: 'var(--success)'}}>R$ {totalReceitas.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--error)'}}>
          <span className="title"><TrendingDown size={16} /> Total Despesas</span>
          <span className="value" style={{color: 'var(--error)'}}>R$ {totalDespesas.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="stat-card glass-panel" style={{ borderLeft: balance >= 0 ? '4px solid var(--primary)' : '4px solid var(--warning)'}}>
          <span className="title">Saldo Líquido</span>
          <span className="value" style={{color: balance >= 0 ? 'var(--primary)' : 'var(--warning)'}}>R$ {balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px', height: '350px'}}>
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
          <h3 style={{marginBottom: '16px', fontSize: '1.1rem', textAlign: 'center'}}>Detalhamento de Despesas</h3>
          <div style={{flex: 1}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieDespesas} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieDespesas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#ef4444', '#f87171', '#fca5a5', '#fecaca'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
            {cashFlow.sort((a,b) => new Date(b.date) - new Date(a.date)).map(item => (
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
