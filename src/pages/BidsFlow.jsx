import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, ChevronLeft, Calendar, FileText, Building2, GripVertical } from 'lucide-react';

const COLUMNS = [
  'Em análise',
  'Proposta inicial cadastrada',
  'Em disputa',
  'Seleção de Fornecedores',
  'Homologado',
  'Vitória',
  'Desclassificado'
];

export const BidsFlow = () => {
  const { bids, updateBid } = useData();
  const { users } = useAuth();
  const [draggedBidId, setDraggedBidId] = useState(null);

  // Agrupa os editais por status
  const groupedBids = COLUMNS.reduce((acc, col) => {
    acc[col] = bids.filter(b => b.status === col);
    return acc;
  }, {});

  // Função para mover bid (usada pelos botões)
  const moveBid = (bidId, currentStatus, direction) => {
    const currentIndex = COLUMNS.indexOf(currentStatus);
    const nextIndex = currentIndex + direction;
    
    if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
      updateBid(bidId, { status: COLUMNS[nextIndex] });
    }
  };

  // Funções de Drag and Drop
  const handleDragStart = (e, bidId) => {
    setDraggedBidId(bidId);
    e.dataTransfer.effectAllowed = "move";
    // Torna o card um pouco transparente ao arrastar
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    setDraggedBidId(null);
    if (e.target) e.target.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedBidId) {
      const bid = bids.find(b => b.id === draggedBidId);
      if (bid && bid.status !== newStatus) {
        updateBid(draggedBidId, { status: newStatus });
      }
    }
  };

  const getResponsibleName = (ids) => {
    if (!ids || ids.length === 0) return 'Não atribuído';
    // Pegar o primeiro para não poluir muito o card pequeno
    const u = users.find(usr => usr.id === ids[0]);
    return u ? u.name.split(' ')[0] : 'Desconhecido';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--/--/----';
    return dateStr.split('T')[0].split('-').reverse().join('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', width: '100%', overflow: 'hidden' }}>
      <div className="page-header" style={{ marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', color: '#0f172a' }}>Fluxo Editais</h1>
          <p style={{ color: 'var(--text-muted)' }}>Acompanhamento em formato Kanban</p>
        </div>
      </div>

      {/* Kanban Container com Scroll Horizontal */}
      <div style={{ 
        flex: 1, 
        overflowX: 'auto', 
        overflowY: 'hidden', 
        display: 'flex', 
        gap: '24px', 
        paddingBottom: '16px',
        scrollBehavior: 'smooth'
      }}>
        {COLUMNS.map((column, colIndex) => (
          <div 
            key={column} 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
            style={{ 
              minWidth: '320px', 
              width: '320px', 
              background: '#f8fafc', 
              borderRadius: '12px', 
              display: 'flex', 
              flexDirection: 'column',
              maxHeight: '100%',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Header da Coluna */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: '#fff',
              borderRadius: '12px 12px 0 0',
              position: 'sticky',
              top: 0
            }}>
              <h3 style={{ fontSize: '1rem', color: '#1e293b', margin: 0, fontWeight: 600 }}>{column}</h3>
              <span style={{ 
                background: '#e2e8f0', 
                color: '#475569', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                {groupedBids[column]?.length || 0}
              </span>
            </div>

            {/* Corpo da Coluna (Lista de Cartões) */}
            <div style={{ 
              padding: '16px', 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              {groupedBids[column]?.map((bid) => (
                <div 
                  key={bid.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, bid.id)}
                  onDragEnd={handleDragEnd}
                  style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'grab',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                  onDragOver={(e) => e.preventDefault()} // Impede o cursor de "não permitido"
                >
                  {/* Grip Ícone */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#cbd5e1' }}>
                    <GripVertical size={16} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingRight: '20px' }}>
                    <Building2 size={16} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                      {bid.organ || 'Sem Órgão'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                    <FileText size={14} />
                    <span>Pregão: {bid.number || '-'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                    <Calendar size={14} />
                    <span>{formatDate(bid.disputeDate)} {bid.disputeStartTime && `às ${bid.disputeStartTime}`}</span>
                  </div>
                  
                  {/* Footer do Card com Avatar e Botões */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ 
                        width: '24px', height: '24px', borderRadius: '50%', background: '#1d3e83', color: '#fff', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600 
                      }}>
                        {getResponsibleName(bid.responsibleIds).charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getResponsibleName(bid.responsibleIds)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        disabled={colIndex === 0}
                        onClick={() => moveBid(bid.id, column, -1)}
                        style={{ 
                          background: 'none', border: 'none', cursor: colIndex === 0 ? 'not-allowed' : 'pointer', 
                          color: colIndex === 0 ? '#cbd5e1' : '#64748b', padding: '4px' 
                        }}
                        title="Voltar"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        disabled={colIndex === COLUMNS.length - 1}
                        onClick={() => moveBid(bid.id, column, 1)}
                        style={{ 
                          background: 'none', border: 'none', cursor: colIndex === COLUMNS.length - 1 ? 'not-allowed' : 'pointer', 
                          color: colIndex === COLUMNS.length - 1 ? '#cbd5e1' : '#64748b', padding: '4px' 
                        }}
                        title="Avançar"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Espaço extra para drop (área vazia) */}
              <div style={{ flex: 1, minHeight: '40px' }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        /* Personalização do Scrollbar para Kanban */
        .kanban-column::-webkit-scrollbar {
          width: 6px;
        }
        .kanban-column::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-column::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
