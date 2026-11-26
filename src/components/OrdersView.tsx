import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  XCircle,
  ClipboardList,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { Order, OrderStatus, RestaurantState } from '../types.ts';
import { formatCurrency, formatElapsed, formatTimeShort, getElapsedMinutes } from '../utils/format.ts';
import { Modal } from './Modal.tsx';

interface OrdersViewProps {
  state: RestaurantState;
  nowMs: number;
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    options?: { cancelReason?: string; releaseTableIfEmpty?: boolean },
  ) => Promise<void>;
  onAssignTable: (orderId: string, tableId: string | null) => Promise<void>;
}

type OrderFilter = 'ativos' | 'todos' | OrderStatus;

const STATUS_TABS: Array<{ value: OrderFilter; label: string }> = [
  { value: 'ativos', label: 'Em Aberto' },
  { value: 'pendente', label: 'Na Fila' },
  { value: 'preparo', label: 'Preparo' },
  { value: 'pronto', label: 'Prontos' },
  { value: 'entregue', label: 'Entregues' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: 'todos', label: 'Todos' },
];

const STATUS_META: Record<OrderStatus, { label: string; tone: string }> = {
  pendente: { label: 'Na Fila', tone: 'text-amber-700' },
  preparo: { label: 'Em Preparo', tone: 'text-emerald-800' },
  pronto: { label: 'Pronto', tone: 'text-emerald-700' },
  entregue: { label: 'Entregue', tone: 'text-stone-500' },
  cancelado: { label: 'Cancelado', tone: 'text-red-600' },
};

const CANCEL_REASON_PRESETS = [
  'Erro de lançamento',
  'Cliente desistiu',
  'Item indisponível',
  'Demora no preparo',
];

export function OrdersView({
  state,
  nowMs,
  onNewOrder,
  onEditOrder,
  onUpdateOrderStatus,
  onAssignTable,
}: OrdersViewProps) {
  const [filter, setFilter] = useState<OrderFilter>('ativos');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [releaseTableIfEmpty, setReleaseTableIfEmpty] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = state.orders.filter((order) => {
    if (filter === 'ativos') {
      if (order.status === 'cancelado' || order.paid) return false;
    } else if (filter !== 'todos' && order.status !== filter) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchItems = order.items.some((it) => it.name.toLowerCase().includes(q));
      return (
        order.code.toLowerCase().includes(q) ||
        order.tableLabel.toLowerCase().includes(q) ||
        order.waiter.toLowerCase().includes(q) ||
        matchItems
      );
    }
    return true;
  });

  const activeTotal = state.orders
    .filter((o) => !o.paid && o.status !== 'cancelado')
    .reduce(
      (sum, o) => sum + o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      0,
    );

  const isLastOpenOrderOnTable = (order: Order | null): boolean => {
    if (!order?.tableId) return false;
    return !state.orders.some(
      (o) =>
        o.id !== order.id &&
        o.tableId === order.tableId &&
        !o.paid &&
        o.status !== 'cancelado',
    );
  };

  const openCancelModal = (order: Order) => {
    setCancelTarget(order);
    setCancelReason('');
    setReleaseTableIfEmpty(isLastOpenOrderOnTable(order));
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      await onUpdateOrderStatus(cancelTarget.id, 'cancelado', {
        cancelReason: cancelReason.trim() || undefined,
        releaseTableIfEmpty:
          isLastOpenOrderOnTable(cancelTarget) && releaseTableIfEmpty,
      });
      setCancelTarget(null);
      setCancelReason('');
    } finally {
      setBusyId(null);
    }
  };

  const handleReopenOrder = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await onUpdateOrderStatus(orderId, 'pendente');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white border border-stone-200 rounded-lg p-3.5">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-md">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.value
                  ? 'bg-white text-stone-900 border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comanda, mesa ou prato..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <button
            type="button"
            onClick={onNewOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Pedido
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-6 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <span>{filtered.length} pedidos</span>
          <span className="font-mono tabular-nums">
            Em aberto: <strong className="text-stone-900">{formatCurrency(activeTotal)}</strong>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-7 h-7 text-stone-300 mx-auto" />
            <p className="mt-3 text-sm font-medium text-stone-800">
              Nenhum pedido encontrado.
            </p>
            <button
              type="button"
              onClick={onNewOrder}
              className="mt-3 text-xs font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
            >
              Lançar pedido
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                  <th className="py-3 pl-6 pr-3">Comanda</th>
                  <th className="py-3 px-3">Mesa</th>
                  <th className="py-3 px-3">Itens</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 pl-3 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filtered.map((order) => {
                  const total = order.items.reduce(
                    (sum, it) => sum + it.unitPrice * it.quantity,
                    0,
                  );
                  const statusMeta = STATUS_META[order.status];
                  const elapsed = getElapsedMinutes(order.createdAt, nowMs);
                  const canEdit = !order.paid && order.status !== 'cancelado';

                  return (
                    <tr key={order.id} className="hover:bg-stone-50/80 transition-colors align-top">
                      <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                          {order.code}
                        </div>
                        <div className="text-xs text-stone-500 font-mono tabular-nums mt-0.5">
                          {formatTimeShort(order.createdAt)} · {formatElapsed(elapsed)}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {order.origin} · {order.waiter}
                        </div>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        {canEdit ? (
                          <select
                            aria-label={`Associar mesa ao pedido ${order.code}`}
                            value={order.tableId || ''}
                            onChange={(e) =>
                              onAssignTable(order.id, e.target.value || null)
                            }
                            className="px-2.5 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 rounded-md text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                          >
                            <option value="">Sem mesa (Balcão)</option>
                            {state.tables.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label} ({t.zone})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-stone-700">
                            {order.tableLabel}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3 max-w-md">
                        <ul className="space-y-1">
                          {order.items.map((item) => (
                            <li key={item.id} className="text-xs text-stone-800">
                              <span className="font-mono font-semibold text-stone-900 tabular-nums mr-1.5">
                                {item.quantity}×
                              </span>
                              <span>{item.name}</span>
                              {item.notes && (
                                <span className="text-amber-700 ml-1.5">
                                  ({item.notes})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        <div className={`text-xs font-semibold ${statusMeta.tone}`}>
                          {statusMeta.label}
                          {order.paid && ' · Pago'}
                        </div>
                        {order.status === 'cancelado' && order.cancelReason && (
                          <div className="text-[11px] text-red-600/80 mt-0.5 max-w-[180px] truncate" title={order.cancelReason}>
                            Motivo: {order.cancelReason}
                          </div>
                        )}
                        {canEdit && (
                          <div className="mt-1.5 flex items-center gap-2">
                            {order.status === 'pendente' && (
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(order.id, 'preparo')}
                                className="text-[11px] font-medium text-stone-600 hover:text-emerald-800 underline underline-offset-2"
                              >
                                Iniciar preparo
                              </button>
                            )}
                            {order.status === 'preparo' && (
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(order.id, 'pronto')}
                                className="text-[11px] font-medium text-stone-600 hover:text-emerald-700 underline underline-offset-2"
                              >
                                Marcar pronto
                              </button>
                            )}
                            {order.status === 'pronto' && (
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(order.id, 'entregue')}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Entregue
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right font-mono text-sm font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(total)}
                      </td>

                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditOrder(order)}
                              title="Editar pedido"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => openCancelModal(order)}
                              title="Cancelar pedido"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                          </div>
                        ) : order.status === 'cancelado' && !order.paid ? (
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => handleReopenOrder(order.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reabrir
                          </button>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget ? `Cancelar Pedido ${cancelTarget.code}` : ''}
        subtitle={
          cancelTarget
            ? `${cancelTarget.tableLabel} · ${cancelTarget.items.length} ${
                cancelTarget.items.length === 1 ? 'item' : 'itens'
              } · ${formatCurrency(
                cancelTarget.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
              )}`
            : undefined
        }
      >
        {cancelTarget && (
          <form onSubmit={handleConfirmCancel} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Motivo (opcional)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CANCEL_REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      cancelReason === preset
                        ? 'border-red-300 bg-red-50 text-red-700 font-medium'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo..."
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {isLastOpenOrderOnTable(cancelTarget) && (
              <label className="flex items-start gap-2.5 p-3 rounded-md bg-stone-50 border border-stone-200 text-xs text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseTableIfEmpty}
                  onChange={(e) => setReleaseTableIfEmpty(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span>
                  Liberar <strong className="text-stone-900">{cancelTarget.tableLabel}</strong>{' '}
                  automaticamente ao cancelar.
                </span>
              </label>
            )}

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={busyId === cancelTarget.id}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-md"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={busyId === cancelTarget.id}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                {busyId === cancelTarget.id ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
