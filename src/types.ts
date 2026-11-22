export type TableZone = 'Salão Principal' | 'Terraço' | 'Balcão';
export type TableStatus = 'livre' | 'ocupada' | 'reservada' | 'limpeza';

export interface RestaurantTable {
  id: string;
  number: number;
  label: string;
  zone: TableZone;
  seats: number;
  status: TableStatus;
  guests: number;
  waiter: string;
  seatedAt: string | null;
}

export type MenuCategory = 'Entradas' | 'Principais' | 'Sobremesas' | 'Bebidas';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  price: number;
  prepTimeMin: number;
  available: boolean;
  dietary?: string;
  sku: string;
}

export type OrderStatus = 'pendente' | 'preparo' | 'pronto' | 'entregue' | 'cancelado';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  code: string;
  tableId: string | null;
  tableLabel: string;
  origin: 'Salão' | 'Balcão' | 'Retirada';
  waiter: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  paid: boolean;
  cancelReason?: string;
  cancelledAt?: string;
}

export type ReservationStatus = 'confirmada' | 'aguardando' | 'sentada' | 'cancelada';

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  guests: number;
  time: string;
  date: string;
  zonePreference: TableZone;
  tableId: string | null;
  status: ReservationStatus;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: string;
}

export type InventoryCategory = 'Proteínas' | 'Hortifruti' | 'Secos & Grãos' | 'Laticínios' | 'Bebidas';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  supplier: string;
  updatedAt: string;
}

export type PaymentMethod = 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX' | 'Dinheiro';

export interface Transaction {
  id: string;
  tableLabel: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  closedAt: string;
  guests: number;
  cashSessionId?: string;
}

export type CashMovementType = 'suprimento' | 'sangria';

export interface CashRegisterMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  operatorName: string;
  createdAt: string;
}

export type CashRegisterSessionStatus = 'aberto' | 'fechado';

export interface CashRegisterSession {
  id: string;
  code: string;
  status: CashRegisterSessionStatus;
  openedAt: string;
  openedBy: string;
  openingBalance: number;
  openingNotes?: string;
  movements: CashRegisterMovement[];
  closedAt: string | null;
  closedBy: string | null;
  closingNotes?: string;
  countedCash: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  totalsByMethod: Record<PaymentMethod, number>;
  totalSales: number;
  transactionCount: number;
}

export interface CashRegisterState {
  currentSession: CashRegisterSession | null;
  history: CashRegisterSession[];
}

export type StaffRole =
  | 'Gerente'
  | 'Chef de Cozinha'
  | 'Garçom'
  | 'Bartender'
  | 'Caixa'
  | 'Hostess';

export type StaffSector = 'Salão' | 'Cozinha' | 'Bar' | 'Caixa & Recepção';
export type StaffShiftStatus = 'em_turno' | 'pausa' | 'folga';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  sector: StaffSector;
  shiftLabel: string;
  status: StaffShiftStatus;
  phone: string;
  email?: string;
  pin?: string;
  accessEnabled?: boolean;
}

export interface ManagerProfile {
  name: string;
  role: string;
  email: string;
}

export type RolePermissions = Record<StaffRole, NavSection[]>;

export interface AccessLogEntry {
  id: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  action: 'login' | 'bloqueio' | 'permissao_alterada' | 'acesso_bloqueado';
  timestamp: string;
  detail: string;
}

export interface RestaurantState {
  tables: RestaurantTable[];
  menu: MenuItem[];
  orders: Order[];
  reservations: Reservation[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  cashRegister: CashRegisterState;
  staff: StaffMember[];
  managerProfile: ManagerProfile;
  rolePermissions: RolePermissions;
  accessLogs: AccessLogEntry[];
  setupCompleted: boolean;
}

export type NavSection =
  | 'overview'
  | 'pdv'
  | 'cash'
  | 'orders'
  | 'floor'
  | 'kds'
  | 'menu'
  | 'reservations'
  | 'inventory'
  | 'staff'
  | 'access';
