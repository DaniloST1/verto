import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays } from 'date-fns';

export const initialUsers = [
  { id: '1', name: 'Admin Silva', email: 'admin@verto.com', document: '00000000000', password: '123', role: 'admin' },
  { id: '2', name: 'Financeiro Costa', email: 'fin@verto.com', document: '11111111111', password: '123', role: 'finance' },
  { id: '3', name: 'Funcionario João', email: 'func@verto.com', document: '22222222222', password: '123', role: 'employee' },
  { id: '4', name: 'Supervisor Maria', email: 'sup@verto.com', document: '33333333333', password: '123', role: 'supervisor' }
];

export const initialClients = [
  { id: uuidv4(), name: 'Alpha Tech Ltda', status: 'apto', responsible: '3', contact: '11999999999', cnpj: '12.345.678/0001-90', cashValue: 15000, notes: 'Cliente prioritário', lastUpdate: new Date().toISOString(), contractEnd: addDays(new Date(), 180).toISOString() },
  { id: uuidv4(), name: 'Beta Construções', status: 'pendente', responsible: '3', contact: '11888888888', cnpj: '98.765.432/0001-10', cashValue: 5000, notes: 'Falta enviar documentação', lastUpdate: subDays(new Date(), 2).toISOString(), contractEnd: addDays(new Date(), 30).toISOString() }
];

export const initialBids = [
  { id: uuidv4(), number: '001/2026', organ: 'Prefeitura SP', estimatedValue: 150000, status: 'aberto', responsible: '3', clientsLinked: [initialClients[0].id], object: 'Fornecimento de computadores', originPortal: 'Licitações-e' },
];

export const initialDisputes = [
  { id: uuidv4(), name: 'Pregão Eletrônico 001', clientId: initialClients[0].id, bidId: initialBids[0].id, date: addDays(new Date(), 5).toISOString(), status: 'agendada', result: 'pendente', responsible: '3' }
];

export const initialContracts = [
  { id: uuidv4(), name: 'Contrato Alpha Tech 001', clientId: initialClients[0].id, bidId: initialBids[0].id, value: 50000, status: 'ativo', startDate: subDays(new Date(), 10).toISOString(), endDate: addDays(new Date(), 355).toISOString(), responsible: '3' }
];

export const initialCashFlow = [
  { id: uuidv4(), name: 'Mensalidade Alpha Tech', date: subDays(new Date(), 5).toISOString(), value: 5000, type: 'receita', specificType: 'mensalidade', status: 'pago' },
  { id: uuidv4(), name: 'Material de escritório', date: subDays(new Date(), 2).toISOString(), value: 500, type: 'despesa', specificType: 'operacional', status: 'pago' }
];

export const initialClientPayments = [
  {
    clientId: initialClients[0].id,
    year: new Date().getFullYear(),
    months: {
      0: { status: 'pago', proof: 'comprovante_jan.pdf' },
      1: { status: 'pendente', proof: null },
      2: { status: 'pendente', proof: null },
      3: { status: 'pendente', proof: null },
      4: { status: 'pendente', proof: null },
      5: { status: 'pendente', proof: null },
      6: { status: 'pendente', proof: null },
      7: { status: 'pendente', proof: null },
      8: { status: 'pendente', proof: null },
      9: { status: 'pendente', proof: null },
      10: { status: 'pendente', proof: null },
      11: { status: 'pendente', proof: null },
    }
  }
];
