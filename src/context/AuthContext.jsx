import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('verto_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    fetchUsers();

    // Inactivity Timer (3 hours)
    let timeoutId;
    const INACTIVITY_LIMIT = 3 * 60 * 60 * 1000; // 3 hours

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout('Sessão expirada por inatividade.');
      }, INACTIVITY_LIMIT);
    };

    // User interaction events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    if (user) {
      resetTimer();
      events.forEach(event => document.addEventListener(event, resetTimer));
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      setUsers(data);
    }
  };

  const login = async (identifier, password) => {
    const cleanId = identifier.replace(/[^\w\s@.-]/gi, '');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},document.eq.${cleanId}`)
      .eq('password', password)
      .single();

    if (data && !error) {
      setUser(data);
      localStorage.setItem('verto_user', JSON.stringify(data));
      addToast('Login realizado com sucesso!', 'success');
      return data;
    } else {
      addToast('Credenciais inválidas. Tente novamente.', 'error');
      return null;
    }
  };

  const logout = (message = 'Logout realizado.') => {
    setUser(null);
    localStorage.removeItem('verto_user');
    if (message) addToast(message, 'info');
  };

  const addUser = async (newUser) => {
    if (user?.role !== 'admin') {
      addToast('Apenas administradores podem criar usuários.', 'error');
      return;
    }
    
    // Check constraints before
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${newUser.email},document.eq.${newUser.document}`)
      .single();
      
    if (existing) {
      addToast('E-mail ou documento já cadastrado no sistema.', 'warning');
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      addToast('Erro ao criar usuário: ' + error.message, 'error');
    } else if (data) {
      setUsers(prev => [...prev, data]);
      addToast('Usuário criado com sucesso!', 'success');
    }
  };

  // Self-registration for clients (no admin required — validates that CNPJ exists in clients table)
  const registerClient = async (newUser) => {
    // Build formatted CNPJ to match DB storage (XX.XXX.XXX/XXXX-XX) using same logic as Clients.jsx
    const cleanDoc = newUser.document.replace(/\D/g, '');
    const v = cleanDoc.slice(0, 14);
    let formattedCnpj = v;
    if (v.length > 12) formattedCnpj = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
    else if (v.length > 8) formattedCnpj = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
    else if (v.length > 5) formattedCnpj = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
    else if (v.length > 2) formattedCnpj = `${v.slice(0,2)}.${v.slice(2)}`;

    // Final safety check: CNPJ in clients table (formatted)
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('cnpj', formattedCnpj)
      .maybeSingle();

    if (!clientRecord) {
      addToast('CNPJ não localizado na base de clientes.', 'error');
      return { success: false };
    }

    // Check for duplicate email/document
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${newUser.email},document.eq.${newUser.document}`)
      .maybeSingle();

    if (existing) {
      addToast('E-mail ou CNPJ já está em uso no sistema.', 'warning');
      return { success: false };
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ ...newUser, role: 'client', is_first_login: false }])
      .select()
      .single();

    if (error) {
      addToast('Erro ao criar conta: ' + error.message, 'error');
      return { success: false };
    }

    setUsers(prev => [...prev, data]);
    addToast('Conta criada com sucesso!', 'success');
    return { success: true };
  };

  const editUser = async (id, updates) => {
    if (user?.role !== 'admin') return;
    const { data: updatedObj, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) {
      addToast('Erro ao atualizar usuário: ' + error.message, 'error');
    } else if (updatedObj) {
      setUsers(prev => prev.map(u => u.id === id ? updatedObj : u));
      if (user.id === id) {
        setUser(updatedObj);
        localStorage.setItem('verto_user', JSON.stringify(updatedObj));
      }
      addToast('Usuário atualizado.', 'success');
    }
  };

  const deleteUser = async (id) => {
    if (user?.role !== 'admin') return;
    if (user.id === id) {
      addToast('Você não pode excluir sua própria conta.', 'warning');
      return;
    }

    // Transfer responsibility to the current admin to avoid foreign key constraints and orphans
    const tablesToClean = ['clients', 'contracts', 'disputes', 'cash_flow'];
    for (const table of tablesToClean) {
      await supabase.from(table).update({ responsible_id: user.id }).eq('responsible_id', id);
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      addToast('Erro ao excluir usuário: ' + error.message, 'error');
    } else {
      setUsers(prev => prev.filter(u => u.id !== id));
      addToast('Usuário excluído.', 'success');
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, users, login, logout, addUser, editUser, deleteUser, fetchUsers, registerClient }}>
      {children}
    </AuthContext.Provider>
  );
};
