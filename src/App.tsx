import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Wallet,
  ClipboardList,
  Grid2x2,
  ChefHat,
  UtensilsCrossed,
  CalendarClock,
  Package,
  Users,
  ShieldCheck,
  LogOut,
  Pencil,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import type {
  CashMovementType,
  InventoryItem,
  MenuItem,
  NavSection,
  Order,
  OrderStatus,
  PaymentMethod,
  Reservation,
  ReservationStatus,
  RestaurantState,
  StaffMember,
  StaffRole,
  TableStatus,
  TableZone,
} from './types.ts';
import { OverviewView } from './components/OverviewView.tsx';
import { PosView } from './components/PosView.tsx';
import { CashRegisterView } from './components/CashRegisterView.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { FloorPlanView } from './components/FloorPlanView.tsx';
import { TableDrawer } from './components/TableDrawer.tsx';
import { KitchenKDSView } from './components/KitchenKDSView.tsx';
import { MenuView } from './components/MenuView.tsx';
import { ReservationsView } from './components/ReservationsView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { StaffView } from './components/StaffView.tsx';
import { AccessPanelView } from './components/AccessPanelView.tsx';
import { AccessLockScreen } from './components/AccessLockScreen.tsx';
import { ManagerSetupScreen } from './components/ManagerSetupScreen.tsx';
import { OrderComposerModal } from './components/OrderComposerModal.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

const NAV_ITEMS: Array<{ id: NavSection; label: string; Icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Visão Geral', Icon: LayoutDashboard },
  { id: 'pdv', label: 'PDV / Vendas', Icon: Store },
  { id: 'cash', label: 'Caixa', Icon: Wallet },
  { id: 'orders', label: 'Pedidos', Icon: ClipboardList },
  { id: 'floor', label: 'Salão & Mesas', Icon: Grid2x2 },
  { id: 'kds', label: 'Cozinha (KDS)', Icon: ChefHat },
  { id: 'menu', label: 'Cardápio', Icon: UtensilsCrossed },
  { id: 'reservations', label: 'Reservas', Icon: CalendarClock },
  { id: 'inventory', label: 'Estoque', Icon: Package },
  { id: 'staff', label: 'Equipe', Icon: Users },
  { id: 'access', label: 'Painel de Acesso', Icon: ShieldCheck },
];

const SECTION_TITLE: Record<NavSection, string> = {
  overview: 'Visão Geral',
  pdv: 'PDV / Ponto de Venda',
  cash: 'Abertura & Fechamento de Caixa',
  orders: 'Gestão de Pedidos',
  floor: 'Salão & Mesas',
  kds: 'Cozinha (KDS)',
  menu: 'Cardápio',
  reservations: 'Reservas',
  inventory: 'Estoque',
  staff: 'Equipe & Escalas',
  access: 'Painel de Acesso',
};

export default function App() {
  const [state, setState] = useState<RestaurantState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderModalTableId, setOrderModalTableId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managerNameInput, setManagerNameInput] = useState('');
  const [managerEmailInput, setManagerEmailInput] = useState('');
  const [savingManager, setSavingManager] = useState(false);
  const [activeOperatorId, setActiveOperatorId] = useState<string>('s1');
  const [terminalLocked, setTerminalLocked] = useState(true);
  const [lockPreselectedId, setLockPreselectedId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 3200);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Falha ao carregar dados do restaurante.');
      const data = (await res.json()) as RestaurantState;
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [fetchState]);

  const apiMutate = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errData.error || 'Erro ao salvar alteração.');
    }
    const data = (await res.json()) as { state?: RestaurantState } & RestaurantState;
    if (data.state) {
      setState(data.state);
    } else if (data.tables) {
      setState(data);
    } else {
      await fetchState();
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    options?: { cancelReason?: string; releaseTableIfEmpty?: boolean },
  ) => {
    await apiMutate(`/api/orders/${orderId}/status`, 'PATCH', {
      status,
      ...(options || {}),
    });
    showToast(
      status === 'cancelado'
        ? 'Pedido cancelado.'
        : 'Status da comanda atualizado.',
    );
  };

  const handleUpdateOrder = async (
    orderId: string,
    payload: {
      tableId: string | null;
      origin: 'Salão' | 'Balcão' | 'Retirada';
      waiter: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    },
  ) => {
    await apiMutate(`/api/orders/${orderId}`, 'PUT', payload);
    showToast('Pedido atualizado com sucesso.');
  };

  const handleAssignOrderToTable = async (orderId: string, tableId: string | null) => {
    await apiMutate(`/api/orders/${orderId}/assign-table`, 'PATCH', { tableId });
    showToast(tableId ? 'Pedido associado à mesa.' : 'Pedido desvinculado da mesa.');
  };

  const handleCreateTable = async (payload: {
    number: number;
    label: string;
    zone: TableZone;
    seats: number;
  }) => {
    await apiMutate('/api/tables', 'POST', payload);
    showToast(`${payload.label} adicionada ao salão.`);
  };

  const handleUpdateTable = async (
    tableId: string,
    payload: { status?: TableStatus; guests?: number; waiter?: string },
  ) => {
    await apiMutate(`/api/tables/${tableId}`, 'PATCH', payload);
    showToast('Mesa atualizada.');
  };

  const handleDeleteTable = async (tableId: string) => {
    await apiMutate(`/api/tables/${tableId}`, 'DELETE');
    setSelectedTableId(null);
    showToast('Mesa removida do salão.');
  };

  const handleCloseBill = async (
    tableId: string,
    payload: {
      includeServiceFee: boolean;
      discount: number;
      paymentMethod: PaymentMethod;
      nextStatus: 'livre' | 'limpeza';
    },
  ) => {
    await apiMutate(`/api/tables/${tableId}/close`, 'POST', payload);
    showToast(
      payload.nextStatus === 'livre'
        ? 'Pagamento registrado e mesa liberada.'
        : 'Pagamento registrado e mesa marcada para limpeza.',
    );
  };

  const handleSubmitOrder = async (payload: {
    tableId: string | null;
    origin: 'Salão' | 'Balcão' | 'Retirada';
    waiter: string;
    guests?: number;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  }) => {
    await apiMutate('/api/orders', 'POST', payload);
    showToast('Pedido enviado para a cozinha.');
  };

  const handleDirectPosSale = async (payload: {
    customerLabel: string;
    origin: 'Balcão' | 'Retirada';
    waiter: string;
    discount: number;
    paymentMethod: PaymentMethod;
    sendToKitchen: boolean;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  }) => {
    await apiMutate('/api/pos/sale', 'POST', payload);
    showToast('Venda registrada no PDV.');
  };

  const handleCreateDish = async (payload: Omit<MenuItem, 'id' | 'sku'>) => {
    await apiMutate('/api/menu', 'POST', payload);
    showToast('Prato cadastrado no cardápio.');
  };

  const handleUpdateDish = async (id: string, payload: Partial<MenuItem>) => {
    await apiMutate(`/api/menu/${id}`, 'PATCH', payload);
    showToast('Cardápio atualizado.');
  };

  const handleDeleteDish = async (id: string) => {
    await apiMutate(`/api/menu/${id}`, 'DELETE');
    showToast('Item removido do cardápio.');
  };

  const handleCreateReservation = async (payload: Omit<Reservation, 'id' | 'status'>) => {
    await apiMutate('/api/reservations', 'POST', payload);
    showToast('Reserva agendada.');
  };

  const handleUpdateReservation = async (
    id: string,
    payload: { status?: ReservationStatus; tableId?: string | null; cancelReason?: string },
  ) => {
    await apiMutate(`/api/reservations/${id}`, 'PATCH', payload);
    showToast(
      payload.status === 'cancelada'
        ? 'Reserva cancelada.'
        : payload.status === 'confirmada'
          ? 'Reserva reativada.'
          : 'Reserva atualizada.',
    );
  };

  const handleDeleteReservation = async (id: string) => {
    await apiMutate(`/api/reservations/${id}`, 'DELETE');
    showToast('Reserva removida da agenda.');
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    await apiMutate(`/api/inventory/${id}`, 'PATCH', { delta });
  };

  const handleCreateInventoryItem = async (
    payload: Omit<InventoryItem, 'id' | 'updatedAt'>,
  ) => {
    await apiMutate('/api/inventory', 'POST', payload);
    showToast('Insumo adicionado ao estoque.');
  };

  const handleCreateStaffMember = async (payload: Omit<StaffMember, 'id'>) => {
    await apiMutate('/api/staff', 'POST', payload);
    showToast('Integrante adicionado à equipe.');
  };

  const handleUpdateStaffMember = async (id: string, payload: Partial<StaffMember>) => {
    await apiMutate(`/api/staff/${id}`, 'PATCH', payload);
    showToast('Dados da equipe atualizados.');
  };

  const handleDeleteStaffMember = async (id: string) => {
    await apiMutate(`/api/staff/${id}`, 'DELETE');
    showToast('Integrante removido da equipe.');
  };

  const handleUpdateRolePermissions = async (role: StaffRole, modules: NavSection[]) => {
    await apiMutate('/api/access/permissions', 'PATCH', { role, modules });
    showToast(`Permissões de ${role} atualizadas.`);
  };

  const handleSetupManager = async (payload: {
    name: string;
    email: string;
    pin: string;
    confirmPin: string;
  }) => {
    const res = await fetch('/api/setup/manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      operator?: StaffMember;
      state?: RestaurantState;
    };
    if (!res.ok || !data.operator || !data.state) {
      throw new Error(data.error || 'Erro ao concluir cadastro inicial.');
    }
    setState(data.state);
    setActiveOperatorId(data.operator.id);
    setTerminalLocked(false);
    setActiveNav('overview');
    showToast(`Cadastro concluído! Bem-vindo(a), ${data.operator.name}.`);
  };

  const handleOpenCashRegister = async (payload: {
    openingBalance: number;
    openedBy: string;
    openingNotes?: string;
  }) => {
    await apiMutate('/api/cash/open', 'POST', payload);
    showToast('Caixa aberto para o turno.');
  };

  const handleCashMovement = async (payload: {
    type: CashMovementType;
    amount: number;
    reason: string;
    operatorName: string;
  }) => {
    await apiMutate('/api/cash/movement', 'POST', payload);
    showToast(
      payload.type === 'suprimento'
        ? 'Suprimento registrado no caixa.'
        : 'Sangria registrada no caixa.',
    );
  };

  const handleCloseCashRegister = async (payload: {
    countedCash: number;
    closedBy: string;
    closingNotes?: string;
  }) => {
    await apiMutate('/api/cash/close', 'POST', payload);
    showToast('Caixa fechado e conferência registrada.');
  };

  const handleResetSystem = async () => {
    await apiMutate('/api/reset', 'POST');
    setSelectedTableId(null);
    setActiveNav('overview');
    setTerminalLocked(true);
    showToast('Sistema limpo com sucesso.');
  };

  const handleLockTerminal = async (preselectedStaffId?: string) => {
    setLockPreselectedId(preselectedStaffId ?? null);
    setTerminalLocked(true);
    setMobileMenuOpen(false);
    await apiMutate('/api/access/lock', 'POST', { staffId: activeOperatorId }).catch(() => {});
  };

  const handleAuthenticateOperator = async ({
    role,
    pin,
    staffId,
  }: {
    role: StaffRole;
    pin: string;
    staffId?: string;
  }) => {
    const res = await fetch('/api/access/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, pin, staffId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      operator?: StaffMember;
      state?: RestaurantState;
    };
    if (!res.ok || !data.operator) {
      throw new Error(data.error || 'Falha na autenticação.');
    }
    if (data.state) {
      setState(data.state);
    }
    setActiveOperatorId(data.operator.id);
    setTerminalLocked(false);
    const allowed =
      data.state?.rolePermissions?.[data.operator.role] ||
      state?.rolePermissions?.[data.operator.role] ||
      ['overview'];
    if (!allowed.includes(activeNav)) {
      setActiveNav(allowed[0] || 'overview');
    }
    showToast(`Sessão iniciada como ${data.operator.name} (${data.operator.role}).`);
  };

  const openManagerModal = () => {
    const profile = state?.managerProfile || {
      name: 'Gerente Geral',
      role: 'Gerente Geral',
      email: 'galvaojvitor04@gmail.com',
    };
    setManagerNameInput(profile.name);
    setManagerEmailInput(profile.email);
    setManagerModalOpen(true);
  };

  const handleSaveManagerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerNameInput.trim()) return;
    setSavingManager(true);
    try {
      await apiMutate('/api/manager', 'PATCH', {
        name: managerNameInput.trim(),
        email: managerEmailInput.trim(),
      });
      setManagerModalOpen(false);
      showToast('Perfil de Gerente Geral atualizado.');
    } finally {
      setSavingManager(false);
    }
  };

  const openNewOrderForTable = (tableId: string | null) => {
    setEditingOrder(null);
    setOrderModalTableId(tableId);
    setOrderModalOpen(true);
  };

  const openEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderModalTableId(order.tableId);
    setOrderModalOpen(true);
  };

  const openOrdersCount = state
    ? state.orders.filter((o) => !o.paid && o.status !== 'cancelado').length
    : 0;

  const activeKitchenCount = state
    ? state.orders.filter(
        (o) => o.status === 'pendente' || o.status === 'preparo' || o.status === 'pronto',
      ).length
    : 0;

  const lowStockCount = state
    ? state.inventory.filter((i) => i.quantity <= i.minQuantity).length
    : 0;

  const currentOperator: StaffMember =
    state?.staff?.find((s) => s.id === activeOperatorId) ||
    state?.staff?.[0] || {
      id: 's1',
      name: state?.managerProfile?.name || 'Gerente Geral',
      role: 'Gerente',
      sector: 'Caixa & Recepção',
      shiftLabel: '10:00 – 19:00',
      status: 'em_turno',
      phone: '',
      email: state?.managerProfile?.email || 'galvaojvitor04@gmail.com',
    };

  const allowedModules: NavSection[] =
    state?.rolePermissions?.[currentOperator.role] ||
    NAV_ITEMS.map((item) => item.id);

  const visibleNavItems = NAV_ITEMS.filter((item) => allowedModules.includes(item.id));

  if (state && !state.setupCompleted) {
    return (
      <>
        <ManagerSetupScreen onCompleteSetup={handleSetupManager} />
        <OfflineIndicator />
      </>
    );
  }

  if (state && terminalLocked) {
    return (
      <>
        <AccessLockScreen
          state={state}
          initialStaffId={lockPreselectedId}
          onAuthenticate={handleAuthenticateOperator}
        />
        <OfflineIndicator />
      </>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          Comanda & Co.
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ id, label, Icon }) => {
          const isActive = activeNav === id;
          let countHint: number | null = null;
          if (id === 'orders' && openOrdersCount > 0) countHint = openOrdersCount;
          if (id === 'kds' && activeKitchenCount > 0) countHint = activeKitchenCount;
          if (id === 'inventory' && lowStockCount > 0) countHint = lowStockCount;

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveNav(id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </span>
              {countHint !== null && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {countHint}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <button
          type="button"
          onClick={currentOperator.id === 's1' ? openManagerModal : () => handleLockTerminal()}
          className="w-full flex items-center justify-between gap-2.5 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
          title={
            currentOperator.id === 's1'
              ? 'Editar perfil do Gerente Geral'
              : 'Trocar operador'
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal-700 text-white font-display text-xs font-semibold flex items-center justify-center shrink-0">
              {currentOperator.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {currentOperator.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {currentOperator.id === 's1'
                  ? state?.managerProfile?.role || 'Gerente Geral'
                  : currentOperator.role}
              </div>
            </div>
          </div>
          {currentOperator.id === 's1' && (
            <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleLockTerminal()}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          Trocar Operador / Bloquear
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-slate-900/40">
          {sidebarContent}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-400 hidden sm:inline">Operação</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {SECTION_TITLE[activeNav]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => openNewOrderForTable(null)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : error || !state ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-medium text-red-600">
                {error || 'Não foi possível carregar os dados.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void fetchState();
                }}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {activeNav === 'overview' && (
                <OverviewView
                  state={state}
                  nowMs={nowMs}
                  onNavigate={setActiveNav}
                  onAdvanceOrder={handleUpdateOrderStatus}
                  onSelectTable={(id) => {
                    setActiveNav('floor');
                    setSelectedTableId(id);
                  }}
                />
              )}

              {activeNav === 'pdv' && (
                <PosView
                  state={state}
                  onDirectSale={handleDirectPosSale}
                  onSendToTable={handleSubmitOrder}
                  onCloseTableBill={handleCloseBill}
                  onNavigateToCash={() => setActiveNav('cash')}
                />
              )}

              {activeNav === 'cash' && (
                <CashRegisterView
                  state={state}
                  operatorName={currentOperator.name}
                  onOpenCash={handleOpenCashRegister}
                  onAddMovement={handleCashMovement}
                  onCloseCash={handleCloseCashRegister}
                />
              )}

              {activeNav === 'orders' && (
                <OrdersView
                  state={state}
                  nowMs={nowMs}
                  onNewOrder={() => openNewOrderForTable(null)}
                  onEditOrder={openEditOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAssignTable={handleAssignOrderToTable}
                />
              )}

              {activeNav === 'floor' && (
                <FloorPlanView
                  state={state}
                  nowMs={nowMs}
                  selectedTableId={selectedTableId}
                  onSelectTable={setSelectedTableId}
                  onQuickStatusChange={(id, status) => handleUpdateTable(id, { status })}
                  onAddTable={handleCreateTable}
                />
              )}

              {activeNav === 'kds' && (
                <KitchenKDSView
                  state={state}
                  nowMs={nowMs}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              )}

              {activeNav === 'menu' && (
                <MenuView
                  state={state}
                  onCreateDish={handleCreateDish}
                  onUpdateDish={handleUpdateDish}
                  onDeleteDish={handleDeleteDish}
                />
              )}

              {activeNav === 'reservations' && (
                <ReservationsView
                  state={state}
                  onCreateReservation={handleCreateReservation}
                  onUpdateReservation={handleUpdateReservation}
                  onDeleteReservation={handleDeleteReservation}
                />
              )}

              {activeNav === 'inventory' && (
                <InventoryView
                  state={state}
                  onAdjustStock={handleAdjustStock}
                  onCreateInventoryItem={handleCreateInventoryItem}
                />
              )}

              {activeNav === 'staff' && (
                <StaffView
                  state={state}
                  onCreateMember={handleCreateStaffMember}
                  onUpdateMember={handleUpdateStaffMember}
                  onDeleteMember={handleDeleteStaffMember}
                />
              )}

              {activeNav === 'access' && (
                <AccessPanelView
                  state={state}
                  currentOperator={currentOperator}
                  onLockTerminal={handleLockTerminal}
                  onUpdateStaffAccess={handleUpdateStaffMember}
                  onUpdateRolePermissions={handleUpdateRolePermissions}
                  onResetSystem={handleResetSystem}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Table Side Drawer */}
      {state && (
        <TableDrawer
          tableId={selectedTableId}
          state={state}
          nowMs={nowMs}
          onClose={() => setSelectedTableId(null)}
          onOpenOrderComposer={(tableId) => openNewOrderForTable(tableId)}
          onEditOrder={openEditOrder}
          onAssignOrderToTable={handleAssignOrderToTable}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateTable={handleUpdateTable}
          onDeleteTable={handleDeleteTable}
          onCloseBill={handleCloseBill}
        />
      )}

      {/* POS Order Composer / Editor Modal */}
      {state && (
        <OrderComposerModal
          open={orderModalOpen}
          initialTableId={orderModalTableId}
          editingOrder={editingOrder}
          state={state}
          onClose={() => {
            setOrderModalOpen(false);
            setEditingOrder(null);
          }}
          onSubmitOrder={handleSubmitOrder}
          onUpdateOrder={handleUpdateOrder}
          onCancelOrder={(orderId) => handleUpdateOrderStatus(orderId, 'cancelado')}
        />
      )}

      {/* General Manager Profile Modal */}
      {managerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Perfil do Gerente Geral
              </h3>
              <button
                type="button"
                onClick={() => setManagerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveManagerProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Seu nome de exibição
                </label>
                <input
                  type="text"
                  required
                  value={managerNameInput}
                  onChange={(e) => setManagerNameInput(e.target.value)}
                  placeholder="Ex: João Vitor"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={managerEmailInput}
                  onChange={(e) => setManagerEmailInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setManagerModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManager}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                >
                  {savingManager ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <OfflineIndicator />

      {/* Subtle Action Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
