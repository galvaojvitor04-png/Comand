import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AccessLogEntry,
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
  const tables: RestaurantTable[] = [
    { id: 't1', number: 1, label: 'Mesa 01', zone: 'Salão Principal', seats: 2, status: 'ocupada', guests: 2, waiter: 'Rafael Souza', seatedAt: minutesAgo(38) },
    { id: 't2', number: 2, label: 'Mesa 02', zone: 'Salão Principal', seats: 4, status: 'ocupada', guests: 4, waiter: 'Camila Rocha', seatedAt: minutesAgo(21) },
    { id: 't3', number: 3, label: 'Mesa 03', zone: 'Salão Principal', seats: 4, status: 'livre', guests: 0, waiter: '', seatedAt: null },
    { id: 't4', number: 4, label: 'Mesa 04', zone: 'Salão Principal', seats: 6, status: 'ocupada', guests: 5, waiter: 'Rafael Souza', seatedAt: minutesAgo(54) },
    { id: 't5', number: 5, label: 'Mesa 05', zone: 'Salão Principal', seats: 4, status: 'reservada', guests: 0, waiter: 'Camila Rocha', seatedAt: null },
    { id: 't6', number: 6, label: 'Mesa 06', zone: 'Salão Principal', seats: 2, status: 'limpeza', guests: 0, waiter: '', seatedAt: null },
    { id: 't7', number: 7, label: 'Mesa 07', zone: 'Terraço', seats: 4, status: 'ocupada', guests: 3, waiter: 'Bruno Lima', seatedAt: minutesAgo(14) },
    { id: 't8', number: 8, label: 'Mesa 08', zone: 'Terraço', seats: 6, status: 'livre', guests: 0, waiter: '', seatedAt: null },
    { id: 't9', number: 9, label: 'Mesa 09', zone: 'Terraço', seats: 4, status: 'reservada', guests: 0, waiter: 'Bruno Lima', seatedAt: null },
    { id: 't10', number: 10, label: 'Mesa 10', zone: 'Terraço', seats: 2, status: 'livre', guests: 0, waiter: '', seatedAt: null },
    { id: 't11', number: 11, label: 'Balcão A', zone: 'Balcão', seats: 2, status: 'ocupada', guests: 1, waiter: 'Carla Mendes', seatedAt: minutesAgo(9) },
    { id: 't12', number: 12, label: 'Balcão B', zone: 'Balcão', seats: 2, status: 'livre', guests: 0, waiter: '', seatedAt: null },
  ];

  const menu: MenuItem[] = [
    {
      id: 'm1',
      sku: 'ENT-01',
      name: 'Burrata com Tomate Confit e Pesto',
      description: 'Burrata cremosa de búfala servida com tomates confitados no alecrim, pesto de manjericão e pão de fermentação natural.',
      category: 'Entradas',
      price: 64.0,
      prepTimeMin: 10,
      available: true,
      dietary: 'Vegetariano',
    },
    {
      id: 'm2',
      sku: 'ENT-02',
      name: 'Tartar de Atum com Gergelim',
      description: 'Atum fresco picado na ponta da faca, emulsão cítrica de ponzu, abacate e crocantes de mandioca.',
      category: 'Entradas',
      price: 72.0,
      prepTimeMin: 12,
      available: true,
      dietary: 'Sem glúten',
    },
    {
      id: 'm3',
      sku: 'ENT-03',
      name: 'Croqueta de Costela Defumada',
      description: 'Porção com 4 unidades de croqueta cremosa de costela bovina 12h acompanhada de aioli de pimenta biquinho.',
      category: 'Entradas',
      price: 48.0,
      prepTimeMin: 9,
      available: true,
    },
    {
      id: 'm4',
      sku: 'PRI-01',
      name: 'Bife Ancho na Brasa',
      description: 'Corte Angus de 340g grelhado no carvão, acompanhado de purê rústico de batata asterix, chimichurri e alho assado.',
      category: 'Principais',
      price: 138.0,
      prepTimeMin: 22,
      available: true,
      dietary: 'Sem glúten',
    },
    {
      id: 'm5',
      sku: 'PRI-02',
      name: 'Risoto de Funghi Porcini',
      description: 'Arroz arbóreo ao caldo artesanal de cogumelos secos, funghi porcini salteado, grana padano 18 meses e azeite trufado.',
      category: 'Principais',
      price: 96.0,
      prepTimeMin: 20,
      available: true,
      dietary: 'Vegetariano',
    },
    {
      id: 'm6',
      sku: 'PRI-03',
      name: 'Salmão Grelhado com Aspargos',
      description: 'Posta de salmão com pele crocante, aspargos grelhados na manteiga de garrafa, emulsão de limão-siciliano e alcaparras.',
      category: 'Principais',
      price: 118.0,
      prepTimeMin: 18,
      available: true,
      dietary: 'Sem glúten',
    },
    {
      id: 'm7',
      sku: 'PRI-04',
      name: 'Tagliatelle ao Ragú de Ossobuco',
      description: 'Massa fresca artesanal envolvida em ragú lento de ossobuco de vitela, gremolata cítrica e queijo pecorino.',
      category: 'Principais',
      price: 94.0,
      prepTimeMin: 16,
      available: true,
    },
    {
      id: 'm8',
      sku: 'PRI-05',
      name: 'Nhoque de Mandioquinha e Castanha',
      description: 'Nhoque dourado na manteiga noisette com cogumelos eryngui, redução de vinho branco e castanha-do-pará tostada.',
      category: 'Principais',
      price: 86.0,
      prepTimeMin: 15,
      available: false,
      dietary: 'Vegano',
    },
    {
      id: 'm9',
      sku: 'SOB-01',
      name: 'Tiramisù Clássico da Casa',
      description: 'Biscoito savoiardi embebido em espresso de torra média, creme leve de mascarpone e cacau belga 70%.',
      category: 'Sobremesas',
      price: 42.0,
      prepTimeMin: 6,
      available: true,
      dietary: 'Vegetariano',
    },
    {
      id: 'm10',
      sku: 'SOB-02',
      name: 'Torta Basca de Baunilha',
      description: 'Cheesecake assado em alta temperatura com centro cremoso, fava de baunilha natural e calda de frutas vermelhas.',
      category: 'Sobremesas',
      price: 44.0,
      prepTimeMin: 5,
      available: true,
      dietary: 'Vegetariano',
    },
    {
      id: 'm11',
      sku: 'BEB-01',
      name: 'Negroni Defumado em Carvalho',
      description: 'Gin seco, Campari e vermute tinto envelhecidos em barril de carvalho com casca de laranja-baía.',
      category: 'Bebidas',
      price: 46.0,
      prepTimeMin: 4,
      available: true,
    },
    {
      id: 'm12',
      sku: 'BEB-02',
      name: 'Soda Artesanal de Caju e Gengibre',
      description: 'Xarope artesanal de caju fresco, infusão de gengibre picante, água gaseificada e ramo de hortelã.',
      category: 'Bebidas',
      price: 22.0,
      prepTimeMin: 3,
      available: true,
      dietary: 'Sem álcool',
    },
    {
      id: 'm13',
      sku: 'BEB-03',
      name: 'Vinho Malbec Reserva (Taça 150ml)',
      description: 'Mendoza, Argentina · Notas de ameixa madura, tabaco e taninos macios.',
      category: 'Bebidas',
      price: 54.0,
      prepTimeMin: 2,
      available: true,
    },
    {
      id: 'm14',
      sku: 'BEB-04',
      name: 'Água Mineral com Gás 500ml',
      description: 'Garrafa de vidro 500ml servida com rodela de limão-taiti.',
      category: 'Bebidas',
      price: 12.0,
      prepTimeMin: 1,
      available: true,
      dietary: 'Sem álcool',
    },
  ];

  const orders: Order[] = [
    {
      id: 'o101',
      code: '#1041',
      tableId: 't1',
      tableLabel: 'Mesa 01',
      origin: 'Salão',
      waiter: 'Rafael Souza',
      status: 'entregue',
      createdAt: minutesAgo(34),
      updatedAt: minutesAgo(16),
      paid: false,
      items: [
        { id: 'oi1', menuItemId: 'm1', name: 'Burrata com Tomate Confit e Pesto', quantity: 1, unitPrice: 64.0 },
        { id: 'oi2', menuItemId: 'm13', name: 'Vinho Malbec Reserva (Taça 150ml)', quantity: 2, unitPrice: 54.0 },
      ],
    },
    {
      id: 'o102',
      code: '#1042',
      tableId: 't4',
      tableLabel: 'Mesa 04',
      origin: 'Salão',
      waiter: 'Rafael Souza',
      status: 'preparo',
      createdAt: minutesAgo(27),
      updatedAt: minutesAgo(19),
      paid: false,
      items: [
        { id: 'oi3', menuItemId: 'm4', name: 'Bife Ancho na Brasa', quantity: 2, unitPrice: 138.0, notes: '1 Ao ponto, 1 Mal passado' },
        { id: 'oi4', menuItemId: 'm5', name: 'Risoto de Funghi Porcini', quantity: 2, unitPrice: 96.0 },
        { id: 'oi5', menuItemId: 'm6', name: 'Salmão Grelhado com Aspargos', quantity: 1, unitPrice: 118.0 },
      ],
    },
    {
      id: 'o103',
      code: '#1043',
      tableId: 't2',
      tableLabel: 'Mesa 02',
      origin: 'Salão',
      waiter: 'Camila Rocha',
      status: 'pronto',
      createdAt: minutesAgo(17),
      updatedAt: minutesAgo(2),
      paid: false,
      items: [
        { id: 'oi6', menuItemId: 'm3', name: 'Croqueta de Costela Defumada', quantity: 2, unitPrice: 48.0 },
        { id: 'oi7', menuItemId: 'm11', name: 'Negroni Defumado em Carvalho', quantity: 2, unitPrice: 46.0 },
      ],
    },
    {
      id: 'o104',
      code: '#1044',
      tableId: 't7',
      tableLabel: 'Mesa 07',
      origin: 'Salão',
      waiter: 'Bruno Lima',
      status: 'pendente',
      createdAt: minutesAgo(6),
      updatedAt: minutesAgo(6),
      paid: false,
      items: [
        { id: 'oi8', menuItemId: 'm2', name: 'Tartar de Atum com Gergelim', quantity: 1, unitPrice: 72.0 },
        { id: 'oi9', menuItemId: 'm7', name: 'Tagliatelle ao Ragú de Ossobuco', quantity: 2, unitPrice: 94.0, notes: 'Sem pimenta' },
        { id: 'oi10', menuItemId: 'm12', name: 'Soda Artesanal de Caju e Gengibre', quantity: 3, unitPrice: 22.0 },
      ],
    },
    {
      id: 'o105',
      code: '#1045',
      tableId: 't11',
      tableLabel: 'Balcão A',
      origin: 'Balcão',
      waiter: 'Carla Mendes',
      status: 'preparo',
      createdAt: minutesAgo(8),
      updatedAt: minutesAgo(5),
      paid: false,
      items: [
        { id: 'oi11', menuItemId: 'm5', name: 'Risoto de Funghi Porcini', quantity: 1, unitPrice: 96.0 },
        { id: 'oi12', menuItemId: 'm14', name: 'Água Mineral com Gás 500ml', quantity: 1, unitPrice: 12.0 },
      ],
    },
    {
      id: 'o106',
      code: '#1046',
      tableId: null,
      tableLabel: 'Aguardando Mesa',
      origin: 'Balcão',
      waiter: 'Camila Rocha',
      status: 'pendente',
      createdAt: minutesAgo(4),
      updatedAt: minutesAgo(4),
      paid: false,
      items: [
        { id: 'oi13', menuItemId: 'm1', name: 'Burrata com Tomate Confit e Pesto', quantity: 1, unitPrice: 64.0, notes: 'Pão extra à parte' },
        { id: 'oi14', menuItemId: 'm11', name: 'Negroni Defumado em Carvalho', quantity: 2, unitPrice: 46.0 },
      ],
    },
  ];

  const reservations: Reservation[] = [
    {
      id: 'r1',
      customerName: 'Mariana Vasconcelos',
      phone: '(11) 98412-3309',
      guests: 4,
      time: '13:00',
      date: todayDateStr(),
      zonePreference: 'Salão Principal',
      tableId: 't5',
      status: 'confirmada',
      notes: 'Aniversário — solicitar sobremesa cortesia se possível',
    },
    {
      id: 'r2',
      customerName: 'Eduardo Cavalcanti',
      phone: '(11) 99204-8812',
      guests: 4,
      time: '13:30',
      date: todayDateStr(),
      zonePreference: 'Terraço',
      tableId: 't9',
      status: 'aguardando',
      notes: 'Preferência por mesa próxima ao jardim',
    },
    {
      id: 'r3',
      customerName: 'Beatriz & André Nunes',
      phone: '(11) 97150-4421',
      guests: 2,
      time: '19:30',
      date: todayDateStr(),
      zonePreference: 'Salão Principal',
      tableId: null,
      status: 'confirmada',
    },
    {
      id: 'r4',
      customerName: 'Grupo Studio Arq',
      phone: '(11) 96331-1098',
      guests: 6,
      time: '20:30',
      date: todayDateStr(),
      zonePreference: 'Terraço',
      tableId: null,
      status: 'confirmada',
      notes: 'Alergia severa a frutos do mar (1 pessoa)',
    },
    {
      id: 'r5',
      customerName: 'Henrique Salgado',
      phone: '(11) 98845-7720',
      guests: 2,
      time: '21:00',
      date: todayDateStr(),
      zonePreference: 'Balcão',
      tableId: null,
      status: 'aguardando',
    },
  ];

  const inventory: InventoryItem[] = [
    { id: 'i1', name: 'Bife Ancho Angus (peça)', category: 'Proteínas', unit: 'kg', quantity: 14.5, minQuantity: 8, unitCost: 92.0, supplier: 'Frigorífico Pampa', updatedAt: minutesAgo(120) },
    { id: 'i2', name: 'Filé de Salmão Fresco', category: 'Proteínas', unit: 'kg', quantity: 3.2, minQuantity: 6, unitCost: 84.0, supplier: 'Pescados Atlântico', updatedAt: minutesAgo(95) },
    { id: 'i3', name: 'Lombo de Atum Sashimi', category: 'Proteínas', unit: 'kg', quantity: 4.8, minQuantity: 4, unitCost: 112.0, supplier: 'Pescados Atlântico', updatedAt: minutesAgo(140) },
    { id: 'i4', name: 'Burrata de Búfala 200g', category: 'Laticínios', unit: 'un', quantity: 7, minQuantity: 10, unitCost: 18.5, supplier: 'Laticínio Benevento', updatedAt: minutesAgo(60) },
    { id: 'i5', name: 'Queijo Mascarpone', category: 'Laticínios', unit: 'kg', quantity: 3.5, minQuantity: 2.5, unitCost: 68.0, supplier: 'Laticínio Benevento', updatedAt: minutesAgo(210) },
    { id: 'i6', name: 'Arroz Arbóreo Italiano', category: 'Secos & Grãos', unit: 'kg', quantity: 18.0, minQuantity: 6, unitCost: 26.0, supplier: 'Empório Importadora', updatedAt: minutesAgo(300) },
    { id: 'i7', name: 'Funghi Porcini Seco', category: 'Secos & Grãos', unit: 'kg', quantity: 0.8, minQuantity: 1.5, unitCost: 340.0, supplier: 'Empório Importadora', updatedAt: minutesAgo(85) },
    { id: 'i8', name: 'Aspargos Verdes Frescos', category: 'Hortifruti', unit: 'maço', quantity: 16, minQuantity: 10, unitCost: 14.0, supplier: 'Horta Orgânica Vale', updatedAt: minutesAgo(180) },
    { id: 'i9', name: 'Tomate Sweet Grape', category: 'Hortifruti', unit: 'kg', quantity: 9.0, minQuantity: 5, unitCost: 19.0, supplier: 'Horta Orgânica Vale', updatedAt: minutesAgo(190) },
    { id: 'i10', name: 'Vinho Malbec Reserva 750ml', category: 'Bebidas', unit: 'gf', quantity: 19, minQuantity: 12, unitCost: 98.0, supplier: 'Vinícola Sul', updatedAt: minutesAgo(240) },
  ];

  const transactions: Transaction[] = [
    { id: 'tx1', tableLabel: 'Mesa 03', subtotal: 248.0, serviceFee: 24.8, discount: 0, total: 272.8, paymentMethod: 'Cartão de Crédito', closedAt: minutesAgo(165), guests: 2 },
    { id: 'tx2', tableLabel: 'Mesa 08', subtotal: 462.0, serviceFee: 46.2, discount: 0, total: 508.2, paymentMethod: 'PIX', closedAt: minutesAgo(130), guests: 4 },
    { id: 'tx3', tableLabel: 'Balcão B', subtotal: 118.0, serviceFee: 11.8, discount: 0, total: 129.8, paymentMethod: 'Cartão de Débito', closedAt: minutesAgo(98), guests: 1 },
    { id: 'tx4', tableLabel: 'Mesa 10', subtotal: 312.0, serviceFee: 31.2, discount: 0, total: 343.2, paymentMethod: 'Cartão de Crédito', closedAt: minutesAgo(62), guests: 2 },
    { id: 'tx5', tableLabel: 'Mesa 06', subtotal: 214.0, serviceFee: 21.4, discount: 10, total: 225.4, paymentMethod: 'PIX', closedAt: minutesAgo(24), guests: 2 },
  ];

  const managerProfile: ManagerProfile = {
    name: 'Gerente Geral',
    role: 'Gerente Geral',
    email: 'galvaojvitor04@gmail.com',
  };

  const staff: StaffMember[] = [
    { id: 's1', name: managerProfile.name, role: 'Gerente', sector: 'Caixa & Recepção', shiftLabel: '10:00 – 19:00', status: 'em_turno', phone: '(11) 98112-4001', email: managerProfile.email, pin: '0000', accessEnabled: true },
    { id: 's2', name: 'Henrique Costa', role: 'Chef de Cozinha', sector: 'Cozinha', shiftLabel: '10:30 – 19:30', status: 'em_turno', phone: '(11) 98223-4110', email: 'henrique@comandaco.com.br', pin: '2020', accessEnabled: true },
    { id: 's3', name: 'Rafael Souza', role: 'Garçom', sector: 'Salão', shiftLabel: '11:00 – 19:00', status: 'em_turno', phone: '(11) 99104-5521', pin: '1111', accessEnabled: true },
    { id: 's4', name: 'Camila Rocha', role: 'Garçom', sector: 'Salão', shiftLabel: '11:00 – 19:00', status: 'em_turno', phone: '(11) 99340-8814', pin: '1122', accessEnabled: true },
    { id: 's5', name: 'Bruno Lima', role: 'Garçom', sector: 'Salão', shiftLabel: '15:00 – 23:30', status: 'em_turno', phone: '(11) 97412-9032', pin: '1133', accessEnabled: true },
    { id: 's6', name: 'Carla Mendes', role: 'Bartender', sector: 'Bar', shiftLabel: '15:00 – 23:30', status: 'em_turno', phone: '(11) 98650-2219', pin: '3030', accessEnabled: true },
    { id: 's7', name: 'Mariana Duarte', role: 'Caixa', sector: 'Caixa & Recepção', shiftLabel: '11:00 – 19:00', status: 'pausa', phone: '(11) 97901-3345', pin: '4040', accessEnabled: true },
    { id: 's8', name: 'Sofia Nogueira', role: 'Hostess', sector: 'Caixa & Recepção', shiftLabel: '18:00 – 23:30', status: 'folga', phone: '(11) 98831-7410', pin: '5050', accessEnabled: false },
  ];

  const rolePermissions: RolePermissions = {
    'Gerente': ['overview', 'pdv', 'orders', 'floor', 'kds', 'menu', 'reservations', 'inventory', 'staff', 'access'],
    'Chef de Cozinha': ['overview', 'kds', 'menu', 'inventory'],
    'Garçom': ['orders', 'floor', 'menu', 'reservations'],
    'Bartender': ['pdv', 'orders', 'kds', 'menu'],
    'Caixa': ['overview', 'pdv', 'orders', 'floor'],
    'Hostess': ['floor', 'reservations'],
  };

  const accessLogs: AccessLogEntry[] = [
    { id: 'al1', staffId: 's1', staffName: managerProfile.name, role: 'Gerente', action: 'login', timestamp: minutesAgo(145), detail: 'Acesso inicial do turno como Gerente Geral' },
    { id: 'al2', staffId: 's2', staffName: 'Henrique Costa', role: 'Chef de Cozinha', action: 'login', timestamp: minutesAgo(110), detail: 'Terminal Cozinha (KDS) autenticado via PIN' },
    { id: 'al3', staffId: 's3', staffName: 'Rafael Souza', role: 'Garçom', action: 'login', timestamp: minutesAgo(85), detail: 'Acesso ao Salão & Pedidos liberado' },
  ];

  return { tables, menu, orders, reservations, inventory, transactions, staff, managerProfile, rolePermissions, accessLogs };
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
    } else {
      parsed.staff = parsed.staff.map((m, idx) => {
        if (!m.pin || typeof m.accessEnabled !== 'boolean') {
          mutated = true;
          return {
            ...m,
            pin: m.pin || (m.id === 's1' ? '0000' : String(1000 + idx * 111)),
            accessEnabled: typeof m.accessEnabled === 'boolean' ? m.accessEnabled : true,
          };
        }
        return m;
      });
    }
    if (!parsed.managerProfile) {
      parsed.managerProfile = seed.managerProfile;
      mutated = true;
    }
    if (!parsed.rolePermissions) {
      parsed.rolePermissions = seed.rolePermissions;
      mutated = true;
    }
    if (!Array.isArray(parsed.accessLogs)) {
      parsed.accessLogs = seed.accessLogs;
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

function saveState(state: RestaurantState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}

let state: RestaurantState = loadState();

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Full state endpoint
  app.get('/api/state', (_req, res) => {
    res.json(state);
  });

  // Update table metadata/status
  app.patch('/api/tables/:id', (req, res) => {
    const { id } = req.params;
    const { status, guests, waiter } = req.body as {
      status?: TableStatus;
      guests?: number;
      waiter?: string;
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

    saveState(state);
    res.json({ table, state });
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
    };

    if (total > 0) {
      state.transactions.unshift(transaction);
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

  // Update order status (KDS workflow & cancellation)
  app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: OrderStatus };
    const order = state.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
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
    };

    state.orders.unshift(order);
    state.transactions.unshift(transaction);
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
    const { status, tableId } = req.body as {
      status?: ReservationStatus;
      tableId?: string | null;
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
      } else if (status === 'cancelada' && reservation.tableId) {
        const table = state.tables.find((t) => t.id === reservation.tableId);
        if (table && table.status === 'reservada') {
          table.status = 'livre';
        }
      }
    }

    saveState(state);
    res.json({ reservation, state });
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
    Object.assign(member, req.body);
    if (id === 's1') {
      if (typeof req.body.name === 'string' && req.body.name.trim()) {
        state.managerProfile.name = req.body.name.trim();
      }
      if (typeof req.body.email === 'string') {
        state.managerProfile.email = req.body.email.trim();
      }
    }
    saveState(state);
    res.json({ member, state });
  });

  app.delete('/api/staff/:id', (req, res) => {
    const { id } = req.params;
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

  // Access Control Panel: Authenticate operator via PIN
  app.post('/api/access/login', (req, res) => {
    const { staffId, pin } = req.body as { staffId: string; pin: string };
    const member = state.staff.find((s) => s.id === staffId);
    if (!member) {
      res.status(404).json({ error: 'Operador não encontrado.' });
      return;
    }
    if (member.accessEnabled === false) {
      state.accessLogs.unshift({
        id: `al_${Date.now()}`,
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        action: 'acesso_bloqueado',
        timestamp: new Date().toISOString(),
        detail: 'Tentativa de entrada com acesso bloqueado',
      });
      saveState(state);
      res.status(403).json({ error: 'O acesso deste colaborador está bloqueado pelo Gerente Geral.' });
      return;
    }
    if ((member.pin || '0000') !== String(pin).trim()) {
      res.status(401).json({ error: 'PIN incorreto. Verifique o código de 4 dígitos.' });
      return;
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
      server: { middlewareMode: true },
      appType: 'spa',
    });
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
