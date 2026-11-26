import { useState } from 'react';
import {
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  CalendarClock,
  LayoutGrid,
  Map,
  Plus,
} from 'lucide-react';
import type { RestaurantState, RestaurantTable, TableStatus, TableZone } from '../types.ts';
import { formatCurrency, formatElapsed, getElapsedMinutes } from '../utils/format.ts';
import { Modal } from './Modal.tsx';

interface FloorPlanViewProps {
  state: RestaurantState;
  nowMs: number;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onQuickStatusChange: (tableId: string, status: TableStatus) => void;
  onAddTable: (payload: {
    number: number;
    label: string;
    zone: TableZone;
    seats: number;
  }) => Promise<void>;
}

const ZONE_FILTERS: Array<'Todas' | TableZone> = ['Todas', 'Salão Principal', 'Terraço', 'Balcão'];
const STATUS_FILTERS: Array<{ value: 'todos' | TableStatus; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'livre', label: 'Livres' },
  { value: 'ocupada', label: 'Ocupadas' },
  { value: 'reservada', label: 'Reservadas' },
  { value: 'limpeza', label: 'Limpeza' },
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
        textClass: 'text-emerald-900',
        surfaceClass: 'bg-emerald-50/40 border-emerald-700/50 hover:border-emerald-800',
        seatClass: 'bg-stone-200',
        seatActiveClass: 'bg-emerald-800',
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
        textClass: 'text-stone-500',
        surfaceClass: 'bg-stone-50 border-stone-200 hover:border-stone-300',
        seatClass: 'bg-stone-200',
        seatActiveClass: 'bg-stone-400',
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
  onAddTable,
}: FloorPlanViewProps) {
  const [zoneFilter, setZoneFilter] = useState<'Todas' | TableZone>('Todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | TableStatus>('todos');
  const [viewMode, setViewMode] = useState<'planta' | 'grade'>('planta');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newNumber, setNewNumber] = useState<number>(1);
  const [newLabel, setNewLabel] = useState('');
  const [labelEditedManually, setLabelEditedManually] = useState(false);
  const [newZone, setNewZone] = useState<TableZone>('Salão Principal');
  const [newSeats, setNewSeats] = useState<number>(4);
  const [creatingTable, setCreatingTable] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const suggestTableLabel = (num: number, zone: TableZone) => {
    const padded = String(Math.max(1, num)).padStart(2, '0');
    return zone === 'Balcão' ? `Balcão ${padded}` : `Mesa ${padded}`;
  };

  const openAddModal = (presetZone?: TableZone) => {
    const nextNum = state.tables.reduce((max, t) => Math.max(max, t.number), 0) + 1;
    const targetZone =
      presetZone || (zoneFilter !== 'Todas' ? zoneFilter : 'Salão Principal');
    setNewNumber(nextNum);
    setNewZone(targetZone);
    setNewLabel(suggestTableLabel(nextNum, targetZone));
    setLabelEditedManually(false);
    setNewSeats(targetZone === 'Balcão' ? 2 : 4);
    setCreateError(null);
    setAddModalOpen(true);
  };

  const handleCreateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const trimmedLabel = newLabel.trim() || suggestTableLabel(newNumber, newZone);
    if (newNumber < 1) {
      setCreateError('Informe um número de mesa válido.');
      return;
    }
    if (newSeats < 1 || newSeats > 20) {
      setCreateError('A capacidade deve ficar entre 1 e 20 lugares.');
      return;
    }

    setCreatingTable(true);
    try {
      await onAddTable({
        number: newNumber,
        label: trimmedLabel,
        zone: newZone,
        seats: newSeats,
      });
      setAddModalOpen(false);
      if (zoneFilter !== 'Todas' && zoneFilter !== newZone) {
        setZoneFilter(newZone);
      }
      if (statusFilter !== 'todos' && statusFilter !== 'livre') {
        setStatusFilter('todos');
      }
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Não foi possível adicionar a mesa.',
      );
    } finally {
      setCreatingTable(false);
    }
  };

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
      (o) => o.tableId === tableId && !o.paid && o.status !== 'cancelado',
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
        <div className="flex items-center justify-center gap-3 mb-1.5">
          {Array.from({ length: topSeatsCount }).map((_, idx) => {
            const isFilled = idx < occupiedSeats;
            return (
              <span
                key={`top-${idx}`}
                className={`w-6 h-2 rounded-t-sm transition-colors ${
                  isFilled ? info.seatActiveClass : info.seatClass
                }`}
              />
            );
          })}
        </div>

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
          className={`w-full rounded-lg border p-4 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 ${
            info.surfaceClass
          } ${isSelected ? 'ring-2 ring-emerald-800 border-emerald-800' : ''}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-stone-900">{table.label}</h4>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${info.textClass}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {info.label}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-stone-600 tabular-nums">
            <span>
              {table.status === 'ocupada'
                ? `${table.guests}/${table.seats} lugares`
                : `${table.seats} lugares`}
            </span>
            {table.status === 'ocupada' ? (
              <span className="font-mono text-stone-500">{formatElapsed(elapsed)}</span>
            ) : (
              <span className="text-stone-400">
                {table.status === 'reservada' ? 'Reserva' : 'Disponível'}
              </span>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200/70 flex items-center justify-between text-xs">
            {table.status === 'ocupada' || openTotal > 0 ? (
              <>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {formatCurrency(openTotal)}
                </span>
                <span className="text-stone-500 tabular-nums">
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
                className="text-xs font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
              >
                Liberar mesa
              </button>
            ) : (
              <span className="text-stone-400">Abrir ou vincular pedido</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-1.5">
          {Array.from({ length: bottomSeatsCount }).map((_, idx) => {
            const seatGlobalIndex = topSeatsCount + idx;
            const isFilled = seatGlobalIndex < occupiedSeats;
            return (
              <span
                key={`bot-${idx}`}
                className={`w-6 h-2 rounded-b-sm transition-colors ${
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
        className={`rounded-lg border p-4 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 ${
          info.surfaceClass
        } ${isSelected ? 'ring-2 ring-emerald-800 border-emerald-800' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-stone-500">{table.zone}</div>
            <h3 className="text-base font-semibold text-stone-900 mt-0.5">{table.label}</h3>
          </div>
          <div className={`inline-flex items-center gap-1 text-xs font-semibold ${info.textClass}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{info.label}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <span className="tabular-nums">
            {table.status === 'ocupada'
              ? `${table.guests}/${table.seats} lugares`
              : `${table.seats} lugares`}
          </span>

          {table.status === 'ocupada' ? (
            <span className="inline-flex items-center gap-1 font-mono text-stone-500 tabular-nums">
              <Clock className="w-3 h-3" />
              {formatElapsed(elapsed)}
            </span>
          ) : (
            <span className="text-stone-400">
              {table.waiter ? table.waiter : 'Sem garçom'}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          {table.status === 'ocupada' || openTotal > 0 ? (
            <>
              <span className="font-mono text-sm font-semibold text-stone-900 tabular-nums">
                {formatCurrency(openTotal)}
              </span>
              <span className="text-xs text-stone-500">
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
              className="text-xs font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
            >
              Liberar mesa
            </button>
          ) : (
            <span className="text-xs text-stone-400">Abrir ou vincular</span>
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
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white border border-stone-200 rounded-lg p-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-md">
            <button
              type="button"
              onClick={() => setViewMode('planta')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'planta'
                  ? 'bg-white text-stone-900 border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Planta
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grade')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'grade'
                  ? 'bg-white text-stone-900 border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grade
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-md">
            {ZONE_FILTERS.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setZoneFilter(zone)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  zoneFilter === zone
                    ? 'bg-white text-stone-900 border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-md">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st.value
                    ? 'bg-white text-stone-900 border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-600 tabular-nums">
            <span className="text-emerald-700 font-medium">{counts.livre} livres</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="text-emerald-900 font-medium">{counts.ocupada} ocupadas</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="text-amber-700 font-medium">{counts.reservada} reservadas</span>
            {unassignedOrdersCount > 0 && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="text-amber-700 font-medium">
                  {unassignedOrdersCount} sem mesa
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => openAddModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Mesa
          </button>
        </div>
      </div>

      {filteredTables.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
          <p className="text-sm font-medium text-stone-800">
            {state.tables.length === 0
              ? 'Nenhuma mesa cadastrada no salão.'
              : 'Nenhuma mesa encontrada para este filtro.'}
          </p>
          {state.tables.length === 0 ? (
            <button
              type="button"
              onClick={() => openAddModal()}
              className="mt-3 text-xs font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
            >
              Cadastrar primeira mesa
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setZoneFilter('Todas');
                setStatusFilter('todos');
              }}
              className="mt-3 text-xs font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : viewMode === 'planta' ? (
        <div className="space-y-5">
          {zonesToDisplay.map((zone) => {
            const zoneTables = filteredTables.filter((t) => t.zone === zone);
            if (zoneTables.length === 0) return null;

            return (
              <section
                key={zone}
                className="bg-white border border-stone-200 rounded-lg overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900">{zone}</h2>
                    <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                      {zoneTables.filter((t) => t.status === 'livre').length} livres ·{' '}
                      {zoneTables.filter((t) => t.status === 'ocupada').length} ocupadas ·{' '}
                      {zoneTables.reduce((s, t) => s + t.seats, 0)} assentos
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">
                    {zone === 'Salão Principal' && 'Área interna'}
                    {zone === 'Terraço' && 'Área externa'}
                    {zone === 'Balcão' && 'Atendimento rápido'}
                  </span>
                </div>

                <div className="p-5 bg-stone-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Adicionar Mesa"
        subtitle="Defina setor, identificação e lugares"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateTableSubmit} className="p-5 space-y-4">
          {createError && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Setor
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Salão Principal', 'Terraço', 'Balcão'] as TableZone[]).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => {
                    setNewZone(z);
                    if (!labelEditedManually) {
                      setNewLabel(suggestTableLabel(newNumber, z));
                    }
                  }}
                  className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-colors ${
                    newZone === z
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="new-table-number"
                className="block text-xs font-medium text-stone-700 mb-1"
              >
                Número
              </label>
              <input
                id="new-table-number"
                type="number"
                min={1}
                max={999}
                required
                value={newNumber}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  setNewNumber(val);
                  if (!labelEditedManually) {
                    setNewLabel(suggestTableLabel(val, newZone));
                  }
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="new-table-label"
                className="block text-xs font-medium text-stone-700 mb-1"
              >
                Identificação
              </label>
              <input
                id="new-table-label"
                type="text"
                required
                value={newLabel}
                onChange={(e) => {
                  setLabelEditedManually(true);
                  setNewLabel(e.target.value);
                }}
                placeholder="Ex: Mesa 01"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="new-table-seats"
                className="text-xs font-medium text-stone-700"
              >
                Lugares
              </label>
              <span className="font-mono text-xs text-stone-500 tabular-nums">
                {newSeats} {newSeats === 1 ? 'lugar' : 'lugares'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {[2, 4, 6, 8].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewSeats(preset)}
                    className={`px-3 py-2 text-xs font-mono font-medium rounded-md border transition-colors ${
                      newSeats === preset
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                id="new-table-seats"
                type="number"
                min={1}
                max={20}
                value={newSeats}
                onChange={(e) =>
                  setNewSeats(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-20 ml-auto px-3 py-2 text-sm font-mono text-center tabular-nums border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={creatingTable}
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingTable}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {creatingTable ? 'Salvando...' : 'Adicionar Mesa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
