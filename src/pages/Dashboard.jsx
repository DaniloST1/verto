import React from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';

export const Dashboard = () => {
  const { clients, bids, disputes, contracts, cashFlow } = useData();

  const balance = cashFlow.reduce((acc, curr) => {
    return curr.type === 'receita' ? acc + curr.value : acc - curr.value;
  }, 0);

  const cashFlowByMonth = cashFlow.reduce((acc, curr) => {
    const month = new Date(curr.date).toLocaleString('pt-BR', { month: 'short' });
    if (!acc[month]) acc[month] = { name: month, Receitas: 0, Despesas: 0 };
    if (curr.type === 'receita') acc[month].Receitas += curr.value;
    else acc[month].Despesas += curr.value;
    return acc;
  }, {});

  const barData = Object.values(cashFlowByMonth);

  const bidsByStatus = bids.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(bidsByStatus).map(key => ({
    name: key, value: bidsByStatus[key]
  }));

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Visão geral do sistema</p>
        </div>
      </div>

      <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="stat-card glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
          <span className="title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total de Clientes</span>
          <span className="value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{clients.length}</span>
        </div>
        <div className="stat-card glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
          <span className="title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Editais Abertos</span>
          <span className="value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{bids.filter(b => b.status === 'aberto').length}</span>
        </div>
        <div className="stat-card glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
          <span className="title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Disputas Agendadas</span>
          <span className="value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{disputes.filter(d => d.status === 'agendada').length}</span>
        </div>
        <div className="stat-card glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
          <span className="title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contratos Ativos</span>
          <span className="value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{contracts.filter(c => c.status === 'ativo').length}</span>
        </div>
        <div className="stat-card glass-panel" style={{ padding: '24px', borderRadius: '12px', borderLeft: balance >= 0 ? '4px solid var(--success)' : '4px solid var(--error)' }}>
          <span className="title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Caixa Geral</span>
          <span className="value" style={{ fontSize: '2rem', fontWeight: 700, color: balance >= 0 ? 'var(--success)' : 'var(--error)' }}>
            R$ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="chart-grid">
        <div className="glass-panel chart-panel" style={{ borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Fluxo de Caixa por Mês</h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel chart-panel" style={{ borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b', textAlign: 'center' }}>Distribuição de Editais</h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius="30%" outerRadius="55%" paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 20px;
        }
        .chart-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .chart-grid {
            grid-template-columns: 1fr !important;
          }
          .chart-panel {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};
