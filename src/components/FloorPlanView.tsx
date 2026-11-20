import { useState } from 'react';
import { Clock, Users, CheckCircle2, Sparkles, CalendarClock, LayoutGrid, Map } from 'lucide-react';
import type { RestaurantState, RestaurantTable, TableStatus, TableZone } from '../types.ts';
import { formatCurrency, formatElapsed, getElapsedMinutes } from '../utils/format.ts';

interface FloorPlanViewProps {
  state: RestaurantState;
  nowMs: number;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onQuickStatusChange: (tableId: string, status: TableStatus) => void;
}

const ZONE_FILTERS: Array<'Todas' | TableZone> = ['Todas', 'Salão Principal', 'Terraço', 'Balcão'];
const STATUS_FILTERS: Array<{ value: 'todos' | TableStatus; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'livre', label: 'Livres' },
  { value: 'ocupada', label: 'Ocupadas' },
  { value: 'reservada', label: 'Reservadas' },
  { value: 'limpeza', label: 'Em Limpeza' },
];

function getStatusDisplay(status: TableStatus) {
  switch (status) {
    case 'livre':
      return {
        label: 'Livre',
        textClass: 'text-emerald-700',
        surfaceClass: 'bg-white border-emerald-200 hover:border-emerald-400',
        seatClass: 'bg-emerald-200',
        seatActiveClass: 'bg-emerald-600',
        Icon: CheckCircle2,
      };
    case 'ocupada':
      return {
        label: 'Ocupada',
        textClass: 'text-teal-800',
        surfaceClass: 'bg-teal-50/40 border-teal-600/50 hover:border-teal-700',
        seatClass: 'bg-slate-200',
        seatActiveClass: 'bg-teal-700',
        Icon: Users,
      };
    case 'reservada':
      return {
        label: 'Reservada',
        textClass: 'text-amber-700',
        surfaceClass: 'bg-amber-50/40 border-amber-300 hover:border-amber-500',
        seatClass: 'bg-amber-200',
        seatActiveClass: 'bg-amber-600',
        Icon: CalendarClock,
      };
    case 'limpeza':
      return {
        label: 'Limpeza',
        textClass: 'text-slate-500',
        surfaceClass: 'bg-slate-50 border-slate-200 hover:border-slate-300',
        seatClass: 'bg-slate-200',
        seatActiveClass: 'bg-slate-400',
        Icon: Sparkles,
      };
  }
}

export function FloorPlanView({
  state,
  nowMs,
  selectedTableId,
  onSelectTable,
  onQuickStatusChange,
}: FloorPlanViewProps) {
  const [zoneFilter, setZoneFilter] = useState<'Todas' | TableZone>('Todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | TableStatus>('todos');
  const [viewMode, setViewMode] = useState<'planta' | 'grade'>('planta');

  const getTableOpenTotal = (tableId: string): number => {
    return state.orders
      .filter((o) => o.tableId === tableId && !o.paid && o.status !== 'cancelado')
      .reduce(
        (sum, order) =>
          sum + order.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0),
        0,
      );
  };

  const getTableActiveOrderCount = (tableId: string): number => {
    return state.orders.filter(
      (o) =>
        o.tableId === tableId &&
        !o.paid &&
        o.status !== 'cancelado',
    ).length;
  };

  const unassignedOrdersCount = state.orders.filter(
    (o) => !o.tableId && !o.paid && o.status !== 'cancelado',
  ).length;

  const filteredTables = state.tables.filter((table) => {
    if (zoneFilter !== 'Todas' && table.zone !== zoneFilter) return false;
    if (statusFilter !== 'todos' && table.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    livre: state.tables.filter((t) => t.status === 'livre').length,
    ocupada: state.tables.filter((t) => t.status === 'ocupada').length,
    reservada: state.tables.filter((t) => t.status === 'reservada').length,
    limpeza: state.tables.filter((t) => t.status === 'limpeza').length,
  };

  const renderVisualTable = (table: RestaurantTable) => {
    const info = getStatusDisplay(table.status);
    const openTotal = getTableOpenTotal(table.id);
    const orderCount = getTableActiveOrderCount(table.id);
    const elapsed = getElapsedMinutes(table.seatedAt, nowMs);
    const isSelected = selectedTableId === table.id;
    const StatusIcon = info.Icon;

    const topSeatsCount = Math.ceil(table.seats / 2);
    const bottomSeatsCount = Math.floor(table.seats / 2);
    const occupiedSeats = table.status === 'ocupada' ? table.guests : 0;

    return (
      <div key={table.id} className="flex flex-col items-center">
        {/* Top Chairs */}
        <div className="flex items-center justify-center gap-3 mb-1.5">
          {Array.from({ length: topSeatsCount }).map((_, idx) => {
            const isFilled = idx < occupiedSeats;
            return (
              <span
                key={`top-${idx}`}
                className={`w-6 h-2 rounded-t-md transition-colors ${
                  isFilled ? info.seatActiveClass : info.seatClass
                }`}
              />
            );
          })}
        </div>

        {/* Table Surface */}
        <div
          onClick={() => onSelectTable(table.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTable(table.id);
            }
          }}
          className={`w-full rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
            info.surfaceClass
          } ${isSelected ? 'ring-2 ring-teal-700 border-teal-700' : ''}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{table.label}</h4>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${info.textClass}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {info.label}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 tabular-nums">
            <span>
              {table.status === 'ocupada'
                ? `${table.guests}/${table.seats} lugares`
                : `${table.seats} lugares`}
            </span>
            {table.status === 'ocupada' ? (
              <span className="font-mono text-slate-500">{formatElapsed(elapsed)}</span>
            ) : (
              <span className="text-slate-400">
                {table.status === 'reservada' ? 'Reserva' : 'Disponível'}
              </span>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
            {table.status === 'ocupada' || openTotal > 0 ? (
              <>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(openTotal)}
                </span>
                <span className="text-slate-500 tabular-nums">
                  {orderCount} {orderCount === 1 ? 'pedido' : 'pedidos'}
                </span>
              </>
            ) : table.status === 'limpeza' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatusChange(table.id, 'livre');
                }}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
              >
                Liberar mesa
              </button>
            ) : (
              <span className="text-slate-400">Clique p/ abrir ou associar pedido</span>
            )}
          </div>
        </div>

        {/* Bottom Chairs */}
        <div className="flex items-center justify-center gap-3 mt-1.5">
          {Array.from({ length: bottomSeatsCount }).map((_, idx) => {
            const seatGlobalIndex = topSeatsCount + idx;
            const isFilled = seatGlobalIndex < occupiedSeats;
            return (
              <span
                key={`bot-${idx}`}
                className={`w-6 h-2 rounded-b-md transition-colors ${
                  isFilled ? info.seatActiveClass : info.seatClass
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderGridCard = (table: RestaurantTable) => {
    const info = getStatusDisplay(table.status);
    const openTotal = getTableOpenTotal(table.id);
    const orderCount = getTableActiveOrderCount(table.id);
    const elapsed = getElapsedMinutes(table.seatedAt, nowMs);
    const isSelected = selectedTableId === table.id;
    const StatusIcon = info.Icon;

    return (
      <div
        key={table.id}
        onClick={() => onSelectTable(table.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTable(table.id);
          }
        }}
        className={`group rounded-xl border p-5 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
          info.surfaceClass
        } ${isSelected ? 'ring-2 ring-teal-700 border-teal-700' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500">{table.zone}</div>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">{table.label}</h3>
          </div>
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${info.textClass}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{info.label}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span className="tabular-nums">
            {table.status === 'ocupada'
              ? `${table.guests}/${table.seats} lugares`
              : `${table.seats} lugares`}
          </span>

          {table.status === 'ocupada' ? (
            <span className="inline-flex items-center gap-1 font-mono text-slate-500 tabular-nums">
              <Clock className="w-3 h-3" />
              {formatElapsed(elapsed)}
            </span>
          ) : (
            <span className="text-slate-400">
              {table.waiter ? table.waiter : 'Sem garçom'}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          {table.status === 'ocupada' || openTotal > 0 ? (
            <>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {formatCurrency(openTotal)}
              </span>
              <span className="text-xs text-slate-500">
                {orderCount} {orderCount === 1 ? 'pedido ativo' : 'pedidos ativos'}
              </span>
            </>
          ) : table.status === 'limpeza' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickStatusChange(table.id, 'livre');
              }}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
            >
              Liberar mesa
            </button>
          ) : (
            <span className="text-xs text-slate-400">Clique para abrir ou associar</span>
          )}
        </div>
      </div>
    );
  };

  const zonesToDisplay: TableZone[] =
    zoneFilter === 'Todas'
      ? ['Salão Principal', 'Terraço', 'Balcão']
      : [zoneFilter];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('planta')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'planta'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Planta Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grade')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'grade'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grade Compacta
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {ZONE_FILTERS.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setZoneFilter(zone)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  zoneFilter === zone
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span className="text-emerald-700 font-medium">{counts.livre} livres</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-teal-800 font-medium">{counts.ocupada} ocupadas</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-amber-700 font-medium">{counts.reservada} reservadas</span>
          {unassignedOrdersCount > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-amber-700 font-medium">
                {unassignedOrdersCount} pedido(s) aguardando mesa
              </span>
            </>
          )}
        </div>
      </div>

      {/* Floor Content */}
      {filteredTables.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-800">Nenhuma mesa corresponde aos filtros selecionados.</p>
          <button
            type="button"
            onClick={() => {
              setZoneFilter('Todas');
              setStatusFilter('todos');
            }}
            className="mt-3 text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
          >
            Limpar filtros
          </button>
        </div>
      ) : viewMode === 'planta' ? (
        <div className="space-y-6">
          {zonesToDisplay.map((zone) => {
            const zoneTables = filteredTables.filter((t) => t.zone === zone);
            if (zoneTables.length === 0) return null;

            return (
              <section
                key={zone}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{zone}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {zoneTables.filter((t) => t.status === 'livre').length} livres ·{' '}
                      {zoneTables.filter((t) => t.status === 'ocupada').length} ocupadas ·{' '}
                      {zoneTables.reduce((s, t) => s + t.seats, 0)} assentos no setor
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {zone === 'Salão Principal' && 'Área interna'}
                    {zone === 'Terraço' && 'Área aberta'}
                    {zone === 'Balcão' && 'Atendimento rápido'}
                  </span>
                </div>

                <div className="p-6 bg-slate-50/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {zoneTables.map(renderVisualTable)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map(renderGridCard)}
        </div>
      )}
    </div>
  );
}
