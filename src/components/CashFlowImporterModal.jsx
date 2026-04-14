import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Trash2, ArrowRight, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { Modal } from './Modal';

const parseOFX = (content) => {
  const transactions = [];
  const stmts = content.split('<STMTTRN>');
  stmts.shift(); // remove header
  stmts.forEach(stmt => {
    const type = (stmt.match(/<TRNTYPE>([^<]+)/)?.[1] || '').trim();
    const dtposted = (stmt.match(/<DTPOSTED>([^<]+)/)?.[1] || '').trim();
    const trnamt = parseFloat((stmt.match(/<TRNAMT>([^<]+)/)?.[1] || '0').replace(',', '.'));
    const memo = (stmt.match(/<MEMO>([^<]+)/)?.[1] || '').trim();
    const name = (stmt.match(/<NAME>([^<]+)/)?.[1] || '').trim();
    
    const fullDesc = (name + ' ' + memo).trim();
    let date = new Date().toISOString();
    
    if (dtposted.length >= 8) {
       const y = dtposted.substring(0,4);
       const m = dtposted.substring(4,6);
       const d = dtposted.substring(6,8);
       date = new Date(`${y}-${m}-${d}T12:00:00Z`).toISOString();
    }
    transactions.push({
      id: Math.random().toString(36).substr(2, 9),
      name: fullDesc || 'Transação OFX',
      date,
      value: Math.abs(trnamt),
      type: trnamt >= 0 ? 'receita' : 'despesa',
      specificType: trnamt >= 0 ? 'assessoria recorrente' : 'operacional', // default category
      clientId: null,
      status: 'pago',
      paymentMethod: 'Transferência'
    });
  });
  return transactions;
};

const guessDate = (raw) => {
  if (!raw) return new Date().toISOString();
  // Try DD/MM/YYYY
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).toISOString();
      }
    }
  }
  // Try ISO
  if (raw.includes('-')) {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toISOString();
  }
  return new Date().toISOString();
};

export const CashFlowImporterModal = ({ isOpen, onClose, clients, cashFlow, onSave }) => {
  const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'resolveConflicts'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]); // Array of { newTx, existingTx }
  const [resolutionQueue, setResolutionQueue] = useState([]); // Array of { action: 'keep_new' | 'keep_existing' | 'keep_both', newTx, existingTx }
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const applyIntelligence = (txs) => {
    return txs.map(tx => {
      let guessClient = null;
      let guessCategory = tx.specificType;
      
      const desc = (tx.name || '').toLowerCase();
      
      for (const c of clients) {
         if (c.name && desc.includes(c.name.toLowerCase())) {
            guessClient = c.id;
            break;
         }
         if (c.cnpj && desc.includes(c.cnpj.replace(/\D/g, ''))) {
            guessClient = c.id;
            break;
         }
      }
      
      if (desc.includes('tarifa') || desc.includes('taxa') || desc.includes('imposto')) guessCategory = 'impostos';
      else if (desc.includes('pagamento') || desc.includes('salário') || desc.includes('folha')) guessCategory = 'equipe';
      else if (desc.includes('luz') || desc.includes('energia') || desc.includes('agua') || desc.includes('internet')) guessCategory = 'operacional';
      else if (desc.includes('pro labore') || desc.includes('pró-labore')) guessCategory = 'pró-labore';
      
      // If we found a client and it's a receipt, ensure it's recurring by default to link to client
      if (guessClient && tx.type === 'receita') {
        guessCategory = 'assessoria recorrente';
        tx.name = `Mensalidade: ${clients.find(c => c.id === guessClient)?.name}`;
      }

      return { ...tx, clientId: guessClient, specificType: guessCategory };
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    if (file.name.toLowerCase().endsWith('.ofx')) {
      reader.onload = (evt) => {
        const content = evt.target.result;
        const parsed = parseOFX(content);
        setTransactions(applyIntelligence(parsed));
        setStep('review');
        setLoading(false);
      };
      reader.readAsText(file);
    } 
    else if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data.map(row => {
            const rawDate = row['Data'] || row['Date'] || row['Data Lançamento'] || Object.values(row)[0];
            const rawDesc = row['Descrição'] || row['Description'] || row['Histórico'] || Object.values(row)[1];
            const rawAmt = row['Valor'] || row['Amount'] || row['Valor (R$)'] || Object.values(row)[2];
            
            let val = 0;
            if (rawAmt) {
               // handle Brazilian currency format (1.234,56) vs US format (1234.56)
               let strVal = rawAmt.toString().trim();
               if (strVal.includes(',') && strVal.includes('.')) {
                  // likely BR format if comma is after dot
                  if (strVal.lastIndexOf(',') > strVal.lastIndexOf('.')) {
                     strVal = strVal.replace(/\./g, '').replace(',', '.');
                  } else {
                     strVal = strVal.replace(/,/g, '');
                  }
               } else if (strVal.includes(',')) {
                  strVal = strVal.replace(',', '.');
               }
               val = parseFloat(strVal) || 0;
            }
            
            return {
               id: Math.random().toString(36).substr(2, 9),
               name: rawDesc || 'Transação CSV',
               date: guessDate(rawDate),
               value: Math.abs(val),
               type: val >= 0 ? 'receita' : 'despesa',
               specificType: val >= 0 ? 'assessoria recorrente' : 'operacional',
               clientId: null,
               status: 'pago',
               paymentMethod: 'Transferência'
            };
          });
          setTransactions(applyIntelligence(parsed));
          setStep('review');
          setLoading(false);
        }
      });
    } else {
      alert('Formato não suportado nativamente ainda. Por favor, grave em CSV ou OFX.');
      setLoading(false);
    }
    // reset input
    e.target.value = '';
  };

  const handleUpdateTransaction = (id, field, value) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleConfirm = () => {
    if (transactions.length === 0) {
      alert('Nenhuma transação para importar.');
      return;
    }

    // Identify duplicates
    const foundConflicts = [];
    transactions.forEach(newTx => {
      const nDate = new Date(newTx.date);
      const nDay = nDate.getUTCDate();
      const nMonth = nDate.getUTCMonth();
      const nYear = nDate.getUTCFullYear();
      const nValue = Math.round(Math.abs(newTx.value) * 100) / 100;

      const match = cashFlow.find(oldTx => {
        const oDate = new Date(oldTx.date);
        // We use UTC methods because we force Z or T12:00:00Z in our parsing
        const oDay = oDate.getUTCDate();
        const oMonth = oDate.getUTCMonth();
        const oYear = oDate.getUTCFullYear();
        const oValue = Math.round(Math.abs(oldTx.value) * 100) / 100;

        return oDay === nDay && oMonth === nMonth && oYear === nYear && 
               oValue === nValue && oldTx.type === newTx.type;
      });
      
      if (match) {
        foundConflicts.push({ newTx, existingTx: match });
      }
    });

    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setResolutionQueue([]);
      setStep('resolveConflicts');
    } else {
      onSave(transactions);
      onClose();
    }
  };

  const handleResolve = (conflictIndex, decision) => {
    const conflict = conflicts[conflictIndex];
    const newResolution = { action: decision, ...conflict };
    const updatedQueue = [...resolutionQueue, newResolution];
    setResolutionQueue(updatedQueue);

    if (updatedQueue.length === conflicts.length) {
      // All resolved, finish import
      const txsToSave = [];
      const idsToDelete = [];

      // Add non-conflicted transactions
      transactions.forEach(tx => {
        if (!conflicts.find(c => c.newTx.id === tx.id)) {
          txsToSave.push(tx);
        }
      });

      // Add resolved transactions
      updatedQueue.forEach(res => {
        if (res.action === 'keep_new') {
          txsToSave.push(res.newTx);
          idsToDelete.push(res.existingTx.id);
        } else if (res.action === 'keep_both') {
          txsToSave.push(res.newTx);
        }
        // 'keep_existing' means we do nothing (don't add new, don't delete old)
      });

      onSave(txsToSave, idsToDelete);
      onClose();
    }
  };

  const currentConflictIndex = resolutionQueue.length;
  const currentConflict = conflicts[currentConflictIndex];

  return (
    <Modal 
      title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UploadCloud size={20} className="text-primary" /> Importação Inteligente de Extratos</span>} 
      maxWidth={step === 'resolveConflicts' ? '800px' : (step === 'review' ? '1200px' : '600px')} 
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1 }}>
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '40px 20px' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>Envie seu extrato bancário</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Formatos suportados: CSV e OFX</p>
              </div>
              
              <div 
                style={{ 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '12px', 
                  padding: '40px', 
                  width: '100%', 
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = '#f1f5f9'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.background = '#f8fafc'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = '#f8fafc';
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                     // Pass the file manually to our handler by mocking the event
                     handleFileUpload({ target: { files: [e.dataTransfer.files[0]] } });
                  }
                }}
              >
                <FileText size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
                <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Clique ou arraste o arquivo aqui</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>O sistema irá classificar os lançamentos via inteligência de padrões.</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".csv,.ofx" 
                  onChange={handleFileUpload} 
                />
              </div>

              {loading && <div style={{ color: '#3b82f6', fontWeight: 600 }}>Processando arquivo, aguarde...</div>}
            </div>
          )}

          {step === 'review' && (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>Revisão de Lançamentos</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Verifique se as classificações automáticas estão corretas antes de importar.</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: '#64748b' }}>
                  <span><strong style={{ color: '#10b981' }}>Receitas:</strong> {transactions.filter(t => t.type === 'receita').length}</span>
                  <span><strong style={{ color: '#ef4444' }}>Despesas:</strong> {transactions.filter(t => t.type === 'despesa').length}</span>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr>
                      <th style={{ width: '120px' }}>Data</th>
                      <th>Descrição Original</th>
                      <th style={{ width: '150px' }}>Valor</th>
                      <th style={{ width: '160px' }}>Tipo</th>
                      <th style={{ width: '200px' }}>Categoria</th>
                      <th style={{ width: '250px' }}>Vínculo de Cliente</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td>
                          <input 
                            type="date" 
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} 
                            value={tx.date.split('T')[0]} 
                            onChange={(e) => handleUpdateTransaction(tx.id, 'date', new Date(e.target.value + 'T12:00:00Z').toISOString())} 
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} 
                            value={tx.name} 
                            onChange={(e) => handleUpdateTransaction(tx.id, 'name', e.target.value)} 
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            step="0.01" 
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', color: tx.type === 'receita' ? '#10b981' : '#ef4444' }} 
                            value={tx.value} 
                            onChange={(e) => handleUpdateTransaction(tx.id, 'value', parseFloat(e.target.value))} 
                          />
                        </td>
                        <td>
                          <select 
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', color: tx.type === 'receita' ? '#10b981' : '#ef4444', fontWeight: 600 }}
                            value={tx.type}
                            onChange={(e) => handleUpdateTransaction(tx.id, 'type', e.target.value)}
                          >
                            <option value="receita">Entrada (Receita)</option>
                            <option value="despesa">Saída (Despesa)</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: '#f8fafc' }}
                            value={tx.specificType}
                            onChange={(e) => handleUpdateTransaction(tx.id, 'specificType', e.target.value)}
                          >
                            {tx.type === 'receita' ? (
                              <>
                                <option value="assessoria recorrente">A. Recorrente</option>
                                <option value="implementacao">Implementação</option>
                                <option value="percentual de contrato">% de Contrato</option>
                              </>
                            ) : (
                              <>
                                <option value="equipe">Equipe</option>
                                <option value="operacional">Operacional</option>
                                <option value="impostos">Impostos</option>
                                <option value="pró-labore">Pró-labore</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td>
                          {tx.type === 'receita' ? (
                            <select 
                              style={{ width: '100%', padding: '4px 8px', border: tx.clientId ? '1px solid #3b82f6' : '1px dashed #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: tx.clientId ? '#eff6ff' : '#fff' }}
                              value={tx.clientId || ''}
                              onChange={(e) => handleUpdateTransaction(tx.id, 'clientId', e.target.value)}
                            >
                              <option value="">Não vinculado</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>N/A para despesas</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} onClick={() => handleDeleteTransaction(tx.id)} title="Remover este lançamento">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Todos os lançamentos foram removidos. <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setStep('upload')}>Importar outro arquivo</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'resolveConflicts' && currentConflict && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', background: '#fff9eb', padding: '16px', borderRadius: '12px', border: '1px solid #feebc8' }}>
                <h3 style={{ color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                  <AlertCircle size={24} /> Conflito Detectado ({currentConflictIndex + 1}/{conflicts.length})
                </h3>
                <p style={{ margin: 0, color: '#92400e', fontSize: '0.95rem' }}>Já existe um lançamento idêntico no seu sistema. O que deseja fazer?</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                {/* Existing Card */}
                <div style={{ padding: '20px', border: '2px solid #e2e8f0', borderRadius: '16px', textAlign: 'left', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opção A: No Sistema</span>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{currentConflict.existingTx.name}</div>
                    <div style={{ color: '#64748b', marginTop: '4px' }}>{new Date(currentConflict.existingTx.date).toLocaleDateString('pt-BR')}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: currentConflict.existingTx.type === 'receita' ? '#10b981' : '#ef4444', marginTop: '12px' }}>
                      R$ {currentConflict.existingTx.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* New Card */}
                <div style={{ padding: '20px', border: '2px solid #3b82f6', borderRadius: '16px', textAlign: 'left', background: '#eff6ff' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opção B: Do Extrato</span>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{currentConflict.newTx.name}</div>
                    <div style={{ color: '#64748b', marginTop: '4px' }}>{new Date(currentConflict.newTx.date).toLocaleDateString('pt-BR')}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: currentConflict.newTx.type === 'receita' ? '#10b981' : '#ef4444', marginTop: '12px' }}>
                      R$ {currentConflict.newTx.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn" onClick={() => handleResolve(currentConflictIndex, 'keep_existing')} style={{ width: '100%', padding: '14px', background: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 600 }}>
                  Manter apenas o que já está no Sistema (Ignorar novo)
                </button>
                <button className="btn" onClick={() => handleResolve(currentConflictIndex, 'keep_new')} style={{ width: '100%', padding: '14px', background: '#1d3e83', color: '#fff', fontWeight: 600 }}>
                  Substituir pelo novo do Extrato (Excluir antigo)
                </button>
                <button className="btn" onClick={() => handleResolve(currentConflictIndex, 'keep_both')} style={{ width: '100%', padding: '14px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b' }}>
                  Os dois estão corretos (Lançar ambos)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ background: '#fff', border: '1px solid #cbd5e1' }}>Cancelar</button>
          
          {step === 'review' && transactions.length > 0 && (
            <button className="btn btn-primary" onClick={handleConfirm} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> Confirmar Importação ({transactions.length})
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
