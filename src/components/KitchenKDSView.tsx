import { useState } from 'react';
import { Clock, CheckCircle2, Flame, XCircle, ChefHat } from 'lucide-react';
import type { Order, OrderStatus, RestaurantState } from '../types.ts';
import { formatElapsed, formatTimeShort, getElapsedMinutes } from '../utils/format.ts';

interface KitchenKDSViewProps {
  state: RestaurantState;
  nowMs: number;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

type KdsFilter = 'ativos' | 'pendente' | 'preparo' | 'pronto' | 'entregue';

const KDS_TABS: Array<{ value: KdsFilter; label: string }> = [
  { value: 'ativos', label: 'Ativos' },
  { value: 'pendente', label: 'Na Fila' },
  { value: 'preparo', label: 'Em Preparo' },
  { value: 'pronto', label: 'Prontos' },
  { value: 'entregue', label: 'Entregues' },
];

export function KitchenKDSView({
  state,
  nowMs,
  onUpdateOrderStatus,
}: KitchenKDSViewProps) {
  const [filter, setFilter] = useState<KdsFilter>('ativos');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const orders = state.orders.filter((order) => {
    if (order.status === 'cancelado') return false;
    if (filter === 'ativos') {
      return order.status === 'pendente' || order.status === 'preparo' || order.status === 'pronto';
    }
    return order.status === filter;
  });

  const counts = {
    pendente: state.orders.filter((o) => o.status === 'pendente').length,
    preparo: state.orders.filter((o) => o.status === 'preparo').length,
    pronto: state.orders.filter((o) => o.status === 'pronto').length,
  };

  const handleTransition = async (orderId: string, status: OrderStatus) => {
    setBusyId(orderId);
    try {
      await onUpdateOrderStatus(orderId, status);
    } finally {
      setBusyId(null);
    }
  };

  const renderTicket = (order: Order) => {
    const elapsed = getElapsedMinutes(order.createdAt, nowMs);
    const isWarning = elapsed >= 15 && elapsed < 25 && order.status !== 'pronto' && order.status !== 'entregue';
    const isCritical = elapsed >= 25 && order.status !== 'pronto' && order.status !== 'entregue';

    let statusText = 'Na Fila';
    let statusColor = 'text-amber-700';
    if (order.status === 'preparo') {
      statusText = 'Em Preparo';
      statusColor = 'text-emerald-800';
    } else if (order.status === 'pronto') {
      statusText = 'Pronto';
      statusColor = 'text-emerald-800';
    } else if (order.status === 'entregue') {
      statusText = 'Entregue';
      statusColor = 'text-stone-500';
    }

    return (
      <article
        key={order.id}
        className={`bg-white border rounded-lg flex flex-col justify-between overflow-hidden ${
          isCritical ? 'border-red-300' : isWarning ? 'border-amber-300' : 'border-stone-200'
        }`}
      >
        <div>
          <div className="px-5 py-4 border-b border-stone-100 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-mono font-semibold text-stone-900">{order.code}</span>
                <span aria-hidden="true">·</span>
                <span>{formatTimeShort(order.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>{order.origin}</span>
              </div>
              <h3 className="text-base font-semibold text-stone-900 mt-1">{order.tableLabel}</h3>
            </div>

            <div className="text-right shrink-0">
              <div className={`text-xs font-semibold ${statusColor}`}>{statusText}</div>
              <div
                className={`mt-1 inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
                  isCritical
                    ? 'text-red-600 font-semibold'
                    : isWarning
                      ? 'text-amber-700 font-semibold'
                      : 'text-stone-500'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {formatElapsed(elapsed)}
                {isCritical && <span className="ml-1">· Atrasado</span>}
              </div>
            </div>
          </div>

          <ul className="divide-y divide-stone-100 px-5 py-2">
            {order.items.map((item) => (
              <li key={item.id} className="py-2.5 flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-sm tabular-nums shrink-0">
                  {item.quantity}×
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900">{item.name}</div>
                  {item.notes && (
                    <div className="text-xs font-medium text-amber-700 mt-0.5">
                      Obs: {item.notes}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-3.5 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between gap-2">
          <span className="text-xs text-stone-500 truncate">{order.waiter}</span>

          <div className="flex items-center gap-2 shrink-0">
            {confirmCancelId === order.id ? (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={async () => {
                    await handleTransition(order.id, 'cancelado');
                    setConfirmCancelId(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => setConfirmCancelId(null)}
                  className="px-2 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <>
                {!order.paid && (order.status === 'pendente' || order.status === 'preparo') && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => setConfirmCancelId(order.id)}
                    title="Cancelar comanda"
                    className="p-2 text-stone-400 hover:text-red-600 rounded-md transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}

                {order.status === 'pendente' && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => handleTransition(order.id, 'preparo')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Iniciar
                  </button>
                )}

                {order.status === 'preparo' && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => handleTransition(order.id, 'pronto')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pronto
                  </button>
                )}
              </>
            )}

            {order.status === 'pronto' && (
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => handleTransition(order.id, 'entregue')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Entregue
              </button>
            )}

            {order.status === 'entregue' && (
              <span className="text-xs text-stone-500">Finalizado</span>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-md">
          {KDS_TABS.map((tab) => (
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

        <div className="flex items-center gap-3 text-xs tabular-nums">
          <span className="text-amber-700 font-medium">{counts.pendente} na fila</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="text-emerald-800 font-medium">{counts.preparo} em preparo</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="text-stone-700 font-medium">{counts.pronto} prontos</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-16 text-center">
          <ChefHat className="w-9 h-9 text-stone-300 mx-auto" />
          <p className="mt-3 text-sm font-medium text-stone-800">
            Nenhuma comanda nesta etapa
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Os pedidos enviados para a cozinha aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {orders.map(renderTicket)}
        </div>
      )}
    </div>
  );
}
