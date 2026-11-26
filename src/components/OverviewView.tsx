import { ArrowUpRight, CheckCircle2, Clock, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import type { NavSection, Order, RestaurantState } from '../types.ts';
import { formatCurrency, formatElapsed, formatTimeShort, getElapsedMinutes } from '../utils/format.ts';

interface OverviewViewProps {
  state: RestaurantState;
  nowMs: number;
  onNavigate: (section: NavSection) => void;
  onAdvanceOrder: (orderId: string, nextStatus: Order['status']) => void;
  onSelectTable: (tableId: string) => void;
}

const STATUS_LABEL: Record<Order['status'], { text: string; tone: string }> = {
  pendente: { text: 'Na Fila', tone: 'text-amber-700' },
  preparo: { text: 'Em Preparo', tone: 'text-emerald-800' },
  pronto: { text: 'Pronto', tone: 'text-emerald-700' },
  entregue: { text: 'Entregue', tone: 'text-stone-500' },
  cancelado: { text: 'Cancelado', tone: 'text-red-600' },
};

export function OverviewView({
  state,
  nowMs,
  onNavigate,
  onAdvanceOrder,
  onSelectTable,
}: OverviewViewProps) {
  const closedRevenue = state.transactions.reduce((acc, tx) => acc + tx.total, 0);
  const openOrdersSubtotal = state.orders
    .filter((o) => !o.paid && o.status !== 'cancelado')
    .reduce(
      (sum, o) => sum + o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      0,
    );
  const totalDayProjected = closedRevenue + openOrdersSubtotal;
  const occupiedTables = state.tables.filter((t) => t.status === 'ocupada');
  const totalGuests = occupiedTables.reduce((sum, t) => sum + t.guests, 0);
  const totalSeats = state.tables.reduce((sum, t) => sum + t.seats, 0);
  const occupancyPct = totalSeats > 0 ? Math.round((totalGuests / totalSeats) * 100) : 0;

  const avgTicket =
    state.transactions.length > 0
      ? closedRevenue / state.transactions.length
      : openOrdersSubtotal > 0
        ? openOrdersSubtotal / Math.max(1, occupiedTables.length)
        : 0;

  const activeKitchenOrders = state.orders.filter(
    (o) => o.status === 'pendente' || o.status === 'preparo' || o.status === 'pronto',
  );

  const lowStockItems = state.inventory.filter((item) => item.quantity <= item.minQuantity);

  const upcomingReservations = state.reservations
    .filter((r) => r.status === 'confirmada' || r.status === 'aguardando')
    .slice(0, 4);

  const targetHours = [11, 12, 13, 14, 18, 19, 20, 21];
  const hourMap = new Map<number, number>(targetHours.map((h) => [h, 0]));
  for (const tx of state.transactions) {
    const dt = new Date(tx.closedAt);
    if (!Number.isNaN(dt.getTime())) {
      const h = dt.getHours();
      let closest = targetHours[0];
      let bestDiff = Math.abs(h - closest);
      for (const candidate of targetHours) {
        const diff = Math.abs(h - candidate);
        if (diff < bestDiff) {
          bestDiff = diff;
          closest = candidate;
        }
      }
      hourMap.set(closest, (hourMap.get(closest) || 0) + tx.total);
    }
  }
  const hourlyBuckets = targetHours.map((h) => ({
    hour: `${h}h`,
    amount: Number((hourMap.get(h) || 0).toFixed(2)),
  }));
  const maxHourly = Math.max(...hourlyBuckets.map((b) => b.amount), 0);
  const peakBucket = hourlyBuckets.reduce(
    (best, cur) => (cur.amount > best.amount ? cur : best),
    hourlyBuckets[0],
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-stone-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Faturamento do Dia</div>
          <div className="mt-1.5 text-2xl font-semibold text-stone-900 font-mono tabular-nums">
            {formatCurrency(totalDayProjected)}
          </div>
          <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
            {formatCurrency(closedRevenue)} recebido · {formatCurrency(openOrdersSubtotal)} em aberto
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Ticket Médio</div>
          <div className="mt-1.5 text-2xl font-semibold text-stone-900 font-mono tabular-nums">
            {formatCurrency(avgTicket)}
          </div>
          <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
            {state.transactions.length} contas fechadas
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Ocupação do Salão</div>
          <div className="mt-1.5 text-2xl font-semibold text-stone-900 font-mono tabular-nums">
            {occupiedTables.length}/{state.tables.length} mesas
          </div>
          <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
            {totalGuests} clientes · {occupancyPct}% dos lugares
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Na Cozinha</div>
          <div className="mt-1.5 text-2xl font-semibold text-stone-900 font-mono tabular-nums">
            {activeKitchenOrders.length} comandas
          </div>
          <div className="mt-1.5 text-xs text-stone-500 tabular-nums">
            {activeKitchenOrders.filter((o) => o.status === 'pronto').length} prontas
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-8 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Comandas em Andamento</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Pedidos ativos na cozinha e aguardando entrega
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('kds')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              Cozinha (KDS)
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeKitchenOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <UtensilsCrossed className="w-7 h-7 text-stone-300 mx-auto" />
              <p className="mt-3 text-sm font-medium text-stone-700">Sem comandas na cozinha</p>
              <p className="mt-1 text-xs text-stone-500">
                Novos pedidos do salão ou balcão aparecem aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                    <th className="py-3 pl-6 pr-3">Comanda</th>
                    <th className="py-3 px-3">Mesa / Origem</th>
                    <th className="py-3 px-3">Itens</th>
                    <th className="py-3 px-3">Tempo</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 pl-3 pr-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {activeKitchenOrders.map((order) => {
                    const elapsed = getElapsedMinutes(order.createdAt, nowMs);
                    const total = order.items.reduce(
                      (sum, item) => sum + item.unitPrice * item.quantity,
                      0,
                    );
                    const statusInfo = STATUS_LABEL[order.status];
                    const isLate = elapsed >= 25 && order.status !== 'pronto';

                    return (
                      <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 pl-6 pr-3 font-mono text-xs font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                          {order.code}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {order.tableId ? (
                            <button
                              type="button"
                              onClick={() => onSelectTable(order.tableId!)}
                              className="text-sm font-medium text-stone-900 hover:text-emerald-800 transition-colors"
                            >
                              {order.tableLabel}
                            </button>
                          ) : (
                            <span className="text-sm font-medium text-stone-900">{order.tableLabel}</span>
                          )}
                          <div className="text-xs text-stone-500">{order.waiter}</div>
                        </td>
                        <td className="py-3.5 px-3 max-w-xs">
                          <div className="text-xs text-stone-700 truncate">
                            {order.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
                              isLate ? 'text-red-600 font-semibold' : 'text-stone-600'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {formatElapsed(elapsed)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold ${statusInfo.tone}`}>
                              {statusInfo.text}
                            </span>
                            {order.status === 'pendente' && (
                              <button
                                type="button"
                                onClick={() => onAdvanceOrder(order.id, 'preparo')}
                                className="text-xs font-medium text-stone-700 hover:text-emerald-800 underline underline-offset-2"
                              >
                                Iniciar
                              </button>
                            )}
                            {order.status === 'preparo' && (
                              <button
                                type="button"
                                onClick={() => onAdvanceOrder(order.id, 'pronto')}
                                className="text-xs font-medium text-stone-700 hover:text-emerald-800 underline underline-offset-2"
                              >
                                Finalizar
                              </button>
                            )}
                            {order.status === 'pronto' && (
                              <button
                                type="button"
                                onClick={() => onAdvanceOrder(order.id, 'entregue')}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Entregar
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 pl-3 pr-6 text-right font-mono text-xs font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-stone-200 px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Movimento por Horário</h3>
                <p className="text-xs text-stone-500">Vendas encerradas no turno</p>
              </div>
              <span className="text-xs font-mono text-stone-500 tabular-nums">
                {maxHourly > 0
                  ? `Pico ${peakBucket.hour} · ${formatCurrency(peakBucket.amount)}`
                  : 'Sem vendas encerradas'}
              </span>
            </div>
            <div className="grid grid-cols-8 gap-3 items-end h-32 pt-2">
              {hourlyBuckets.map((bucket) => {
                const heightPct =
                  maxHourly > 0
                    ? Math.max(8, Math.round((bucket.amount / maxHourly) * 100))
                    : 6;
                const isPeak = maxHourly > 0 && bucket.amount === maxHourly;
                return (
                  <div key={bucket.hour} className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex items-end justify-center h-24">
                      <div
                        title={`${bucket.hour}: ${formatCurrency(bucket.amount)}`}
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[36px] rounded-t-sm transition-all duration-200 ${
                          isPeak ? 'bg-emerald-800' : 'bg-stone-200 hover:bg-stone-300'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 tabular-nums">
                      {bucket.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-sm font-semibold text-stone-900">Alertas de Estoque</h2>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-900 whitespace-nowrap"
              >
                Gerenciar
              </button>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="p-5 text-xs text-stone-500">
                Nenhum insumo abaixo do mínimo.
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {lowStockItems.map((item) => {
                  const isCritical = item.quantity <= item.minQuantity * 0.6;
                  return (
                    <li key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{item.name}</p>
                        <p className="text-xs text-stone-500">
                          {item.category} · Mín. {item.minQuantity} {item.unit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums ${
                            isCritical ? 'text-red-600' : 'text-amber-700'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {item.quantity} {item.unit}
                        </span>
                        <div className="text-[11px] text-stone-500">
                          {isCritical ? 'Crítico' : 'Baixo'}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-sm font-semibold text-stone-900">Próximas Reservas</h2>
              <button
                type="button"
                onClick={() => onNavigate('reservations')}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-900 whitespace-nowrap"
              >
                Ver agenda
              </button>
            </div>
            {upcomingReservations.length === 0 ? (
              <div className="p-5 text-xs text-stone-500">Nenhuma reserva pendente.</div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {upcomingReservations.map((res) => (
                  <li key={res.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{res.customerName}</p>
                      <p className="text-xs text-stone-500">
                        {res.guests} pessoas · {res.zonePreference}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                        {res.time}
                      </div>
                      <div
                        className={`text-[11px] font-medium ${
                          res.status === 'aguardando' ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {res.status === 'aguardando' ? 'Aguardando' : 'Confirmada'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <h2 className="text-sm font-semibold text-stone-900">Últimos Recebimentos</h2>
            </div>
            {state.transactions.length === 0 ? (
              <div className="p-5 text-xs text-stone-500">Nenhuma conta fechada hoje.</div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {state.transactions.slice(0, 4).map((tx) => (
                  <li key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-medium text-stone-900">{tx.tableLabel}</span>
                      <span className="text-stone-400 mx-1.5">·</span>
                      <span className="text-stone-500">{tx.paymentMethod}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className="font-semibold text-stone-900">{formatCurrency(tx.total)}</span>
                      <span className="text-stone-400 ml-2">{formatTimeShort(tx.closedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
