import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AccessLogEntry,
  CashMovementType,
  CashRegisterMovement,
  CashRegisterSession,
  CashRegisterState,
  InventoryItem,
  ManagerProfile,
  MenuItem,
  NavSection,
  Order,
  OrderStatus,
  PaymentMethod,
  Reservation,
  ReservationStatus,
  RestaurantState,
  RestaurantTable,
  RolePermissions,
  StaffMember,
  StaffRole,
  TableStatus,
  Transaction,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'restaurant-db.json');

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function todayDateStr(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function createSeedState(): RestaurantState {
  const rolePermissions: RolePermissions = {
    'Gerente': ['overview', 'pdv', 'cash', 'orders', 'floor', 'kds', 'menu', 'reservations', 'inventory', 'staff', 'access'],
    'Chef de Cozinha': ['overview', 'kds', 'menu', 'inventory'],
    'Garçom': ['orders', 'floor', 'menu', 'reservations'],
    'Bartender': ['pdv', 'orders', 'kds', 'menu'],
    'Caixa': ['overview', 'pdv', 'cash', 'orders', 'floor'],
    'Hostess': ['floor', 'reservations'],
  };

  const cashRegister: CashRegisterState = {
    currentSession: null,
    history: [],
  };

  const managerProfile: ManagerProfile = {
    name: '',
    role: 'Gerente Geral',
    email: '',
  };

  return {
    tables: [],
    menu: [],
    orders: [],
    reservations: [],
    inventory: [],
    transactions: [],
    cashRegister,
    staff: [],
    managerProfile,
    rolePermissions,
    accessLogs: [],
    setupCompleted: false,
  };
}

function emptyTotalsByMethod(): Record<PaymentMethod, number> {
  return {
    'Cartão de Crédito': 0,
    'Cartão de Débito': 0,
    PIX: 0,
    Dinheiro: 0,
  };
}

function recalculateCashSession(
  session: CashRegisterSession,
  transactions: Transaction[],
): void {
  const sessionTxs = transactions.filter((tx) => tx.cashSessionId === session.id);
  const totals = emptyTotalsByMethod();
  let totalSales = 0;

  for (const tx of sessionTxs) {
    totals[tx.paymentMethod] = Number(
      ((totals[tx.paymentMethod] || 0) + tx.total).toFixed(2),
    );
    totalSales = Number((totalSales + tx.total).toFixed(2));
  }

  let suprimentos = 0;
  let sangrias = 0;
  for (const mv of session.movements) {
    if (mv.type === 'suprimento') suprimentos += mv.amount;
    if (mv.type === 'sangria') sangrias += mv.amount;
  }

  session.totalsByMethod = totals;
  session.totalSales = totalSales;
  session.transactionCount = sessionTxs.length;
  session.expectedCash = Number(
    (session.openingBalance + totals.Dinheiro + suprimentos - sangrias).toFixed(2),
  );
  if (session.countedCash !== null) {
    session.cashDifference = Number(
      (session.countedCash - session.expectedCash).toFixed(2),
    );
  }
}

function sanitizeStaffMember(member: StaffMember): StaffMember {
  if (member.role === 'Gerente' || member.id === 's1') {
    return { ...member, pin: '••••' };
  }
  return member;
}

function sanitizeState(s: RestaurantState): RestaurantState {
  return {
    ...s,
    staff: (s.staff || []).map(sanitizeStaffMember),
  };
}

function loadState(): RestaurantState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createSeedState();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as RestaurantState;
    const seed = createSeedState();
    let mutated = false;
    if (!Array.isArray(parsed.staff)) {
      parsed.staff = seed.staff;
      mutated = true;
    }
    if (!parsed.managerProfile) {
      parsed.managerProfile = seed.managerProfile;
      mutated = true;
    }
    if (!parsed.rolePermissions) {
      parsed.rolePermissions = seed.rolePermissions;
      mutated = true;
    } else {
      if (!parsed.rolePermissions['Gerente']?.includes('cash')) {
        parsed.rolePermissions['Gerente'] = Array.from(
          new Set<NavSection>([...(parsed.rolePermissions['Gerente'] || []), 'cash']),
        );
        mutated = true;
      }
      if (parsed.rolePermissions['Caixa'] && !parsed.rolePermissions['Caixa'].includes('cash')) {
        parsed.rolePermissions['Caixa'] = Array.from(
          new Set<NavSection>([...parsed.rolePermissions['Caixa'], 'cash']),
        );
        mutated = true;
      }
    }
    if (!parsed.cashRegister) {
      parsed.cashRegister = seed.cashRegister;
      mutated = true;
    }
    if (!Array.isArray(parsed.accessLogs)) {
      parsed.accessLogs = seed.accessLogs;
      mutated = true;
    }
    if (typeof parsed.setupCompleted !== 'boolean') {
      parsed.setupCompleted = parsed.staff.some((s) => s.role === 'Gerente');
      mutated = true;
    }
    if (mutated) {
      saveState(parsed);
    }
    return parsed;
  } catch {
    const fallback = createSeedState();
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveState(nextState: RestaurantState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(nextState, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}

let state: RestaurantState = loadState();

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Always mask Gerente PINs before sending state or staff payloads to clients
  app.use((_req, res, next) => {
    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        if ('state' in record && record.state && typeof record.state === 'object') {
          record.state = sanitizeState(record.state as RestaurantState);
        } else if ('staff' in record && 'rolePermissions' in record && 'tables' in record) {
          return origJson(sanitizeState(record as unknown as RestaurantState));
        }
        if ('operator' in record && record.operator && typeof record.operator === 'object') {
          record.operator = sanitizeStaffMember(record.operator as StaffMember);
        }
        if ('member' in record && record.member && typeof record.member === 'object') {
          record.member = sanitizeStaffMember(record.member as StaffMember);
        }
      }
      return origJson(body);
    }) as typeof res.json;
    next();
  });

  // Full state endpoint
  app.get('/api/state', (_req, res) => {
    res.json(sanitizeState(state));
  });

  // Initial General Manager Onboarding (Nome + PIN)
  app.post('/api/setup/manager', (req, res) => {
    if (state.setupCompleted && state.staff.some((s) => s.role === 'Gerente')) {
      res.status(400).json({ error: 'O Gerente Geral já foi cadastrado neste sistema.' });
      return;
    }

    const { name, email = '', pin, confirmPin } = req.body as {
      name?: string;
      email?: string;
      pin?: string;
      confirmPin?: string;
    };

    const cleanName = String(name ?? '').trim();
    if (cleanName.length < 2) {
      res.status(400).json({ error: 'Informe o nome completo do Gerente Geral.' });
      return;
    }

    const cleanPin = String(pin ?? '').trim();
    const cleanConfirm = String(confirmPin ?? '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      res.status(400).json({ error: 'Crie um PIN de acesso numérico com 4 dígitos.' });
      return;
    }
    if (cleanConfirm !== cleanPin) {
      res.status(400).json({ error: 'A confirmação do PIN não confere.' });
      return;
    }

    const cleanEmail = String(email ?? '').trim();
    const nowIso = new Date().toISOString();

    state.managerProfile = {
      name: cleanName,
      role: 'Gerente Geral',
      email: cleanEmail,
    };

    const gmMember: StaffMember = {
      id: 's1',
      name: cleanName,
      role: 'Gerente',
      sector: 'Caixa & Recepção',
      shiftLabel: '10:00 – 19:00',
      status: 'em_turno',
      phone: '',
      email: cleanEmail || undefined,
      pin: cleanPin,
      accessEnabled: true,
    };

    state.staff = [gmMember, ...state.staff.filter((s) => s.id !== 's1' && s.role !== 'Gerente')];
    state.setupCompleted = true;
    state.accessLogs.unshift({
      id: `al_${Date.now()}`,
      staffId: gmMember.id,
      staffName: gmMember.name,
      role: gmMember.role,
      action: 'login',
      timestamp: nowIso,
      detail: 'Cadastro inicial do Gerente Geral concluído',
    });

    saveState(state);
    res.status(201).json({ operator: sanitizeStaffMember(gmMember), state: sanitizeState(state) });
  });

  // Cash Register: Open Session
  app.post('/api/cash/open', (req, res) => {
    if (state.cashRegister.currentSession?.status === 'aberto') {
      res.status(400).json({ error: 'Já existe um caixa aberto no momento.' });
      return;
    }

    const { openingBalance = 0, openedBy = 'Operador', openingNotes } = req.body as {
      openingBalance?: number;
      openedBy?: string;
      openingNotes?: string;
    };

    const safeBalance = Number(openingBalance);
    if (Number.isNaN(safeBalance) || safeBalance < 0) {
      res.status(400).json({ error: 'Informe um fundo de troco inicial válido (maior ou igual a zero).' });
      return;
    }

    const nowIso = new Date().toISOString();
    const nextIdx = state.cashRegister.history.length + 1;
    const session: CashRegisterSession = {
      id: `cx_${Date.now()}`,
      code: `CX-${String(nextIdx).padStart(3, '0')}`,
      status: 'aberto',
      openedAt: nowIso,
      openedBy: String(openedBy).trim() || state.managerProfile.name || 'Operador',
      openingBalance: Number(safeBalance.toFixed(2)),
      openingNotes: openingNotes?.trim() || undefined,
      movements: [],
      closedAt: null,
      closedBy: null,
      countedCash: null,
      expectedCash: Number(safeBalance.toFixed(2)),
      cashDifference: null,
      totalsByMethod: emptyTotalsByMethod(),
      totalSales: 0,
      transactionCount: 0,
    };

    state.cashRegister.currentSession = session;
    saveState(state);
    res.status(201).json({ session, state: sanitizeState(state) });
  });

  // Cash Register: Movement (Suprimento / Sangria)
  app.post('/api/cash/movement', (req, res) => {
    const session = state.cashRegister.currentSession;
    if (!session || session.status !== 'aberto') {
      res.status(400).json({ error: 'Abra o caixa antes de registrar movimentações.' });
      return;
    }

    const { type, amount, reason, operatorName = 'Operador' } = req.body as {
      type?: CashMovementType;
      amount?: number;
      reason?: string;
      operatorName?: string;
    };

    if (type !== 'suprimento' && type !== 'sangria') {
      res.status(400).json({ error: 'Tipo de movimentação inválido.' });
      return;
    }

    const safeAmount = Number(amount);
    if (Number.isNaN(safeAmount) || safeAmount <= 0) {
      res.status(400).json({ error: 'Informe um valor positivo para a movimentação.' });
      return;
    }

    const cleanReason = String(reason ?? '').trim();
    if (!cleanReason) {
      res.status(400).json({ error: 'Informe o motivo da movimentação.' });
      return;
    }

    const movement: CashRegisterMovement = {
      id: `mv_${Date.now()}`,
      type,
      amount: Number(safeAmount.toFixed(2)),
      reason: cleanReason,
      operatorName: String(operatorName).trim() || 'Operador',
      createdAt: new Date().toISOString(),
    };

    session.movements.unshift(movement);
    recalculateCashSession(session, state.transactions);
    saveState(state);
    res.status(201).json({ movement, session, state: sanitizeState(state) });
  });

  // Cash Register: Close Session
  app.post('/api/cash/close', (req, res) => {
    const session = state.cashRegister.currentSession;
    if (!session || session.status !== 'aberto') {
      res.status(400).json({ error: 'Nenhum caixa aberto para fechamento.' });
      return;
    }

    const { countedCash, closedBy = 'Operador', closingNotes } = req.body as {
      countedCash?: number;
      closedBy?: string;
      closingNotes?: string;
    };

    const safeCounted = Number(countedCash);
    if (Number.isNaN(safeCounted) || safeCounted < 0) {
      res.status(400).json({ error: 'Informe o valor contado na gaveta.' });
      return;
    }

    session.countedCash = Number(safeCounted.toFixed(2));
    recalculateCashSession(session, state.transactions);
    session.status = 'fechado';
    session.closedAt = new Date().toISOString();
    session.closedBy = String(closedBy).trim() || state.managerProfile.name || 'Operador';
    session.closingNotes = closingNotes?.trim() || undefined;

    state.cashRegister.history.unshift(session);
    state.cashRegister.currentSession = null;
    saveState(state);
    res.json({ session, state: sanitizeState(state) });
  });

  // Create new table in floor plan
  app.post('/api/tables', (req, res) => {
    const {
      number,
      label,
      zone = 'Salão Principal',
      seats = 4,
    } = req.body as {
      number?: number;
      label?: string;
      zone?: string;
      seats?: number;
    };

    const allowedZones = ['Salão Principal', 'Terraço', 'Balcão'] as const;
    const validZone = allowedZones.includes(zone as (typeof allowedZones)[number])
      ? (zone as (typeof allowedZones)[number])
      : null;

    if (!validZone) {
      res.status(400).json({ error: 'Setor inválido. Escolha Salão Principal, Terraço ou Balcão.' });
      return;
    }

    const parsedSeats = Math.round(Number(seats));
    if (Number.isNaN(parsedSeats) || parsedSeats < 1 || parsedSeats > 20) {
      res.status(400).json({ error: 'Informe uma quantidade de lugares entre 1 e 20.' });
      return;
    }

    const maxNumber = state.tables.reduce((max, t) => Math.max(max, t.number), 0);
    const parsedNumber =
      number !== undefined && number !== null && String(number).trim() !== ''
        ? Math.round(Number(number))
        : maxNumber + 1;

    if (Number.isNaN(parsedNumber) || parsedNumber < 1) {
      res.status(400).json({ error: 'Número da mesa inválido.' });
      return;
    }

    if (state.tables.some((t) => t.number === parsedNumber)) {
      res.status(400).json({ error: `Já existe uma mesa com o número ${parsedNumber}.` });
      return;
    }

    const defaultLabel =
      validZone === 'Balcão'
        ? `Balcão ${String(parsedNumber).padStart(2, '0')}`
        : `Mesa ${String(parsedNumber).padStart(2, '0')}`;
    const finalLabel = label?.trim() || defaultLabel;

    if (
      state.tables.some(
        (t) => t.label.trim().toLowerCase() === finalLabel.toLowerCase(),
      )
    ) {
      res.status(400).json({ error: `Já existe uma mesa chamada "${finalLabel}".` });
      return;
    }

    const newTable: RestaurantTable = {
      id: `t_${Date.now()}`,
      number: parsedNumber,
      label: finalLabel,
      zone: validZone,
      seats: parsedSeats,
      status: 'livre',
      guests: 0,
      waiter: '',
      seatedAt: null,
    };

    state.tables.push(newTable);
    state.tables.sort((a, b) => a.number - b.number);
    saveState(state);
    res.status(201).json({ table: newTable, state });
  });

  // Update table metadata/status
  app.patch('/api/tables/:id', (req, res) => {
    const { id } = req.params;
    const { status, guests, waiter, label, seats, zone } = req.body as {
      status?: TableStatus;
      guests?: number;
      waiter?: string;
      label?: string;
      seats?: number;
      zone?: 'Salão Principal' | 'Terraço' | 'Balcão';
    };
    const table = state.tables.find((t) => t.id === id);
    if (!table) {
      res.status(404).json({ error: 'Mesa não encontrada.' });
      return;
    }

    if (status) {
      table.status = status;
      if (status === 'ocupada' && !table.seatedAt) {
        table.seatedAt = new Date().toISOString();
      }
      if (status === 'livre' || status === 'limpeza') {
        table.guests = 0;
        table.seatedAt = null;
        if (status === 'livre') table.waiter = '';
      }
    }
    if (typeof guests === 'number') {
      table.guests = Math.max(0, guests);
    }
    if (typeof waiter === 'string') {
      table.waiter = waiter;
    }
    if (typeof label === 'string' && label.trim()) {
      table.label = label.trim();
    }
    if (typeof seats === 'number' && seats >= 1 && seats <= 20) {
      table.seats = Math.round(seats);
    }
    if (zone && ['Salão Principal', 'Terraço', 'Balcão'].includes(zone)) {
      table.zone = zone;
    }

    saveState(state);
    res.json({ table, state });
  });

  // Delete an idle table from floor plan
  app.delete('/api/tables/:id', (req, res) => {
    const { id } = req.params;
    const table = state.tables.find((t) => t.id === id);
    if (!table) {
      res.status(404).json({ error: 'Mesa não encontrada.' });
      return;
    }

    const hasOpenOrders = state.orders.some(
      (o) => o.tableId === id && !o.paid && o.status !== 'cancelado',
    );
    if (table.status === 'ocupada' || hasOpenOrders) {
      res.status(400).json({
        error: 'Não é possível remover uma mesa ocupada ou com pedidos em aberto.',
      });
      return;
    }

    state.tables = state.tables.filter((t) => t.id !== id);
    state.reservations.forEach((r) => {
      if (r.tableId === id) {
        r.tableId = null;
      }
    });
    saveState(state);
    res.json({ state });
  });

  // Close table bill & record financial transaction
  app.post('/api/tables/:id/close', (req, res) => {
    const { id } = req.params;
    const {
      includeServiceFee = true,
      discount = 0,
      paymentMethod = 'Cartão de Crédito',
      nextStatus = 'livre',
    } = req.body as {
      includeServiceFee?: boolean;
      discount?: number;
      paymentMethod?: PaymentMethod;
      nextStatus?: 'livre' | 'limpeza';
    };

    const currentCash = state.cashRegister.currentSession;
    if (!currentCash || currentCash.status !== 'aberto') {
      res.status(400).json({ error: 'Abra o caixa antes de receber contas de mesas.' });
      return;
    }

    const table = state.tables.find((t) => t.id === id);
    if (!table) {
      res.status(404).json({ error: 'Mesa não encontrada.' });
      return;
    }

    const openOrders = state.orders.filter(
      (o) => o.tableId === id && !o.paid && o.status !== 'cancelado',
    );
    const subtotal = openOrders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, it) => itemSum + it.unitPrice * it.quantity, 0),
      0,
    );

    const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount) || 0));
    const serviceFee = includeServiceFee ? Number(((subtotal - safeDiscount) * 0.1).toFixed(2)) : 0;
    const total = Number((subtotal - safeDiscount + serviceFee).toFixed(2));

    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      tableLabel: table.label,
      subtotal,
      serviceFee,
      discount: safeDiscount,
      total,
      paymentMethod,
      closedAt: new Date().toISOString(),
      guests: table.guests || 1,
      cashSessionId: currentCash.id,
    };

    if (total > 0) {
      state.transactions.unshift(transaction);
      recalculateCashSession(currentCash, state.transactions);
    }

    for (const order of openOrders) {
      order.paid = true;
      if (order.status !== 'entregue') {
        order.status = 'entregue';
      }
      order.updatedAt = new Date().toISOString();
    }

    table.status = nextStatus === 'limpeza' ? 'limpeza' : 'livre';
    table.guests = 0;
    table.seatedAt = null;
    table.waiter = '';

    saveState(state);
    res.json({ transaction, state });
  });

  // Create new order (POS / Table)
  app.post('/api/orders', (req, res) => {
    const {
      tableId,
      origin = 'Salão',
      waiter = 'Equipe Salão',
      guests,
      items,
    } = req.body as {
      tableId: string | null;
      origin?: 'Salão' | 'Balcão' | 'Retirada';
      waiter?: string;
      guests?: number;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'O pedido precisa de ao menos um item.' });
      return;
    }

    let tableLabel = origin === 'Retirada' ? 'Retirada Balcão' : 'Balcão Rápido';
    if (tableId) {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) {
        res.status(404).json({ error: 'Mesa selecionada não encontrada.' });
        return;
      }
      tableLabel = table.label;
      table.status = 'ocupada';
      if (!table.seatedAt) {
        table.seatedAt = new Date().toISOString();
      }
      if (typeof guests === 'number' && guests > 0) {
        table.guests = guests;
      } else if (table.guests === 0) {
        table.guests = 2;
      }
      if (waiter) {
        table.waiter = waiter;
      }
    }

    const orderItems = items
      .map((entry, idx) => {
        const dish = state.menu.find((m) => m.id === entry.menuItemId);
        if (!dish || entry.quantity <= 0) return null;
        return {
          id: `oi_${Date.now()}_${idx}`,
          menuItemId: dish.id,
          name: dish.name,
          quantity: entry.quantity,
          unitPrice: dish.price,
          notes: entry.notes?.trim() || undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (orderItems.length === 0) {
      res.status(400).json({ error: 'Nenhum item válido encontrado.' });
      return;
    }

    const nextNum = 1041 + state.orders.length;
    const nowIso = new Date().toISOString();
    const newOrder: Order = {
      id: `o_${Date.now()}`,
      code: `#${nextNum}`,
      tableId: tableId || null,
      tableLabel,
      origin,
      waiter,
      status: 'pendente',
      items: orderItems,
      createdAt: nowIso,
      updatedAt: nowIso,
      paid: false,
    };

    state.orders.unshift(newOrder);
    saveState(state);
    res.status(201).json({ order: newOrder, state });
  });

  // Update full order (items, quantities, notes, table, waiter, origin)
  app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const order = state.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    if (order.paid) {
      res.status(400).json({ error: 'Não é possível editar um pedido já pago.' });
      return;
    }

    const {
      tableId,
      origin,
      waiter,
      status,
      items,
    } = req.body as {
      tableId?: string | null;
      origin?: 'Salão' | 'Balcão' | 'Retirada';
      waiter?: string;
      status?: OrderStatus;
      items?: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    };

    if (origin) {
      order.origin = origin;
    }
    if (typeof waiter === 'string' && waiter.trim()) {
      order.waiter = waiter.trim();
    }
    if (status) {
      order.status = status;
    }

    if (tableId !== undefined) {
      if (tableId) {
        const targetTable = state.tables.find((t) => t.id === tableId);
        if (!targetTable) {
          res.status(404).json({ error: 'Mesa associada não encontrada.' });
          return;
        }
        order.tableId = targetTable.id;
        order.tableLabel = targetTable.label;
        targetTable.status = 'ocupada';
        if (!targetTable.seatedAt) targetTable.seatedAt = new Date().toISOString();
        if (targetTable.guests === 0) targetTable.guests = 2;
        if (!targetTable.waiter) targetTable.waiter = order.waiter;
      } else {
        order.tableId = null;
        order.tableLabel = order.origin === 'Retirada' ? 'Retirada Balcão' : 'Aguardando Mesa';
      }
    }

    if (Array.isArray(items)) {
      const updatedItems = items
        .map((entry, idx) => {
          const dish = state.menu.find((m) => m.id === entry.menuItemId);
          if (!dish || entry.quantity <= 0) return null;
          return {
            id: `oi_${Date.now()}_${idx}`,
            menuItemId: dish.id,
            name: dish.name,
            quantity: entry.quantity,
            unitPrice: dish.price,
            notes: entry.notes?.trim() || undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (updatedItems.length === 0) {
        res.status(400).json({ error: 'O pedido precisa de ao menos um item válido.' });
        return;
      }
      order.items = updatedItems;
    }

    order.updatedAt = new Date().toISOString();
    saveState(state);
    res.json({ order, state });
  });

  // Associate or move an existing order to a table
  app.patch('/api/orders/:id/assign-table', (req, res) => {
    const { id } = req.params;
    const { tableId } = req.body as { tableId: string | null };
    const order = state.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    if (tableId) {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) {
        res.status(404).json({ error: 'Mesa não encontrada.' });
        return;
      }
      order.tableId = table.id;
      order.tableLabel = table.label;
      order.origin = table.zone === 'Balcão' ? 'Balcão' : 'Salão';
      table.status = 'ocupada';
      if (!table.seatedAt) table.seatedAt = new Date().toISOString();
      if (table.guests === 0) table.guests = 2;
      if (!table.waiter) table.waiter = order.waiter;
    } else {
      order.tableId = null;
      order.tableLabel = order.origin === 'Retirada' ? 'Retirada Balcão' : 'Aguardando Mesa';
    }

    order.updatedAt = new Date().toISOString();
    saveState(state);
    res.json({ order, state });
  });

  // Update order status (KDS workflow, cancellation & reopen)
  app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, cancelReason, releaseTableIfEmpty } = req.body as {
      status: OrderStatus;
      cancelReason?: string;
      releaseTableIfEmpty?: boolean;
    };

    const allowedStatuses: OrderStatus[] = [
      'pendente',
      'preparo',
      'pronto',
      'entregue',
      'cancelado',
    ];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Status de pedido inválido.' });
      return;
    }

    const order = state.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    if (status === 'cancelado' && order.paid) {
      res.status(400).json({ error: 'Não é possível cancelar um pedido já pago.' });
      return;
    }

    const nowIso = new Date().toISOString();
    order.status = status;
    order.updatedAt = nowIso;

    if (status === 'cancelado') {
      order.cancelledAt = nowIso;
      order.cancelReason = cancelReason?.trim() || undefined;

      if (releaseTableIfEmpty && order.tableId) {
        const hasOtherOpenOrders = state.orders.some(
          (o) =>
            o.id !== order.id &&
            o.tableId === order.tableId &&
            !o.paid &&
            o.status !== 'cancelado',
        );
        if (!hasOtherOpenOrders) {
          const table = state.tables.find((t) => t.id === order.tableId);
          if (table && table.status === 'ocupada') {
            table.status = 'livre';
            table.guests = 0;
            table.seatedAt = null;
            table.waiter = '';
          }
        }
      }
    } else {
      delete order.cancelledAt;
      delete order.cancelReason;

      if (order.tableId) {
        const table = state.tables.find((t) => t.id === order.tableId);
        if (table && table.status === 'livre') {
          table.status = 'ocupada';
          table.seatedAt = nowIso;
          if (table.guests === 0) table.guests = 2;
          if (!table.waiter) table.waiter = order.waiter;
        }
      }
    }

    saveState(state);
    res.json({ order, state });
  });

  // Direct POS Sale (Balcão / Retirada immediate checkout + kitchen dispatch)
  app.post('/api/pos/sale', (req, res) => {
    const {
      customerLabel = 'Cliente Balcão',
      origin = 'Balcão',
      waiter = 'Caixa PDV',
      discount = 0,
      paymentMethod = 'Cartão de Crédito',
      sendToKitchen = true,
      items,
    } = req.body as {
      customerLabel?: string;
      origin?: 'Balcão' | 'Retirada';
      waiter?: string;
      discount?: number;
      paymentMethod?: PaymentMethod;
      sendToKitchen?: boolean;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    };

    const currentCash = state.cashRegister.currentSession;
    if (!currentCash || currentCash.status !== 'aberto') {
      res.status(400).json({ error: 'Abra o caixa antes de finalizar vendas no PDV.' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Adicione ao menos um item à venda.' });
      return;
    }

    const orderItems = items
      .map((entry, idx) => {
        const dish = state.menu.find((m) => m.id === entry.menuItemId);
        if (!dish || entry.quantity <= 0) return null;
        return {
          id: `oi_${Date.now()}_${idx}`,
          menuItemId: dish.id,
          name: dish.name,
          quantity: entry.quantity,
          unitPrice: dish.price,
          notes: entry.notes?.trim() || undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (orderItems.length === 0) {
      res.status(400).json({ error: 'Nenhum item válido para finalizar a venda.' });
      return;
    }

    const subtotal = orderItems.reduce(
      (sum, it) => sum + it.unitPrice * it.quantity,
      0,
    );
    const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount) || 0));
    const total = Number((subtotal - safeDiscount).toFixed(2));
    const nowIso = new Date().toISOString();
    const nextNum = 1041 + state.orders.length;

    const order: Order = {
      id: `o_${Date.now()}`,
      code: `#${nextNum}`,
      tableId: null,
      tableLabel: customerLabel.trim() || (origin === 'Retirada' ? 'Retirada Balcão' : 'Balcão PDV'),
      origin,
      waiter: waiter.trim() || 'Caixa PDV',
      status: sendToKitchen ? 'pendente' : 'entregue',
      items: orderItems,
      createdAt: nowIso,
      updatedAt: nowIso,
      paid: true,
    };

    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      tableLabel: `${order.code} · ${order.tableLabel}`,
      subtotal,
      serviceFee: 0,
      discount: safeDiscount,
      total,
      paymentMethod,
      closedAt: nowIso,
      guests: 1,
      cashSessionId: currentCash.id,
    };

    state.orders.unshift(order);
    state.transactions.unshift(transaction);
    recalculateCashSession(currentCash, state.transactions);
    saveState(state);
    res.status(201).json({ order, transaction, state });
  });

  // Menu management
  app.post('/api/menu', (req, res) => {
    const payload = req.body as Omit<MenuItem, 'id' | 'sku'> & { sku?: string };
    if (!payload.name || typeof payload.price !== 'number') {
      res.status(400).json({ error: 'Nome e preço são obrigatórios.' });
      return;
    }
    const prefix = payload.category.slice(0, 3).toUpperCase();
    const newItem: MenuItem = {
      id: `m_${Date.now()}`,
      sku: payload.sku?.trim() || `${prefix}-${String(state.menu.length + 1).padStart(2, '0')}`,
      name: payload.name.trim(),
      description: payload.description?.trim() || '',
      category: payload.category,
      price: Number(payload.price),
      prepTimeMin: Number(payload.prepTimeMin) || 12,
      available: payload.available ?? true,
      dietary: payload.dietary?.trim() || undefined,
    };
    state.menu.unshift(newItem);
    saveState(state);
    res.status(201).json({ item: newItem, state });
  });

  app.patch('/api/menu/:id', (req, res) => {
    const { id } = req.params;
    const item = state.menu.find((m) => m.id === id);
    if (!item) {
      res.status(404).json({ error: 'Item do cardápio não encontrado.' });
      return;
    }
    Object.assign(item, req.body);
    saveState(state);
    res.json({ item, state });
  });

  app.delete('/api/menu/:id', (req, res) => {
    const { id } = req.params;
    state.menu = state.menu.filter((m) => m.id !== id);
    saveState(state);
    res.json({ state });
  });

  // Reservations
  app.post('/api/reservations', (req, res) => {
    const payload = req.body as Omit<Reservation, 'id' | 'status'>;
    if (!payload.customerName || !payload.time) {
      res.status(400).json({ error: 'Nome do cliente e horário são obrigatórios.' });
      return;
    }
    const reservation: Reservation = {
      id: `r_${Date.now()}`,
      customerName: payload.customerName.trim(),
      phone: payload.phone?.trim() || '',
      guests: Math.max(1, Number(payload.guests) || 2),
      time: payload.time,
      date: payload.date || todayDateStr(),
      zonePreference: payload.zonePreference || 'Salão Principal',
      tableId: payload.tableId || null,
      status: 'confirmada',
      notes: payload.notes?.trim() || undefined,
    };
    if (reservation.tableId) {
      const table = state.tables.find((t) => t.id === reservation.tableId);
      if (table && table.status === 'livre') {
        table.status = 'reservada';
      }
    }
    state.reservations.push(reservation);
    state.reservations.sort((a, b) => a.time.localeCompare(b.time));
    saveState(state);
    res.status(201).json({ reservation, state });
  });

  app.patch('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    const { status, tableId, cancelReason } = req.body as {
      status?: ReservationStatus;
      tableId?: string | null;
      cancelReason?: string;
    };
    const reservation = state.reservations.find((r) => r.id === id);
    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada.' });
      return;
    }

    if (tableId !== undefined) {
      reservation.tableId = tableId;
    }
    if (status) {
      reservation.status = status;
      if (status === 'sentada' && reservation.tableId) {
        const table = state.tables.find((t) => t.id === reservation.tableId);
        if (table) {
          table.status = 'ocupada';
          table.guests = reservation.guests;
          table.seatedAt = new Date().toISOString();
          if (!table.waiter) table.waiter = 'Rafael Souza';
        }
      } else if (status === 'cancelada') {
        reservation.cancelledAt = new Date().toISOString();
        reservation.cancelReason = cancelReason?.trim() || undefined;
        if (reservation.tableId) {
          const table = state.tables.find((t) => t.id === reservation.tableId);
          if (table && table.status === 'reservada') {
            table.status = 'livre';
          }
        }
      } else if (status === 'confirmada' || status === 'aguardando') {
        delete reservation.cancelledAt;
        delete reservation.cancelReason;
        if (reservation.tableId) {
          const table = state.tables.find((t) => t.id === reservation.tableId);
          if (table && table.status === 'livre') {
            table.status = 'reservada';
          }
        }
      }
    }

    saveState(state);
    res.json({ reservation, state });
  });

  app.delete('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    const reservation = state.reservations.find((r) => r.id === id);
    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada.' });
      return;
    }

    if (reservation.tableId && reservation.status !== 'sentada') {
      const table = state.tables.find((t) => t.id === reservation.tableId);
      if (table && table.status === 'reservada') {
        table.status = 'livre';
      }
    }

    state.reservations = state.reservations.filter((r) => r.id !== id);
    saveState(state);
    res.json({ state });
  });

  // Inventory
  app.post('/api/inventory', (req, res) => {
    const payload = req.body as Omit<InventoryItem, 'id' | 'updatedAt'>;
    if (!payload.name) {
      res.status(400).json({ error: 'Nome do insumo é obrigatório.' });
      return;
    }
    const item: InventoryItem = {
      id: `i_${Date.now()}`,
      name: payload.name.trim(),
      category: payload.category,
      unit: payload.unit || 'un',
      quantity: Math.max(0, Number(payload.quantity) || 0),
      minQuantity: Math.max(0, Number(payload.minQuantity) || 1),
      unitCost: Math.max(0, Number(payload.unitCost) || 0),
      supplier: payload.supplier?.trim() || 'Fornecedor Local',
      updatedAt: new Date().toISOString(),
    };
    state.inventory.unshift(item);
    saveState(state);
    res.status(201).json({ item, state });
  });

  app.patch('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const { quantity, delta, minQuantity } = req.body as {
      quantity?: number;
      delta?: number;
      minQuantity?: number;
    };
    const item = state.inventory.find((i) => i.id === id);
    if (!item) {
      res.status(404).json({ error: 'Insumo não encontrado.' });
      return;
    }
    if (typeof quantity === 'number') {
      item.quantity = Math.max(0, Number(quantity.toFixed(2)));
    } else if (typeof delta === 'number') {
      item.quantity = Math.max(0, Number((item.quantity + delta).toFixed(2)));
    }
    if (typeof minQuantity === 'number') {
      item.minQuantity = Math.max(0, minQuantity);
    }
    item.updatedAt = new Date().toISOString();
    saveState(state);
    res.json({ item, state });
  });

  // Staff / Team management
  app.post('/api/staff', (req, res) => {
    const payload = req.body as Omit<StaffMember, 'id'>;
    if (!payload.name?.trim()) {
      res.status(400).json({ error: 'Nome do integrante é obrigatório.' });
      return;
    }
    const member: StaffMember = {
      id: `s_${Date.now()}`,
      name: payload.name.trim(),
      role: payload.role || 'Garçom',
      sector: payload.sector || 'Salão',
      shiftLabel: payload.shiftLabel?.trim() || '11:00 – 19:00',
      status: payload.status || 'em_turno',
      phone: payload.phone?.trim() || '',
      email: payload.email?.trim() || undefined,
      pin: payload.pin?.trim() || String(Math.floor(1000 + Math.random() * 9000)),
      accessEnabled: payload.accessEnabled ?? true,
    };
    state.staff.push(member);
    saveState(state);
    res.status(201).json({ member, state });
  });

  app.patch('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    const member = state.staff.find((s) => s.id === id);
    if (!member) {
      res.status(404).json({ error: 'Integrante da equipe não encontrado.' });
      return;
    }
    const updates = { ...req.body } as Partial<StaffMember>;
    if (updates.pin !== undefined) {
      const cleanPin = String(updates.pin).trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        res.status(400).json({ error: 'O PIN deve conter exatamente 4 dígitos numéricos.' });
        return;
      }
      updates.pin = cleanPin;
    }
    Object.assign(member, updates);
    if (id === 's1' || member.role === 'Gerente') {
      if (typeof updates.name === 'string' && updates.name.trim()) {
        state.managerProfile.name = updates.name.trim();
      }
      if (typeof updates.email === 'string') {
        state.managerProfile.email = updates.email.trim();
      }
    }
    saveState(state);
    res.json({ member, state });
  });

  app.delete('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    if (id === 's1') {
      res.status(400).json({ error: 'Não é possível remover o Gerente Geral principal.' });
      return;
    }
    state.staff = state.staff.filter((s) => s.id !== id);
    saveState(state);
    res.json({ state });
  });

  // General Manager profile update
  app.patch('/api/manager', (req, res) => {
    const { name, email, role } = req.body as Partial<ManagerProfile>;
    if (typeof name === 'string' && name.trim()) {
      state.managerProfile.name = name.trim();
    }
    if (typeof email === 'string') {
      state.managerProfile.email = email.trim();
    }
    if (typeof role === 'string' && role.trim()) {
      state.managerProfile.role = role.trim();
    }

    const gmStaff = state.staff.find((s) => s.id === 's1' || s.role === 'Gerente');
    if (gmStaff) {
      gmStaff.name = state.managerProfile.name;
      gmStaff.email = state.managerProfile.email;
    }

    saveState(state);
    res.json({ managerProfile: state.managerProfile, state });
  });

  // Access Control Panel: Authenticate operator via Cargo (role) + PIN
  app.post('/api/access/login', (req, res) => {
    const { staffId, role, pin } = req.body as {
      staffId?: string;
      role?: StaffRole;
      pin?: string;
    };

    const validRoles: StaffRole[] = [
      'Gerente',
      'Chef de Cozinha',
      'Garçom',
      'Bartender',
      'Caixa',
      'Hostess',
    ];

    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: 'Informe um cargo válido para acessar o sistema.' });
      return;
    }

    const cleanPin = String(pin ?? '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      res.status(400).json({ error: 'Informe o PIN de acesso com 4 dígitos.' });
      return;
    }

    let member: StaffMember | undefined;

    if (staffId) {
      const candidate = state.staff.find((s) => s.id === staffId);
      if (!candidate) {
        res.status(404).json({ error: 'Operador não encontrado.' });
        return;
      }
      if (candidate.role !== role) {
        res.status(401).json({ error: 'O cargo informado não corresponde ao operador selecionado.' });
        return;
      }
      if (candidate.accessEnabled === false) {
        state.accessLogs.unshift({
          id: `al_${Date.now()}`,
          staffId: candidate.id,
          staffName: candidate.name,
          role: candidate.role,
          action: 'acesso_bloqueado',
          timestamp: new Date().toISOString(),
          detail: 'Tentativa de entrada com acesso bloqueado',
        });
        saveState(state);
        res.status(403).json({ error: 'O acesso deste colaborador está bloqueado pelo Gerente Geral.' });
        return;
      }
      if ((candidate.pin || '0000') !== cleanPin) {
        res.status(401).json({ error: 'PIN incorreto. Verifique o código de 4 dígitos.' });
        return;
      }
      member = candidate;
    } else {
      const matchesInRole = state.staff.filter(
        (s) => s.role === role && (s.pin || '0000') === cleanPin,
      );
      if (matchesInRole.length === 0) {
        res.status(401).json({ error: 'Cargo ou PIN de acesso incorreto.' });
        return;
      }
      const enabledMatch = matchesInRole.find((s) => s.accessEnabled !== false);
      if (!enabledMatch) {
        const blocked = matchesInRole[0];
        state.accessLogs.unshift({
          id: `al_${Date.now()}`,
          staffId: blocked.id,
          staffName: blocked.name,
          role: blocked.role,
          action: 'acesso_bloqueado',
          timestamp: new Date().toISOString(),
          detail: 'Tentativa de entrada com acesso bloqueado',
        });
        saveState(state);
        res.status(403).json({ error: 'O acesso deste colaborador está bloqueado pelo Gerente Geral.' });
        return;
      }
      member = enabledMatch;
    }

    state.accessLogs.unshift({
      id: `al_${Date.now()}`,
      staffId: member.id,
      staffName: member.name,
      role: member.role,
      action: 'login',
      timestamp: new Date().toISOString(),
      detail: `Sessão iniciada como ${member.role}`,
    });
    state.accessLogs = state.accessLogs.slice(0, 30);
    saveState(state);
    res.json({ operator: member, state });
  });

  // Access Control Panel: Record terminal lock
  app.post('/api/access/lock', (req, res) => {
    const { staffId } = req.body as { staffId?: string };
    const member = state.staff.find((s) => s.id === staffId) || state.staff[0];
    if (member) {
      state.accessLogs.unshift({
        id: `al_${Date.now()}`,
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        action: 'bloqueio',
        timestamp: new Date().toISOString(),
        detail: 'Terminal bloqueado manualmente',
      });
      state.accessLogs = state.accessLogs.slice(0, 30);
      saveState(state);
    }
    res.json({ state });
  });

  // Access Control Panel: Update role permissions
  app.patch('/api/access/permissions', (req, res) => {
    const { role, modules } = req.body as { role: StaffRole; modules: NavSection[] };
    if (!role || !Array.isArray(modules)) {
      res.status(400).json({ error: 'Cargo e lista de módulos são obrigatórios.' });
      return;
    }
    const sanitized = role === 'Gerente'
      ? Array.from(new Set<NavSection>([...modules, 'access', 'staff', 'overview']))
      : modules;

    state.rolePermissions[role] = sanitized;
    state.accessLogs.unshift({
      id: `al_${Date.now()}`,
      staffId: 's1',
      staffName: state.managerProfile.name,
      role: 'Gerente',
      action: 'permissao_alterada',
      timestamp: new Date().toISOString(),
      detail: `Permissões de ${role} atualizadas (${sanitized.length} módulos)`,
    });
    state.accessLogs = state.accessLogs.slice(0, 30);
    saveState(state);
    res.json({ rolePermissions: state.rolePermissions, state });
  });

  // Reset demo data if user wants fresh start
  app.post('/api/reset', (_req, res) => {
    state = createSeedState();
    saveState(state);
    res.json(state);
  });

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start';

  if (isProd) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    if (vite.config.server.hmr === false) {
      app.get('/@vite/client', async (req, res, next) => {
        try {
          const result = await vite.transformRequest(req.originalUrl);
          if (!result) {
            next();
            return;
          }
          const patched = result.code
            .replace(
              'await wsTransport.connect(handlers);',
              '/* HMR disabled: WebSocket connect skipped */',
            )
            .replace(
              'await wsTransport.disconnect();',
              '/* HMR disabled: WebSocket disconnect skipped */',
            )
            .replace(
              'wsTransport.send(data);',
              '/* HMR disabled: WebSocket send skipped */',
            );
          res
            .status(200)
            .set({
              'Content-Type': 'application/javascript; charset=utf-8',
              'Cache-Control': 'no-cache',
            })
            .end(patched);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Comanda & Co. server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
