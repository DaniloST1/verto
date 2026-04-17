import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Bids } from './pages/Bids';
import { Disputes } from './pages/Disputes';
import { Contracts } from './pages/Contracts';
import { CashFlow } from './pages/CashFlow';
import { ClientPayments } from './pages/ClientPayments';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="bids" element={<Bids />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="cash-flow" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><CashFlow /></ProtectedRoute>} />
        <Route path="client-payments" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><ClientPayments /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute allowedRoles={['admin', 'supervisor', 'employee', 'finance']}><Settings /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
