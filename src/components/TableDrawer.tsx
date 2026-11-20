import { useState } from 'react';
import { X, Plus, Receipt, Users, Clock, CheckCircle2, Pencil, Link2, XCircle } from 'lucide-react';
import type { Order, OrderStatus, PaymentMethod, RestaurantState, TableStatus } from '../types.ts';
import { formatCurrency, formatElapsed, getElapsedMinutes } from '../utils/format.ts';

interface TableDrawerProps {
  tableId: string | null;
  state: RestaurantState;
  nowMs: number;
  onClose: () => void;
  onOpenOrderComposer: (tableId: string) => void;
  onEditOrder: (order: Order) => void;
  onAssignOrderToTable: (orderId: string, tableId: string | null) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onUpdateTable: (
    tableId: string,
    payload: { status?: TableStatus; guests?: number; waiter?: string },
  ) => Promise<void>;
  onCloseBill: (
    tableId: string,
    payload: {
      includeServiceFee: boolean;
      discount: number;
      paymentMethod: PaymentMethod;
      nextStatus: 'livre' | 'limpeza';
    },
  ) => Promise<void>;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Dinheiro',
];

export function TableDrawer({
  tableId,
  state,
  nowMs,
  onClose,
  onOpenOrderComposer,
  onEditOrder,
  onAssignOrderToTable,
  onUpdateOrderStatus,
  onUpdateTable,
  onCloseBill,
}: TableDrawerProps) {
  const [includeServiceFee, setIncludeServiceFee] = useState(true);
  const [discountInput, setDiscountInput] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cartão de Crédito');
  const [markCleaningAfterPay, setMarkCleaningAfterPay] = useState(false);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [waiterInput, setWaiterInput] = useState('');
  const [guestsInput, setGuestsInput] = useState<number>(2);
  const [orderToLinkId, setOrderToLinkId] = useState<string>('');

  if (!tableId) return null;
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return null;

  const openOrders = state.orders.filter(
    (o) => o.tableId === table.id && !o.paid && o.status !== 'cancelado',
  );

  // Orders that can be associated with this table (unassigned or currently on another table)
  const linkableOrders = state.orders.filter(
    (o) => !o.paid && o.status !== 'cancelado' && o.tableId !== table.id,
  );

  const subtotal = openOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0),
    0,
  );
  const parsedDiscount = Math.max(0, Math.min(subtotal, Number(discountInput) || 0));
  const serviceFee = includeServiceFee
    ? Number(((subtotal - parsedDiscount) * 0.1).toFixed(2))
    : 0;
  const grandTotal = Number((subtotal - parsedDiscount + serviceFee).toFixed(2));
  const elapsed = getElapsedMinutes(table.seatedAt, nowMs);

  const handleSeatTable = async () => {
    setSubmitting(true);
    try {
      await onUpdateTable(table.id, {
        status: 'ocupada',
        guests: Math.min(table.seats, Math.max(1, guestsInput)),
        waiter: waiterInput.trim() || 'Rafael Souza',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkOrder = async () => {
    if (!orderToLinkId) return;
    setSubmitting(true);
    try {
      await onAssignOrderToTable(orderToLinkId, table.id);
      setOrderToLinkId('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      await onCloseBill(table.id, {
        includeServiceFee,
        discount: parsedDiscount,
        paymentMethod,
        nextStatus: markCleaningAfterPay ? 'limpeza' : 'livre',
      });
      setIsCheckoutMode(false);
      setDiscountInput('0');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">
              {table.zone} · Capacidade {table.seats} lugares
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{table.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel da mesa"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Control Row */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="tabular-nums">
                  {table.status === 'ocupada' ? `${table.guests} clientes` : 'Sem clientes'}
                </span>
              </span>
              {table.seatedAt && (
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {formatElapsed(elapsed)}
                </span>
              )}
            </div>

            <select
              aria-label="Alterar status da mesa"
              value={table.status}
              onChange={(e) => onUpdateTable(table.id, { status: e.target.value as TableStatus })}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="livre">Livre</option>
              <option value="ocupada">Ocupada</option>
              <option value="reservada">Reservada</option>
              <option value="limpeza">Em Limpeza</option>
            </select>
          </div>

          {/* Quick-seat form when table isn't occupied */}
          {table.status !== 'ocupada' && (
            <div className="space-y-4 pb-5 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Abrir Mesa para Atendimento</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Clientes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={table.seats + 2}
                    value={guestsInput}
                    onChange={(e) => setGuestsInput(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Garçom responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rafael Souza"
                    value={waiterInput}
                    onChange={(e) => setWaiterInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSeatTable}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Ocupar Mesa
              </button>
            </div>
          )}

          {/* Associate Existing Order */}
          {linkableOrders.length > 0 && (
            <div className="space-y-2 pb-5 border-b border-slate-200">
              <label className="block text-xs font-medium text-slate-700">
                Associar pedido existente a esta mesa
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={orderToLinkId}
                  onChange={(e) => setOrderToLinkId(e.target.value)}
                  className="flex-1 px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="">Selecionar comanda...</option>
                  {linkableOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} · {o.tableLabel} ({o.items.length} itens)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!orderToLinkId || submitting}
                  onClick={handleLinkOrder}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Associar
                </button>
              </div>
            </div>
          )}

          {/* Open Orders List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Pedidos da Mesa ({openOrders.length})
              </h3>
              <button
                type="button"
                onClick={() => onOpenOrderComposer(table.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo pedido
              </button>
            </div>

            {openOrders.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500">Nenhum pedido associado a esta mesa ainda.</p>
                <button
                  type="button"
                  onClick={() => onOpenOrderComposer(table.id)}
                  className="mt-3 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
                >
                  Registrar Pedido na Mesa
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {openOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900">{order.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {order.status === 'pendente' && 'Na Fila'}
                          {order.status === 'preparo' && 'Em Preparo'}
                          {order.status === 'pronto' && 'Pronto p/ Servir'}
                          {order.status === 'entregue' && 'Servido'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditOrder(order)}
                          title="Editar pedido"
                          className="p-1 text-slate-400 hover:text-slate-900 rounded"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id, 'cancelado')}
                          title="Cancelar pedido"
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-mono text-xs text-slate-500 mr-1.5 tabular-nums">
                              {item.quantity}×
                            </span>
                            <span className="text-slate-800">{item.name}</span>
                            {item.notes && (
                              <div className="text-xs text-amber-700 mt-0.5">Obs: {item.notes}</div>
                            )}
                          </div>
                          <span className="font-mono text-xs font-medium text-slate-900 tabular-nums shrink-0">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Summary & Checkout Flow */}
          {subtotal > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal dos itens</span>
                  <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeServiceFee}
                      onChange={(e) => setIncludeServiceFee(e.target.checked)}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    Taxa de serviço (10%)
                  </span>
                  <span className="font-mono tabular-nums">{formatCurrency(serviceFee)}</span>
                </label>

                {isCheckoutMode && (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-slate-600">Desconto (R$)</span>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      step="1"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-28 px-2.5 py-1 text-right font-mono text-sm border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-semibold text-slate-900">
                  <span>Total da Conta</span>
                  <span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {isCheckoutMode && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-medium text-slate-700">Forma de Pagamento</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                          paymentMethod === method
                            ? 'border-teal-700 bg-teal-50 text-teal-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markCleaningAfterPay}
                      onChange={(e) => setMarkCleaningAfterPay(e.target.checked)}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    Marcar como "Em Limpeza" antes de liberar
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenOrderComposer(table.id)}
            className="flex-1 py-2.5 px-4 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            Novo Pedido
          </button>

          {subtotal > 0 && !isCheckoutMode && (
            <button
              type="button"
              onClick={() => setIsCheckoutMode(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Receipt className="w-4 h-4" />
              Fechar Conta
            </button>
          )}

          {subtotal > 0 && isCheckoutMode && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              {markCleaningAfterPay ? 'Pagar e Limpar' : 'Pagar e Liberar Mesa'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
