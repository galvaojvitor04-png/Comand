import { useState } from 'react';
import { X, Plus, Receipt, Users, Clock, CheckCircle2, Pencil, Link2, XCircle, Trash2 } from 'lucide-react';
import type { Order, OrderStatus, PaymentMethod, RestaurantState, TableStatus } from '../types.ts';
import { formatCurrency, formatElapsed, getElapsedMinutes } from '../utils/format.ts';

interface TableDrawerProps {
  tableId: string | null;
  state: RestaurantState;
  nowMs: number;
  operatorName?: string;
  onClose: () => void;
  onOpenOrderComposer: (tableId: string) => void;
  onEditOrder: (order: Order) => void;
  onAssignOrderToTable: (orderId: string, tableId: string | null) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onUpdateTable: (
    tableId: string,
    payload: { status?: TableStatus; guests?: number; waiter?: string },
  ) => Promise<void>;
  onDeleteTable?: (tableId: string) => Promise<void>;
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
  operatorName,
  onClose,
  onOpenOrderComposer,
  onEditOrder,
  onAssignOrderToTable,
  onUpdateOrderStatus,
  onUpdateTable,
  onDeleteTable,
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);

  if (!tableId) return null;
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return null;

  const openOrders = state.orders.filter(
    (o) => o.tableId === table.id && !o.paid && o.status !== 'cancelado',
  );

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

  const defaultWaiter =
    state.staff.find((s) => s.role === 'Garçom' && s.status === 'em_turno')?.name ||
    operatorName ||
    'Equipe Salão';

  const handleSeatTable = async () => {
    setSubmitting(true);
    try {
      await onUpdateTable(table.id, {
        status: 'ocupada',
        guests: Math.min(table.seats, Math.max(1, guestsInput)),
        waiter: waiterInput.trim() || defaultWaiter,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/40">
      <div className="w-full max-w-md bg-white h-full border-l border-stone-200 flex flex-col">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-stone-500">
              {table.zone} · {table.seats} lugares
            </div>
            <h2 className="text-lg font-semibold text-stone-900 mt-0.5">{table.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel da mesa"
            className="p-2 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-stone-200 text-xs">
            <div className="flex items-center gap-4 text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-stone-400" />
                <span className="tabular-nums">
                  {table.status === 'ocupada' ? `${table.guests} clientes` : 'Sem clientes'}
                </span>
              </span>
              {table.seatedAt && (
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock className="w-4 h-4 text-stone-400" />
                  {formatElapsed(elapsed)}
                </span>
              )}
            </div>

            <select
              aria-label="Alterar status da mesa"
              value={table.status}
              onChange={(e) => onUpdateTable(table.id, { status: e.target.value as TableStatus })}
              className="px-2.5 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 rounded-md text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              <option value="livre">Livre</option>
              <option value="ocupada">Ocupada</option>
              <option value="reservada">Reservada</option>
              <option value="limpeza">Limpeza</option>
            </select>
          </div>

          {table.status !== 'ocupada' && (
            <div className="space-y-3.5 pb-5 border-b border-stone-200">
              <div className="text-sm font-semibold text-stone-900">Abrir Mesa</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Clientes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={table.seats + 2}
                    value={guestsInput}
                    onChange={(e) => setGuestsInput(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Atendente
                  </label>
                  <input
                    type="text"
                    placeholder={defaultWaiter}
                    value={waiterInput}
                    onChange={(e) => setWaiterInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSeatTable}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors disabled:opacity-50"
              >
                Ocupar Mesa
              </button>
            </div>
          )}

          {linkableOrders.length > 0 && (
            <div className="space-y-2 pb-5 border-b border-stone-200">
              <label className="block text-xs font-medium text-stone-700">
                Vincular pedido em aberto
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={orderToLinkId}
                  onChange={(e) => setOrderToLinkId(e.target.value)}
                  className="flex-1 px-2.5 py-2 text-xs border border-stone-200 rounded-md bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-800"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Vincular
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                Pedidos ({openOrders.length})
              </h3>
              <button
                type="button"
                onClick={() => onOpenOrderComposer(table.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo pedido
              </button>
            </div>

            {openOrders.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-stone-200 rounded-lg">
                <p className="text-xs text-stone-500">Nenhum pedido nesta mesa.</p>
                <button
                  type="button"
                  onClick={() => onOpenOrderComposer(table.id)}
                  className="mt-3 px-4 py-2 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors"
                >
                  Lançar Pedido
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden">
                {openOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-stone-900">{order.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {order.status === 'pendente' && 'Na Fila'}
                          {order.status === 'preparo' && 'Em Preparo'}
                          {order.status === 'pronto' && 'Pronto'}
                          {order.status === 'entregue' && 'Entregue'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {confirmCancelOrderId === order.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={async () => {
                                setSubmitting(true);
                                try {
                                  await onUpdateOrderStatus(order.id, 'cancelado');
                                  setConfirmCancelOrderId(null);
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                              className="px-2 py-0.5 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-sm disabled:opacity-50"
                            >
                              Cancelar pedido
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => setConfirmCancelOrderId(null)}
                              className="px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-stone-900"
                            >
                              Voltar
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditOrder(order)}
                              title="Editar pedido"
                              className="p-1 text-stone-400 hover:text-stone-900 rounded"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCancelOrderId(order.id)}
                              title="Cancelar pedido"
                              className="p-1 text-stone-400 hover:text-red-600 rounded"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-mono text-xs text-stone-500 mr-1.5 tabular-nums">
                              {item.quantity}×
                            </span>
                            <span className="text-stone-800">{item.name}</span>
                            {item.notes && (
                              <div className="text-xs text-amber-700 mt-0.5">Obs: {item.notes}</div>
                            )}
                          </div>
                          <span className="font-mono text-xs font-medium text-stone-900 tabular-nums shrink-0">
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

          {subtotal > 0 && (
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <label className="flex items-center justify-between text-stone-600 cursor-pointer">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeServiceFee}
                      onChange={(e) => setIncludeServiceFee(e.target.checked)}
                      className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-800"
                    />
                    Serviço (10%)
                  </span>
                  <span className="font-mono tabular-nums">{formatCurrency(serviceFee)}</span>
                </label>

                {isCheckoutMode && (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-stone-600">Desconto (R$)</span>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      step="1"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-28 px-2.5 py-1 text-right font-mono text-sm border border-stone-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
                    />
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-stone-200 text-base font-semibold text-stone-900">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {isCheckoutMode && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-medium text-stone-700">Pagamento</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors ${
                          paymentMethod === method
                            ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-stone-600 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markCleaningAfterPay}
                      onChange={(e) => setMarkCleaningAfterPay(e.target.checked)}
                      className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-800"
                    />
                    Enviar para limpeza após pagamento
                  </label>
                </div>
              )}
            </div>
          )}

          {onDeleteTable && table.status === 'livre' && openOrders.length === 0 && (
            <div className="pt-4 border-t border-stone-200">
              {confirmingDelete ? (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-2.5">
                  <p className="text-xs font-medium text-red-800">
                    Remover {table.label} do salão?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          await onDeleteTable(table.id);
                          setConfirmingDelete(false);
                          onClose();
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                    >
                      Remover
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmingDelete(false)}
                      className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-md"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover mesa
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenOrderComposer(table.id)}
            className="flex-1 py-2.5 px-4 text-xs font-medium text-stone-800 bg-white border border-stone-200 hover:bg-stone-100 rounded-md transition-colors whitespace-nowrap"
          >
            Novo Pedido
          </button>

          {subtotal > 0 && !isCheckoutMode && (
            <button
              type="button"
              onClick={() => setIsCheckoutMode(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors whitespace-nowrap"
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
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              {markCleaningAfterPay ? 'Receber e Limpar' : 'Receber e Liberar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
