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
      else if (key === 'contractEnd') newObj.contract_end = obj[key];
      else if (key === 'estimatedValue') newObj.estimated_value = obj[key];
      else if (key === 'clientsLinked') newObj.clients_linked = obj[key];
      else if (key === 'originPortal') newObj.origin_portal = obj[key];
      else if (key === 'clientId') newObj.client_id = obj[key];
      else if (key === 'bidId') newObj.bid_id = obj[key];
      else if (key === 'startDate') newObj.start_date = obj[key];
      else if (key === 'endDate') newObj.end_date = obj[key];
      else if (key === 'specificType') newObj.specific_type = obj[key];
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
      else if (key === 'contract_end') newObj.contractEnd = obj[key];
      else if (key === 'estimated_value') newObj.estimatedValue = obj[key];
      else if (key === 'clients_linked') newObj.clientsLinked = obj[key];
      else if (key === 'origin_portal') newObj.originPortal = obj[key];
      else if (key === 'client_id') newObj.clientId = obj[key];
      else if (key === 'bid_id') newObj.bidId = obj[key];
      else if (key === 'start_date') newObj.startDate = obj[key];
      else if (key === 'end_date') newObj.endDate = obj[key];
      else if (key === 'specific_type') newObj.specificType = obj[key];
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
    if (data.clientId) {
      const d = new Date(data.date);
      await updatePaymentStatus(data.clientId, d.getFullYear(), d.getMonth(), { status: data.status, value: data.value });
    }
  };
  const updateCashFlow = async (id, data) => {
    await updateItem('cash_flow', setCashFlow, id, data, 'Fluxo de Caixa', ['finance', 'admin']);
    if (data.clientId) {
      const d = new Date(data.date);
      await updatePaymentStatus(data.clientId, d.getFullYear(), d.getMonth(), { status: data.status, value: data.value });
    }
  };

  const updatePaymentStatus = async (clientId, year, monthIndex, data) => {
    if (!checkPermission(['finance', 'admin'], 'Atualizar Pagamento')) return;
    
    // We expect state clientPayments to be in snake_case directly from supabase right now, but we just want to find it.
    let currentRecord = clientPayments.find(c => c.client_id === clientId && c.year === year);
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
      cashFlow: convertArray(cashFlow), addCashFlow, updateCashFlow, deleteCashFlow: id => deleteItem('cash_flow', setCashFlow, id, 'Lançamento', ['admin', 'finance']),
      clientPayments: convertArray(clientPayments), updatePaymentStatus
    }}>
      {children}
    </DataContext.Provider>
  );
};
