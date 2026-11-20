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
  { value: 'ativos', label: 'Ativos na Cozinha' },
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
      statusColor = 'text-teal-700';
    } else if (order.status === 'pronto') {
      statusText = 'Pronto p/ Servir';
      statusColor = 'text-emerald-700';
    } else if (order.status === 'entregue') {
      statusText = 'Entregue';
      statusColor = 'text-slate-500';
    }

    return (
      <article
        key={order.id}
        className={`bg-white border rounded-xl flex flex-col justify-between overflow-hidden ${
          isCritical ? 'border-red-300' : isWarning ? 'border-amber-300' : 'border-slate-200'
        }`}
      >
        {/* Ticket Top Metadata */}
        <div>
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-900">{order.code}</span>
                <span aria-hidden="true">·</span>
                <span>{formatTimeShort(order.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>{order.origin}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-1">{order.tableLabel}</h3>
            </div>

            <div className="text-right shrink-0">
              <div className={`text-xs font-semibold ${statusColor}`}>{statusText}</div>
              <div
                className={`mt-1 inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
                  isCritical
                    ? 'text-red-600 font-semibold'
                    : isWarning
                      ? 'text-amber-700 font-semibold'
                      : 'text-slate-500'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {formatElapsed(elapsed)}
                {isCritical && <span className="ml-1">· Atrasado</span>}
              </div>
            </div>
          </div>

          {/* Items */}
          <ul className="divide-y divide-slate-100 px-5 py-2">
            {order.items.map((item) => (
              <li key={item.id} className="py-2.5 flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums shrink-0">
                  {item.quantity}×
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">{item.name}</div>
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

        {/* Footer Action Bar */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 truncate">{order.waiter}</span>

          <div className="flex items-center gap-2 shrink-0">
            {order.status === 'pendente' && (
              <>
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => handleTransition(order.id, 'cancelado')}
                  title="Cancelar comanda"
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => handleTransition(order.id, 'preparo')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Iniciar Preparo
                </button>
              </>
            )}

            {order.status === 'preparo' && (
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => handleTransition(order.id, 'pronto')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar Pronto
              </button>
            )}

            {order.status === 'pronto' && (
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => handleTransition(order.id, 'entregue')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmar Entrega
              </button>
            )}

            {order.status === 'entregue' && (
              <span className="text-xs text-slate-500">Finalizado</span>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {KDS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.value
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs tabular-nums">
          <span className="text-amber-700 font-medium">{counts.pendente} na fila</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-teal-700 font-medium">{counts.preparo} em preparo</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-emerald-700 font-medium">{counts.pronto} prontos</span>
        </div>
      </div>

      {/* Tickets Grid */}
      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <ChefHat className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="mt-3 text-sm font-medium text-slate-800">
            Nenhuma comanda nesta etapa
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Quando novos pedidos forem enviados, as comandas aparecerão em tempo real.
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
