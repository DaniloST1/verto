import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [bids, setBids] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const fetchTable = async (table, setter) => {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) setter(data);
        else if (error) console.error(`Error fetching ${table}:`, error);
      };

      await Promise.all([
        fetchTable('clients', setClients),
        fetchTable('bids', setBids),
        fetchTable('disputes', setDisputes),
        fetchTable('contracts', setContracts),
        fetchTable('cash_flow', setCashFlow),
        fetchTable('client_payments', setClientPayments)
      ]);
    } catch (err) {
      console.error('Fetch data error:', err);
    }
  };

  const checkPermission = (allowedRoles, actionName) => {
    if (!allowedRoles.includes(user?.role) && user?.role !== 'admin') {
      addToast(`Sem permissão para ${actionName}.`, 'error');
      return false;
    }
    return true;
  };

  const camelToSnake = (obj) => {
    if (Array.isArray(obj)) return obj;
    const newObj = {};
    for (const key in obj) {
      if (key === 'cashValue') newObj.cash_value = obj[key];
      else if (key === 'responsible') newObj.responsible_id = obj[key];
      else if (key === 'contractStart') newObj.contract_start = obj[key];
      else if (key === 'contractEnd') newObj.contract_end = obj[key];
      else if (key === 'estimatedValue') newObj.estimated_value = obj[key];
      else if (key === 'clientsLinked') newObj.clients_linked = obj[key];
      else if (key === 'originPortal') newObj.origin_portal = obj[key];
      else if (key === 'clientId') newObj.client_id = obj[key];
      else if (key === 'bidId') newObj.bid_id = obj[key];
      else if (key === 'startDate') newObj.start_date = obj[key];
      else if (key === 'endDate') newObj.end_date = obj[key];
      else if (key === 'specificType') newObj.specific_type = obj[key];
      else if (key === 'referenceMonth') newObj.reference_month = obj[key];
      else if (key === 'referenceYear') newObj.reference_year = obj[key];
      else if (key === 'paymentMethod') newObj.payment_method = obj[key];
      else if (key === 'disputeDate') newObj.dispute_date = obj[key];
      else if (key === 'disputeStartTime') newObj.dispute_start_time = obj[key];
      else if (key === 'disputeEndTime') newObj.dispute_end_time = obj[key];
      else if (key === 'attachmentUrl') newObj.attachment_url = obj[key];
      else newObj[key] = obj[key];
    }
    return newObj;
  };

  const snakeToCamel = (obj) => {
    if (!obj) return null;
    const newObj = {};
    for (const key in obj) {
      if (key === 'cash_value') newObj.cashValue = obj[key];
      else if (key === 'responsible_id') newObj.responsible = obj[key];
      else if (key === 'contract_start') newObj.contractStart = obj[key];
      else if (key === 'contract_end') newObj.contractEnd = obj[key];
      else if (key === 'estimated_value') newObj.estimatedValue = obj[key];
      else if (key === 'clients_linked') newObj.clientsLinked = obj[key];
      else if (key === 'origin_portal') newObj.originPortal = obj[key];
      else if (key === 'client_id') newObj.clientId = obj[key];
      else if (key === 'bid_id') newObj.bidId = obj[key];
      else if (key === 'start_date') newObj.startDate = obj[key];
      else if (key === 'end_date') newObj.endDate = obj[key];
      else if (key === 'specific_type') newObj.specificType = obj[key];
      else if (key === 'reference_month') newObj.referenceMonth = obj[key];
      else if (key === 'reference_year') newObj.referenceYear = obj[key];
      else if (key === 'payment_method') newObj.paymentMethod = obj[key];
      else if (key === 'dispute_date') newObj.disputeDate = obj[key];
      else if (key === 'dispute_start_time') newObj.disputeStartTime = obj[key];
      else if (key === 'dispute_end_time') newObj.disputeEndTime = obj[key];
      else if (key === 'attachment_url') newObj.attachmentUrl = obj[key];
      else newObj[key] = obj[key];
    }
    return newObj;
  };

  const convertArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(snakeToCamel);
  };

  const addItem = async (table, setter, item, listName, allowedRoles) => {
    if (!checkPermission(allowedRoles, listName)) return;
    const { id, lastUpdate, ...insertData } = item; 
    const snakeData = camelToSnake(insertData);
    const { data, error } = await supabase.from(table).insert([snakeData]).select().single();
    if (error) {
      addToast(`Erro ao salvar ${listName}: ${error.message}`, 'error');
    } else if (data) {
      setter(prev => [...prev, data]);
      addToast(`${listName} salvo com sucesso!`, 'success');
    }
  };

  const updateItem = async (table, setter, id, updates, listName, allowedRoles) => {
    if (!checkPermission(allowedRoles, listName)) return;
    const snakeUpdates = camelToSnake(updates);
    const { data, error } = await supabase.from(table).update(snakeUpdates).eq('id', id).select().single();
    if (error) {
      addToast(`Erro ao atualizar ${listName}: ${error.message}`, 'error');
    } else if (data) {
      setter(prev => prev.map(item => item.id === id ? data : item));
      addToast(`${listName} atualizado com sucesso!`, 'success');
    }
  };

  const deleteItem = async (table, setter, id, listName, allowedRoles) => {
    if (!checkPermission(allowedRoles, listName)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      addToast(`Erro ao excluir ${listName}: ${error.message}`, 'error');
    } else {
      setter(prev => prev.filter(item => item.id !== id));
      addToast(`${listName} excluído.`, 'info');
    }
  };

  const addClient = (data) => addItem('clients', setClients, data, 'Cliente', ['employee', 'supervisor', 'admin']);
  const updateClient = (id, data) => updateItem('clients', setClients, id, data, 'Cliente', ['employee', 'supervisor', 'admin']);
  const deleteClient = (id) => deleteItem('clients', setClients, id, 'Cliente', ['admin', 'supervisor']);

  const addBid = async (item) => {
    if (!checkPermission(['supervisor', 'employee', 'admin'], 'Edital')) return;
    const { id, lastUpdate, ...insertData } = item; 
    const snakeData = camelToSnake(insertData);
    const { data: newBid, error } = await supabase.from('bids').insert([snakeData]).select().single();
    
    if (error) {
      addToast(`Erro ao salvar Edital: ${error.message}`, 'error');
    } else if (newBid) {
      setBids(prev => [...prev, newBid]);
      addToast(`Edital salvo com sucesso!`, 'success');
      
      // Auto-create Dispute
      const disputeData = {
        name: newBid.organ || 'Edital sem nome',
        bid_id: newBid.id,
        date: newBid.dispute_date,
        start_time: newBid.dispute_start_time,
        end_time: newBid.dispute_end_time,
        status: 'agendada',
        result: 'pendente',
        responsible_id: newBid.responsible_id
      };
      
      const { error: dispErr } = await supabase.from('disputes').insert([disputeData]);
      if (dispErr) {
        console.error("ERRO CRITICO NA DISPUTA:", dispErr);
        // Usando alert para garantir que o usuário veja a mensagem do banco
        window.alert(`ATENÇÃO: Edital salvo, mas a DISPUTA falhou.\nErro do Banco: ${dispErr.message}`);
      } else {
        addToast(`Disputa vinculada com sucesso!`, 'info');
        await fetchData(); 
      }
    }
  };

  const updateBid = async (id, updates) => {
    if (!checkPermission(['supervisor', 'employee', 'admin'], 'Edital')) return;
    const snakeUpdates = camelToSnake(updates);
    const { data: updatedBid, error } = await supabase.from('bids').update(snakeUpdates).eq('id', id).select().single();
    
    if (error) {
      addToast(`Erro ao atualizar Edital: ${error.message}`, 'error');
    } else if (updatedBid) {
      setBids(prev => prev.map(item => item.id === id ? updatedBid : item));
      addToast(`Edital atualizado com sucesso!`, 'success');

      // Sync Disputes
      const basicDispUpdate = {
        name: updatedBid.organ,
        date: updatedBid.dispute_date,
        start_time: updatedBid.dispute_start_time,
        end_time: updatedBid.dispute_end_time,
        responsible_id: updatedBid.responsible_id
      };
      
      await supabase.from('disputes').update(basicDispUpdate).eq('bid_id', id);

      const linked = updatedBid.clients_linked || [];
      if (linked.length > 0) {
        for (const clientId of linked) {
          const { data: existing } = await supabase.from('disputes').select('*').eq('bid_id', id).eq('client_id', clientId).maybeSingle();
          if (!existing) {
            await supabase.from('disputes').insert([{
              ...basicDispUpdate,
              bid_id: id,
              client_id: clientId,
              status: 'agendada',
              result: 'pendente'
            }]);
          }
        }
        await supabase.from('disputes').delete().eq('bid_id', id).is('client_id', null);
      }
      fetchData();
    }
  };
  const deleteBid = (id) => deleteItem('bids', setBids, id, 'Edital', ['admin', 'supervisor']);

  const addDispute = (data) => addItem('disputes', setDisputes, data, 'Disputa', ['supervisor', 'admin']);
  const updateDispute = (id, data) => updateItem('disputes', setDisputes, id, data, 'Disputa', ['supervisor', 'employee', 'admin']);
  const deleteDispute = (id) => deleteItem('disputes', setDisputes, id, 'Disputa', ['admin', 'supervisor']);

  const addContract = (data) => addItem('contracts', setContracts, data, 'Contrato', ['supervisor', 'admin']);
  const updateContract = (id, data) => updateItem('contracts', setContracts, id, data, 'Contrato', ['supervisor', 'employee', 'admin']);
  const deleteContract = (id) => deleteItem('contracts', setContracts, id, 'Contrato', ['admin', 'supervisor']);

  const addCashFlow = (data) => addItem('cash_flow', setCashFlow, data, 'Fluxo de Caixa', ['finance', 'admin']);
  const updateCashFlow = (id, data) => updateItem('cash_flow', setCashFlow, id, data, 'Fluxo de Caixa', ['finance', 'admin']);
  const deleteCashFlow = (id) => deleteItem('cash_flow', setCashFlow, id, 'Fluxo de Caixa', ['finance', 'admin']);

  const updatePaymentStatus = async (clientId, year, monthIndex, data) => {
    if (!checkPermission(['finance', 'admin'], 'Atualizar Pagamento')) return;
    let currentRecord = clientPayments.find(c => String(c.client_id) === String(clientId) && Number(c.year) === Number(year));
    let newMonths = currentRecord ? { ...currentRecord.months, [monthIndex]: { ...(currentRecord.months[monthIndex] || {}), ...data } } : { [monthIndex]: data };
    if (currentRecord) {
      const { data: updatedObj, error } = await supabase.from('client_payments').update({ months: newMonths }).eq('id', currentRecord.id).select().single();
      if (!error && updatedObj) setClientPayments(prev => prev.map(c => c.id === currentRecord.id ? updatedObj : c));
    } else {
      const { data: newRecord, error } = await supabase.from('client_payments').insert([{ client_id: clientId, year, months: newMonths }]).select().single();
      if (!error && newRecord) setClientPayments(prev => [...prev, newRecord]);
    }
  };

  return (
    <DataContext.Provider value={{
      clients: convertArray(clients), addClient, updateClient, deleteClient,
      bids: convertArray(bids), addBid, updateBid, deleteBid,
      disputes: convertArray(disputes), addDispute, updateDispute, deleteDispute,
      contracts: convertArray(contracts), addContract, updateContract, deleteContract,
      cashFlow: convertArray(cashFlow), addCashFlow, updateCashFlow, deleteCashFlow,
      clientPayments: convertArray(clientPayments), updatePaymentStatus
    }}>
      {children}
    </DataContext.Provider>
  );
};
