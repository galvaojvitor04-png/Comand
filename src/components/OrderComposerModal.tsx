import { useEffect, useState } from 'react';
import { X, Plus, Minus, Search, Send, Save, XCircle } from 'lucide-react';
import type { MenuCategory, MenuItem, Order, RestaurantState } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';

interface CartLine {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface OrderComposerModalProps {
  open: boolean;
  initialTableId: string | null;
  editingOrder: Order | null;
  state: RestaurantState;
  onClose: () => void;
  onSubmitOrder: (payload: {
    tableId: string | null;
    origin: 'Salão' | 'Balcão' | 'Retirada';
    waiter: string;
    guests?: number;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  }) => Promise<void>;
  onUpdateOrder: (
    orderId: string,
    payload: {
      tableId: string | null;
      origin: 'Salão' | 'Balcão' | 'Retirada';
      waiter: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    },
  ) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
}

const CATEGORIES: Array<'Todos' | MenuCategory> = [
  'Todos',
  'Entradas',
  'Principais',
  'Sobremesas',
  'Bebidas',
];

export function OrderComposerModal({
  open,
  initialTableId,
  editingOrder,
  state,
  onClose,
  onSubmitOrder,
  onUpdateOrder,
  onCancelOrder,
}: OrderComposerModalProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [origin, setOrigin] = useState<'Salão' | 'Balcão' | 'Retirada'>('Salão');
  const [waiter, setWaiter] = useState('Rafael Souza');
  const [guests, setGuests] = useState('2');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | MenuCategory>('Todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingOrder) {
      setSelectedTableId(editingOrder.tableId || '');
      setOrigin(editingOrder.origin);
      setWaiter(editingOrder.waiter || 'Rafael Souza');
      const table = state.tables.find((t) => t.id === editingOrder.tableId);
      setGuests(String(table?.guests || 2));

      const mappedCart: CartLine[] = editingOrder.items
        .map((it) => {
          const menuItem =
            state.menu.find((m) => m.id === it.menuItemId) || {
              id: it.menuItemId,
              name: it.name,
              description: '',
              category: 'Principais' as MenuCategory,
              price: it.unitPrice,
              prepTimeMin: 15,
              available: true,
              sku: 'ITEM',
            };
          return {
            menuItem,
            quantity: it.quantity,
            notes: it.notes || '',
          };
        });
      setCart(mappedCart);
    } else {
      setSelectedTableId(initialTableId || state.tables[0]?.id || '');
      setOrigin('Salão');
      setWaiter('Rafael Souza');
      setGuests('2');
      setCart([]);
    }
    setSearch('');
    setConfirmCancel(false);
  }, [open, editingOrder, initialTableId, state.tables, state.menu]);

  if (!open) return null;

  const availableMenu = state.menu.filter((item) => {
    if (!item.available) return false;
    if (categoryFilter !== 'Todos' && item.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const addItem = (dish: MenuItem) => {
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

  const updateQty = (menuItemId: string, delta: number) => {
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

  const updateNotes = (menuItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((line) => (line.menuItem.id === menuItemId ? { ...line, notes } : line)),
    );
  };

  const cartTotal = cart.reduce(
    (sum, line) => sum + line.menuItem.price * line.quantity,
    0,
  );

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        tableId: origin === 'Retirada' ? null : selectedTableId || null,
        origin,
        waiter: waiter.trim() || 'Equipe Salão',
        items: cart.map((line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          notes: line.notes.trim() || undefined,
        })),
      };

      if (editingOrder) {
        await onUpdateOrder(editingOrder.id, payload);
      } else {
        await onSubmitOrder({
          ...payload,
          guests: Number(guests) || 2,
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]">
      <div className="w-full max-w-4xl h-[85vh] max-h-[720px] bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {editingOrder ? `Editar Pedido ${editingOrder.code}` : 'Lançar Novo Pedido'}
            </h2>
            <p className="text-xs text-slate-500">
              {editingOrder
                ? 'Atualize os itens, quantidades, observações ou mesa associada'
                : 'Selecione os pratos e envie diretamente para a fila da cozinha'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-2 text-slate-400 hover:text-slate-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body split */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Dish Picker */}
          <div className="lg:col-span-7 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar prato no cardápio..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {availableMenu.map((dish) => {
                const inCart = cart.find((c) => c.menuItem.id === dish.id);
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => addItem(dish)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {dish.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {dish.category} · {dish.prepTimeMin} min
                        {dish.dietary ? ` · ${dish.dietary}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(dish.price)}
                      </span>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold font-mono tabular-nums">
                        {inCart ? inCart.quantity : <Plus className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Order Configuration & Cart */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-50/50">
            <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
              <div className="grid grid-cols-3 gap-2">
                {(['Salão', 'Balcão', 'Retirada'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrigin(type)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      origin === type
                        ? 'border-teal-700 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {origin !== 'Retirada' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Mesa associada
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="">Sem mesa (Balcão)</option>
                      {state.tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label} ({t.status === 'ocupada' ? 'Ocupada' : 'Livre'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Atendente
                    </label>
                    <input
                      type="text"
                      value={waiter}
                      onChange={(e) => setWaiter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                </div>
              )}

              {origin === 'Salão' && !editingOrder && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Quantidade de clientes na mesa:</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-16 px-2 py-1 text-right font-mono text-xs border border-slate-200 rounded-lg bg-white tabular-nums"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 px-4">
                  Clique nos itens do cardápio ao lado para montar o pedido.
                </div>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.menuItem.id}
                    className="bg-white border border-slate-200 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-slate-900">
                        {line.menuItem.name}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                        {formatCurrency(line.menuItem.price * line.quantity)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={line.notes}
                        onChange={(e) => updateNotes(line.menuItem.id, e.target.value)}
                        placeholder="Obs. cozinha (ex: sem cebola)"
                        className="flex-1 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <div className="inline-flex items-center gap-1 border border-slate-200 rounded bg-white">
                        <button
                          type="button"
                          onClick={() => updateQty(line.menuItem.id, -1)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-mono text-xs font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(line.menuItem.id, 1)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Total do Pedido</span>
                <span className="font-mono tabular-nums">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleSubmit}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-40"
              >
                {editingOrder ? <Save className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                {submitting
                  ? 'Salvando...'
                  : editingOrder
                    ? 'Salvar Alterações do Pedido'
                    : 'Enviar para Cozinha'}
              </button>

              {editingOrder && !editingOrder.paid && onCancelOrder && (
                confirmCancel ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          await onCancelOrder(editingOrder.id);
                          onClose();
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                    >
                      Confirmar Cancelamento
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmCancel(false)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Voltar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar Este Pedido
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
