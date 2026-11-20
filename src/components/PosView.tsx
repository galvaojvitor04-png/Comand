import { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Send,
  Printer,
  X,
} from 'lucide-react';
import type { MenuCategory, MenuItem, PaymentMethod, RestaurantState } from '../types.ts';
import { formatCurrency, formatTimeShort } from '../utils/format.ts';

interface PosCartLine {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface ReceiptData {
  title: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeDue?: number;
  timestamp: string;
}

interface PosViewProps {
  state: RestaurantState;
  onDirectSale: (payload: {
    customerLabel: string;
    origin: 'Balcão' | 'Retirada';
    waiter: string;
    discount: number;
    paymentMethod: PaymentMethod;
    sendToKitchen: boolean;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  }) => Promise<void>;
  onSendToTable: (payload: {
    tableId: string;
    origin: 'Salão' | 'Balcão';
    waiter: string;
    guests?: number;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  }) => Promise<void>;
  onCloseTableBill: (
    tableId: string,
    payload: {
      includeServiceFee: boolean;
      discount: number;
      paymentMethod: PaymentMethod;
      nextStatus: 'livre' | 'limpeza';
    },
  ) => Promise<void>;
}

const CATEGORIES: Array<'Todos' | MenuCategory> = [
  'Todos',
  'Entradas',
  'Principais',
  'Sobremesas',
  'Bebidas',
];

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string; Icon: typeof CreditCard }> = [
  { value: 'Cartão de Crédito', label: 'Crédito', Icon: CreditCard },
  { value: 'Cartão de Débito', label: 'Débito', Icon: CreditCard },
  { value: 'PIX', label: 'PIX', Icon: QrCode },
  { value: 'Dinheiro', label: 'Dinheiro', Icon: Banknote },
];

export function PosView({
  state,
  onDirectSale,
  onSendToTable,
  onCloseTableBill,
}: PosViewProps) {
  const [mode, setMode] = useState<'balcao' | 'mesa' | 'receber'>('balcao');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | MenuCategory>('Todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<PosCartLine[]>([]);

  // Direct sale / Table dispatch fields
  const [origin, setOrigin] = useState<'Balcão' | 'Retirada'>('Balcão');
  const [customerLabel, setCustomerLabel] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>(
    state.tables[0]?.id || '',
  );
  const [operatorName, setOperatorName] = useState('Caixa PDV');

  // Checkout & payment fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cartão de Crédito');
  const [discountInput, setDiscountInput] = useState('0');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [sendToKitchen, setSendToKitchen] = useState(true);
  const [includeServiceFee, setIncludeServiceFee] = useState(true);
  const [splitPeople, setSplitPeople] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);

  // Shift Cash Register Metrics
  const todayTotal = state.transactions.reduce((sum, tx) => sum + tx.total, 0);
  const pixTotal = state.transactions
    .filter((tx) => tx.paymentMethod === 'PIX')
    .reduce((sum, tx) => sum + tx.total, 0);
  const cardTotal = state.transactions
    .filter(
      (tx) =>
        tx.paymentMethod === 'Cartão de Crédito' ||
        tx.paymentMethod === 'Cartão de Débito',
    )
    .reduce((sum, tx) => sum + tx.total, 0);
  const cashTotal = state.transactions
    .filter((tx) => tx.paymentMethod === 'Dinheiro')
    .reduce((sum, tx) => sum + tx.total, 0);

  const tablesWithBalance = state.tables.filter((t) =>
    state.orders.some(
      (o) => o.tableId === t.id && !o.paid && o.status !== 'cancelado',
    ),
  );

  const activeReceiveTableId =
    tablesWithBalance.some((t) => t.id === selectedTableId)
      ? selectedTableId
      : tablesWithBalance[0]?.id || '';

  const receiveOrders = state.orders.filter(
    (o) =>
      o.tableId === activeReceiveTableId &&
      !o.paid &&
      o.status !== 'cancelado',
  );

  const filteredMenu = state.menu.filter((item) => {
    if (categoryFilter !== 'Todos' && item.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const addToCart = (dish: MenuItem) => {
    if (!dish.available) return;
    if (mode === 'receber') {
      setMode('balcao');
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.menuItem.id === dish.id);
      if (existing) {
        return prev.map((line) =>
          line.menuItem.id === dish.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { menuItem: dish, quantity: 1, notes: '' }];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) =>
          line.menuItem.id === menuItemId
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const updateCartNotes = (menuItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((line) => (line.menuItem.id === menuItemId ? { ...line, notes } : line)),
    );
  };

  const cartSubtotal = cart.reduce(
    (sum, line) => sum + line.menuItem.price * line.quantity,
    0,
  );

  const receiveSubtotal = receiveOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
    0,
  );

  const activeSubtotal = mode === 'receber' ? receiveSubtotal : cartSubtotal;
  const parsedDiscount = Math.max(0, Math.min(activeSubtotal, Number(discountInput) || 0));
  const serviceFee =
    mode === 'receber' && includeServiceFee
      ? Number(((activeSubtotal - parsedDiscount) * 0.1).toFixed(2))
      : 0;
  const finalTotal = Number((activeSubtotal - parsedDiscount + serviceFee).toFixed(2));

  const cashReceived = Number(cashReceivedInput) || 0;
  const changeDue =
    paymentMethod === 'Dinheiro' && cashReceived > finalTotal
      ? Number((cashReceived - finalTotal).toFixed(2))
      : 0;

  const peopleCount = Math.max(1, Number(splitPeople) || 1);
  const perPersonAmount = finalTotal / peopleCount;

  const handleCompleteDirectSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const label =
        customerLabel.trim() ||
        (origin === 'Retirada' ? 'Retirada Balcão' : 'Balcão Rápido');
      await onDirectSale({
        customerLabel: label,
        origin,
        waiter: operatorName,
        discount: parsedDiscount,
        paymentMethod,
        sendToKitchen,
        items: cart.map((line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          notes: line.notes.trim() || undefined,
        })),
      });

      setLastReceipt({
        title: `${origin} · ${label}`,
        items: cart.map((c) => ({
          name: c.menuItem.name,
          quantity: c.quantity,
          unitPrice: c.menuItem.price,
        })),
        subtotal: cartSubtotal,
        serviceFee: 0,
        discount: parsedDiscount,
        total: finalTotal,
        paymentMethod,
        cashReceived: paymentMethod === 'Dinheiro' && cashReceived > 0 ? cashReceived : undefined,
        changeDue: paymentMethod === 'Dinheiro' && changeDue > 0 ? changeDue : undefined,
        timestamp: new Date().toISOString(),
      });

      setCart([]);
      setCustomerLabel('');
      setDiscountInput('0');
      setCashReceivedInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchToTable = async () => {
    if (cart.length === 0 || !selectedTableId) return;
    setSubmitting(true);
    try {
      const targetTable = state.tables.find((t) => t.id === selectedTableId);
      await onSendToTable({
        tableId: selectedTableId,
        origin: targetTable?.zone === 'Balcão' ? 'Balcão' : 'Salão',
        waiter: operatorName,
        items: cart.map((line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          notes: line.notes.trim() || undefined,
        })),
      });
      setCart([]);
      setDiscountInput('0');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveTable = async () => {
    if (!activeReceiveTableId || receiveSubtotal <= 0) return;
    setSubmitting(true);
    try {
      const targetTable = state.tables.find((t) => t.id === activeReceiveTableId);
      const flatItems = receiveOrders.flatMap((o) =>
        o.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      );

      await onCloseTableBill(activeReceiveTableId, {
        includeServiceFee,
        discount: parsedDiscount,
        paymentMethod,
        nextStatus: 'livre',
      });

      setLastReceipt({
        title: targetTable ? `Fechamento ${targetTable.label}` : 'Fechamento de Mesa',
        items: flatItems,
        subtotal: receiveSubtotal,
        serviceFee,
        discount: parsedDiscount,
        total: finalTotal,
        paymentMethod,
        cashReceived: paymentMethod === 'Dinheiro' && cashReceived > 0 ? cashReceived : undefined,
        changeDue: paymentMethod === 'Dinheiro' && changeDue > 0 ? changeDue : undefined,
        timestamp: new Date().toISOString(),
      });

      setDiscountInput('0');
      setCashReceivedInput('');
      setSplitPeople('1');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Caixa do Turno Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs text-slate-500">Caixa do Turno</div>
          <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {formatCurrency(todayTotal)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Cartões (Créd./Déb.)</div>
          <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
            {formatCurrency(cardTotal)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">PIX</div>
          <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
            {formatCurrency(pixTotal)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Dinheiro</div>
          <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
            {formatCurrency(cashTotal)}
          </div>
        </div>
        <div className="p-4 col-span-2 lg:col-span-1 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Vendas Fechadas</div>
            <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {state.transactions.length}
            </div>
          </div>
          {lastReceipt && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Último Cupom
            </button>
          )}
        </div>
      </section>

      {/* Main PDV 2-Column Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Product Grid */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar item por nome ou SKU (ex: ENT-01, Risoto)..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                {filteredMenu.filter((m) => m.available).length} itens disponíveis
              </div>
            </div>

            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto">
            {filteredMenu.map((dish) => {
              const inCart = cart.find((line) => line.menuItem.id === dish.id);
              return (
                <button
                  key={dish.id}
                  type="button"
                  disabled={!dish.available}
                  onClick={() => addToCart(dish)}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all ${
                    !dish.available
                      ? 'bg-slate-50 border-slate-200 opacity-55 cursor-not-allowed'
                      : inCart
                        ? 'bg-teal-50/40 border-teal-700 hover:bg-teal-50/70'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">{dish.sku}</span>
                      <span>{dish.available ? `${dish.prepTimeMin} min` : 'Esgotado'}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-slate-900 leading-snug">
                      {dish.name}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(dish.price)}
                    </span>
                    {inCart ? (
                      <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                        {inCart.quantity} no cupom
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-teal-700">+ Adicionar</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: POS Terminal / Register */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {/* Mode Switcher */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('balcao')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'balcao'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Venda Direta
              </button>
              <button
                type="button"
                onClick={() => setMode('mesa')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'mesa'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lançar Mesa
              </button>
              <button
                type="button"
                onClick={() => setMode('receber')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'receber'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Receber Mesa ({tablesWithBalance.length})
              </button>
            </div>

            {mode === 'balcao' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Tipo de Venda
                  </label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value as 'Balcão' | 'Retirada')}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Balcão">Consumo Balcão</option>
                    <option value="Retirada">Retirada / Viagem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Cliente / Identificação
                  </label>
                  <input
                    type="text"
                    value={customerLabel}
                    onChange={(e) => setCustomerLabel(e.target.value)}
                    placeholder="Ex: João / Balcão"
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {mode === 'mesa' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Selecionar Mesa
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {state.tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} · {t.status === 'ocupada' ? 'Ocupada' : 'Livre'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Operador / Garçom
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {mode === 'receber' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Mesa com Conta em Aberto
                </label>
                {tablesWithBalance.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    Nenhuma mesa com consumo em aberto no momento.
                  </div>
                ) : (
                  <select
                    value={activeReceiveTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white"
                  >
                    {tablesWithBalance.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} · {t.zone} ({t.guests} clientes)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Items Area */}
          <div className="p-4 border-b border-slate-200 max-h-64 overflow-y-auto">
            {mode !== 'receber' ? (
              cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Clique nos produtos ao lado para adicionar ao cupom do PDV.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{cart.reduce((s, l) => s + l.quantity, 0)} itens no cupom</span>
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar cupom
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {cart.map((line) => (
                      <li key={line.menuItem.id} className="py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-900">
                            {line.menuItem.name}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                            {formatCurrency(line.menuItem.price * line.quantity)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={line.notes}
                            onChange={(e) => updateCartNotes(line.menuItem.id, e.target.value)}
                            placeholder="Obs. cozinha..."
                            className="flex-1 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded"
                          />
                          <div className="inline-flex items-center gap-1 border border-slate-200 rounded">
                            <button
                              type="button"
                              onClick={() => updateCartQty(line.menuItem.id, -1)}
                              className="p-1 text-slate-600 hover:text-slate-900"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-1.5 font-mono text-xs font-semibold tabular-nums">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(line.menuItem.id, 1)}
                              className="p-1 text-slate-600 hover:text-slate-900"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : receiveOrders.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Selecione uma mesa ocupada acima para receber o pagamento.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {receiveOrders.flatMap((o) =>
                  o.items.map((it) => (
                    <li key={it.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-800">
                        <span className="font-mono font-semibold text-slate-900 mr-1.5 tabular-nums">
                          {it.quantity}×
                        </span>
                        {it.name}
                      </span>
                      <span className="font-mono font-medium text-slate-900 tabular-nums shrink-0">
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </span>
                    </li>
                  )),
                )}
              </ul>
            )}
          </div>

          {/* Totals & Payment Terminal */}
          <div className="p-4 bg-slate-50/70 space-y-4">
            {mode !== 'mesa' && (
              <>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatCurrency(activeSubtotal)}</span>
                  </div>

                  {mode === 'receber' && (
                    <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeServiceFee}
                          onChange={(e) => setIncludeServiceFee(e.target.checked)}
                          className="rounded border-slate-300 text-teal-700"
                        />
                        Taxa de serviço (10%)
                      </span>
                      <span className="font-mono tabular-nums">{formatCurrency(serviceFee)}</span>
                    </label>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Desconto (R$)</span>
                    <input
                      type="number"
                      min={0}
                      max={activeSubtotal}
                      step="1"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-24 px-2 py-1 text-right font-mono text-xs bg-white border border-slate-200 rounded-md tabular-nums"
                    />
                  </div>

                  {mode === 'receber' && activeSubtotal > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">Dividir conta por pessoas</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={splitPeople}
                          onChange={(e) => setSplitPeople(e.target.value)}
                          className="w-16 px-2 py-1 text-right font-mono text-xs bg-white border border-slate-200 rounded-md tabular-nums"
                        />
                        {peopleCount > 1 && (
                          <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                            {formatCurrency(perPersonAmount)}/p
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-semibold text-slate-900">
                    <span>Total a Receber</span>
                    <span className="font-mono tabular-nums">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Payment Method Picker */}
                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-slate-600">Forma de Pagamento</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_OPTIONS.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value)}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                          paymentMethod === value
                            ? 'border-teal-700 bg-teal-50 text-teal-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'Dinheiro' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Valor recebido (R$)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={cashReceivedInput}
                        onChange={(e) => setCashReceivedInput(e.target.value)}
                        placeholder={String(Math.ceil(finalTotal))}
                        className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-200 rounded-md tabular-nums"
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500">Troco</div>
                      <div className="mt-1 font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(changeDue)}
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'balcao' && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToKitchen}
                      onChange={(e) => setSendToKitchen(e.target.checked)}
                      className="rounded border-slate-300 text-teal-700"
                    />
                    Enviar itens para fila da cozinha (KDS)
                  </label>
                )}
              </>
            )}

            {/* Primary PDV Action Button */}
            {mode === 'balcao' && (
              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCompleteDirectSale}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting
                  ? 'Processando venda...'
                  : `Finalizar Venda · ${formatCurrency(finalTotal)}`}
              </button>
            )}

            {mode === 'mesa' && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-slate-900">
                  <span>Total a Lançar</span>
                  <span className="font-mono tabular-nums">{formatCurrency(cartSubtotal)}</span>
                </div>
                <button
                  type="button"
                  disabled={cart.length === 0 || !selectedTableId || submitting}
                  onClick={handleDispatchToTable}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando...' : 'Lançar na Mesa & Cozinha'}
                </button>
              </div>
            )}

            {mode === 'receber' && (
              <button
                type="button"
                disabled={receiveSubtotal <= 0 || submitting}
                onClick={handleReceiveTable}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
              >
                <Receipt className="w-4 h-4" />
                {submitting
                  ? 'Recebendo...'
                  : `Receber ${formatCurrency(finalTotal)} e Liberar Mesa`}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Latest Sale Receipt Card */}
      {lastReceipt && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-medium text-emerald-700">
                Comprovante Registrado · {formatTimeShort(lastReceipt.timestamp)}
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                {lastReceipt.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setLastReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
                aria-label="Fechar comprovante"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <ul className="space-y-1.5">
              {lastReceipt.items.map((it, idx) => (
                <li key={idx} className="flex justify-between text-slate-700">
                  <span>
                    <span className="font-mono font-semibold mr-1.5 tabular-nums">
                      {it.quantity}×
                    </span>
                    {it.name}
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(it.unitPrice * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(lastReceipt.subtotal)}</span>
              </div>
              {lastReceipt.serviceFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de serviço (10%)</span>
                  <span className="font-mono tabular-nums">{formatCurrency(lastReceipt.serviceFee)}</span>
                </div>
              )}
              {lastReceipt.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Desconto</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(lastReceipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Pago ({lastReceipt.paymentMethod})</span>
                <span className="font-mono tabular-nums">{formatCurrency(lastReceipt.total)}</span>
              </div>
              {lastReceipt.changeDue !== undefined && (
                <div className="flex justify-between text-emerald-700 font-mono tabular-nums">
                  <span>Troco devolvido</span>
                  <span>{formatCurrency(lastReceipt.changeDue)}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
