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
      else if (key === 'clientId' && obj[key]) newObj.client_id = obj[key];
      else if (key === 'bidId' && obj[key]) newObj.bid_id = obj[key];
      else if (key === 'startDate' && obj[key]) newObj.start_date = obj[key];
      else if (key === 'endDate' && obj[key]) newObj.end_date = obj[key];
      else if (key === 'specificType' && obj[key]) newObj.specific_type = obj[key];
      else if (key === 'referenceMonth' && obj[key] !== undefined) newObj.reference_month = obj[key];
      else if (key === 'referenceYear' && obj[key] !== undefined) newObj.reference_year = obj[key];
      else if (key === 'paymentMethod' && obj[key]) newObj.payment_method = obj[key];
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
      else newObj[key] = obj[key];
    }
    return newObj;
  };

  const convertArray = (arr) => arr.map(snakeToCamel);

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

  // Specific Actions
  const addClient = (data) => addItem('clients', setClients, data, 'Cliente', ['employee', 'supervisor', 'admin']);
  const updateClient = (id, data) => updateItem('clients', setClients, id, data, 'Cliente', ['employee', 'supervisor', 'admin']);

  const addBid = (data) => addItem('bids', setBids, data, 'Edital', ['supervisor', 'employee', 'admin']);
  const updateBid = (id, data) => updateItem('bids', setBids, id, data, 'Edital', ['supervisor', 'employee', 'admin']);

  const addDispute = (data) => addItem('disputes', setDisputes, data, 'Disputa', ['supervisor', 'admin']);
  const updateDispute = (id, data) => updateItem('disputes', setDisputes, id, data, 'Disputa', ['supervisor', 'employee', 'admin']);

  const addContract = (data) => addItem('contracts', setContracts, data, 'Contrato', ['supervisor', 'admin']);
  const updateContract = (id, data) => updateItem('contracts', setContracts, id, data, 'Contrato', ['supervisor', 'employee', 'admin']);

  const addCashFlow = async (data) => {
    await addItem('cash_flow', setCashFlow, data, 'Fluxo de Caixa', ['finance', 'admin']);
    
    let targetClientId = data.clientId;
    if (!targetClientId && data.name && typeof data.name === 'string' && data.name.startsWith('Mensalidade:')) {
      const matchName = data.name.split(':')[1].split('(')[0].trim().toLowerCase();
      const c = clients.find(cl => cl.name.toLowerCase() === matchName);
      if (c) targetClientId = c.id;
    }

    if (targetClientId && data.type === 'receita') {
      const year = data.referenceYear !== undefined ? parseInt(data.referenceYear) : new Date(data.date).getFullYear();
      const monthIndex = data.referenceMonth !== undefined ? parseInt(data.referenceMonth) : new Date(data.date).getMonth();
      const pMethod = data.paymentMethod || 'Boleto bancário';
      await updatePaymentStatus(targetClientId, year, monthIndex, { status: data.status, value: data.value, paymentMethod: pMethod });
    }
  };
  const updateCashFlow = async (id, data) => {
    await updateItem('cash_flow', setCashFlow, id, data, 'Fluxo de Caixa', ['finance', 'admin']);
    
    let targetClientId = data.clientId;
    if (!targetClientId && data.name && typeof data.name === 'string' && data.name.startsWith('Mensalidade:')) {
      const matchName = data.name.split(':')[1].split('(')[0].trim().toLowerCase();
      const c = clients.find(cl => cl.name.toLowerCase() === matchName);
      if (c) targetClientId = c.id;
    }

    if (targetClientId && data.type === 'receita') {
      const year = data.referenceYear !== undefined ? parseInt(data.referenceYear) : new Date(data.date).getFullYear();
      const monthIndex = data.referenceMonth !== undefined ? parseInt(data.referenceMonth) : new Date(data.date).getMonth();
      const pMethod = data.paymentMethod || 'Boleto bancário';
      await updatePaymentStatus(targetClientId, year, monthIndex, { status: data.status, value: data.value, paymentMethod: pMethod });
    }
  };
  const deleteCashFlow = async (id) => {
    const item = cashFlow.find(c => c.id === id);
    await deleteItem('cash_flow', setCashFlow, id, 'Fluxo de Caixa', ['finance', 'admin']);
    if (item) {
      let targetClientId = item.clientId;
      if (!targetClientId && item.name && typeof item.name === 'string' && item.name.startsWith('Mensalidade:')) {
        const matchName = item.name.split(':')[1].split('(')[0].trim().toLowerCase();
        const c = clients.find(cl => cl.name.toLowerCase() === matchName);
        if (c) targetClientId = c.id;
      }

      if (targetClientId && item.type === 'receita') {
        const year = item.referenceYear !== undefined ? parseInt(item.referenceYear) : new Date(item.date).getFullYear();
        const monthIndex = item.referenceMonth !== undefined ? parseInt(item.referenceMonth) : new Date(item.date).getMonth();
        await updatePaymentStatus(targetClientId, year, monthIndex, { status: 'pendente' });
      }
    }
  };

  const updatePaymentStatus = async (clientId, year, monthIndex, data) => {
    if (!checkPermission(['finance', 'admin'], 'Atualizar Pagamento')) return;
    
    // We expect state clientPayments to be in snake_case directly from supabase right now, but we just want to find it.
    let currentRecord = clientPayments.find(c => String(c.client_id) === String(clientId) && Number(c.year) === Number(year));
    if (!currentRecord) {
        // Fallback or double check since `convertArray` returns camelCase above. However, the raw state `clientPayments` holds snake_case from `await supabase`. 
        // Let's be careful. `fetchTable` stores raw DB objects (snake_case). 
    }

    let newMonths = currentRecord ? { ...currentRecord.months, [monthIndex]: { ...(currentRecord.months[monthIndex] || {}), ...data } } : { [monthIndex]: data };

    let success = false;
    let savedObj = null;

    if (currentRecord) {
      const { data: updatedObj, error } = await supabase.from('client_payments')
        .update({ months: newMonths })
        .eq('id', currentRecord.id)
        .select()
        .single();
      
      if (!error && updatedObj) {
        setClientPayments(prev => prev.map(c => c.id === currentRecord.id ? updatedObj : c));
        success = true;
        savedObj = updatedObj;
      } else if (error) {
         addToast(`Erro: ${error.message}`, 'error');
      }
    } else {
      const { data: newRecord, error } = await supabase.from('client_payments')
        .insert([{ client_id: clientId, year, months: newMonths }])
        .select()
        .single();
      
      if (!error && newRecord) {
        setClientPayments(prev => [...prev, newRecord]);
        success = true;
        savedObj = newRecord;
      } else if (error) {
        addToast(`Erro: ${error.message}`, 'error');
      }
    }

    if (success) {
      addToast(`Pagamento do mês ${monthIndex + 1} atualizado.`, 'success');
    }
  };

  return (
    <DataContext.Provider value={{
      clients: convertArray(clients), addClient, updateClient, deleteClient: id => deleteItem('clients', setClients, id, 'Cliente', ['admin', 'supervisor']),
      bids: convertArray(bids), addBid, updateBid, deleteBid: id => deleteItem('bids', setBids, id, 'Edital', ['admin', 'supervisor']),
      disputes: convertArray(disputes), addDispute, updateDispute, deleteDispute: id => deleteItem('disputes', setDisputes, id, 'Disputa', ['admin', 'supervisor']),
      contracts: convertArray(contracts), addContract, updateContract, deleteContract: id => deleteItem('contracts', setContracts, id, 'Contrato', ['admin', 'supervisor']),
      cashFlow: convertArray(cashFlow), addCashFlow, updateCashFlow, deleteCashFlow,
      clientPayments: convertArray(clientPayments), updatePaymentStatus
    }}>
      {children}
    </DataContext.Provider>
  );
};
