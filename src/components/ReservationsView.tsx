import { useState } from 'react';
import { Plus, Search, CheckCircle2, XCircle, X, Users, Calendar } from 'lucide-react';
import type { Reservation, ReservationStatus, RestaurantState, TableZone } from '../types.ts';

interface ReservationsViewProps {
  state: RestaurantState;
  onCreateReservation: (payload: Omit<Reservation, 'id' | 'status'>) => Promise<void>;
  onUpdateReservation: (
    id: string,
    payload: { status?: ReservationStatus; tableId?: string | null },
  ) => Promise<void>;
}

const STATUS_FILTERS: Array<{ value: 'todas' | ReservationStatus; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'sentada', label: 'Sentadas' },
  { value: 'cancelada', label: 'Canceladas' },
];

export function ReservationsView({
  state,
  onCreateReservation,
  onUpdateReservation,
}: ReservationsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'todas' | ReservationStatus>('todas');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState('2');
  const [time, setTime] = useState('20:00');
  const [zonePreference, setZonePreference] = useState<TableZone>('Salão Principal');
  const [tableId, setTableId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const freeTables = state.tables.filter((t) => t.status === 'livre' || t.status === 'reservada');

  const filtered = state.reservations.filter((res) => {
    if (statusFilter !== 'todas' && res.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        res.customerName.toLowerCase().includes(q) ||
        res.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    setSaving(true);
    try {
      await onCreateReservation({
        customerName: customerName.trim(),
        phone: phone.trim(),
        guests: Math.max(1, Number(guests) || 2),
        time,
        date: new Date().toISOString().slice(0, 10),
        zonePreference,
        tableId: tableId || null,
        notes: notes.trim() || undefined,
      });
      setModalOpen(false);
      setCustomerName('');
      setPhone('');
      setNotes('');
      setTableId('');
    } finally {
      setSaving(false);
    }
  };

  const handleSeatReservation = async (res: Reservation) => {
    let targetTableId = res.tableId;
    if (!targetTableId) {
      const candidate =
        state.tables.find(
          (t) =>
            (t.status === 'livre' || t.status === 'reservada') &&
            t.zone === res.zonePreference &&
            t.seats >= res.guests,
        ) ||
        state.tables.find((t) => t.status === 'livre' && t.seats >= res.guests) ||
        state.tables.find((t) => t.status === 'livre');

      if (candidate) {
        targetTableId = candidate.id;
      }
    }
    await onUpdateReservation(res.id, {
      status: 'sentada',
      tableId: targetTableId || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente ou telefone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Reserva
          </button>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="mt-3 text-sm font-medium text-slate-800">Nenhuma reserva encontrada.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
            >
              Agendar nova reserva
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Horário</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Lugares</th>
                  <th className="py-3 px-3">Ambiente / Mesa</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((res) => {
                  const assignedTable = res.tableId
                    ? state.tables.find((t) => t.id === res.tableId)
                    : null;

                  let statusText = 'Confirmada';
                  let statusTone = 'text-emerald-700';
                  if (res.status === 'aguardando') {
                    statusText = 'Aguardando';
                    statusTone = 'text-amber-700';
                  } else if (res.status === 'sentada') {
                    statusText = 'Sentada';
                    statusTone = 'text-teal-700';
                  } else if (res.status === 'cancelada') {
                    statusText = 'Cancelada';
                    statusTone = 'text-slate-400';
                  }

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-mono text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {res.time}
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-medium text-slate-900">{res.customerName}</div>
                        <div className="text-xs text-slate-500 font-mono">{res.phone || 'Sem telefone'}</div>
                        {res.notes && (
                          <div className="text-xs text-amber-700 mt-1">{res.notes}</div>
                        )}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 tabular-nums">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {res.guests} pessoas
                        </span>
                      </td>
                      <td className="py-4 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {res.zonePreference}
                        {assignedTable && (
                          <span className="text-slate-900 font-medium"> · {assignedTable.label}</span>
                        )}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${statusTone}`}>{statusText}</span>
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        {(res.status === 'confirmada' || res.status === 'aguardando') && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSeatReservation(res)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Sentar Mesa
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateReservation(res.id, { status: 'cancelada' })}
                              title="Cancelar reserva"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* New Reservation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Agendar Nova Reserva</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome completo do cliente
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Fernanda Oliveira"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Horário
                    </label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pessoas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      required
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full px-2.5 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferência de ambiente
                  </label>
                  <select
                    value={zonePreference}
                    onChange={(e) => setZonePreference(e.target.value as TableZone)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Salão Principal">Salão Principal</option>
                    <option value="Terraço">Terraço</option>
                    <option value="Balcão">Balcão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pré-alocar mesa (opcional)
                  </label>
                  <select
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="">Definir na chegada</option>
                    {freeTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.seats} lug.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observações (alergias, ocasião especial)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Cadeira infantil, aniversário..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
