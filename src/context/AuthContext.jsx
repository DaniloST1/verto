import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('verto_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchUsers();
  }, []);

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
      return true;
    } else {
      addToast('Credenciais inválidas. Tente novamente.', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('verto_user');
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

  return (
    <AuthContext.Provider value={{ user, users, login, logout, addUser, editUser, fetchUsers }}>
      {children}
    </AuthContext.Provider>
  );
};
