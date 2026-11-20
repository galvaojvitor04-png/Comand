import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, Users } from 'lucide-react';
import type {
  RestaurantState,
  StaffMember,
  StaffRole,
  StaffSector,
  StaffShiftStatus,
} from '../types.ts';

interface StaffViewProps {
  state: RestaurantState;
  onCreateMember: (payload: Omit<StaffMember, 'id'>) => Promise<void>;
  onUpdateMember: (id: string, payload: Partial<StaffMember>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

const STATUS_FILTERS: Array<{ value: 'todos' | StaffShiftStatus; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'em_turno', label: 'Em Turno' },
  { value: 'pausa', label: 'Em Pausa' },
  { value: 'folga', label: 'Folga' },
];

const SECTOR_FILTERS: Array<'Todos' | StaffSector> = [
  'Todos',
  'Salão',
  'Cozinha',
  'Bar',
  'Caixa & Recepção',
];

const ROLES: StaffRole[] = [
  'Gerente',
  'Chef de Cozinha',
  'Garçom',
  'Bartender',
  'Caixa',
  'Hostess',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function StaffView({
  state,
  onCreateMember,
  onUpdateMember,
  onDeleteMember,
}: StaffViewProps) {
  const [statusFilter, setStatusFilter] = useState<'todos' | StaffShiftStatus>('todos');
  const [sectorFilter, setSectorFilter] = useState<'Todos' | StaffSector>('Todos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('Garçom');
  const [sector, setSector] = useState<StaffSector>('Salão');
  const [shiftLabel, setShiftLabel] = useState('11:00 – 19:00');
  const [status, setStatus] = useState<StaffShiftStatus>('em_turno');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const staffList = state.staff || [];

  const counts = {
    total: staffList.length,
    em_turno: staffList.filter((s) => s.status === 'em_turno').length,
    pausa: staffList.filter((s) => s.status === 'pausa').length,
    folga: staffList.filter((s) => s.status === 'folga').length,
  };

  const filtered = staffList.filter((member) => {
    if (statusFilter !== 'todos' && member.status !== statusFilter) return false;
    if (sectorFilter !== 'Todos' && member.sector !== sectorFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.sector.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingMember(null);
    setName('');
    setRole('Garçom');
    setSector('Salão');
    setShiftLabel('11:00 – 19:00');
    setStatus('em_turno');
    setPhone('');
    setEmail('');
    setModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member);
    setName(member.name);
    setRole(member.role);
    setSector(member.sector);
    setShiftLabel(member.shiftLabel);
    setStatus(member.status);
    setPhone(member.phone);
    setEmail(member.email || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        role,
        sector,
        shiftLabel: shiftLabel.trim() || '11:00 – 19:00',
        status,
        phone: phone.trim(),
        email: email.trim() || undefined,
      };
      if (editingMember) {
        await onUpdateMember(editingMember.id, payload);
      } else {
        await onCreateMember(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shift Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Total da Equipe</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {counts.total}
          </div>
          <div className="mt-1 text-xs text-slate-500">Colaboradores cadastrados</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Em Turno Agora</div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-700 font-mono tabular-nums">
            {counts.em_turno}
          </div>
          <div className="mt-1 text-xs text-slate-500">Ativos na operação</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Em Pausa / Intervalo</div>
          <div className="mt-1.5 text-2xl font-semibold text-amber-700 font-mono tabular-nums">
            {counts.pausa}
          </div>
          <div className="mt-1 text-xs text-slate-500">Retorno programado</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Folga na Escala</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-700 font-mono tabular-nums">
            {counts.folga}
          </div>
          <div className="mt-1 text-xs text-slate-500">Fora do turno hoje</div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {SECTOR_FILTERS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSectorFilter(sec)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sectorFilter === sec
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaborador ou função..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Integrante
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              Nenhum integrante encontrado para este filtro.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
            >
              Cadastrar colaborador
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Colaborador</th>
                  <th className="py-3 px-3">Função / Setor</th>
                  <th className="py-3 px-3">Escala do Turno</th>
                  <th className="py-3 px-3">Atendimento Hoje</th>
                  <th className="py-3 px-3">Situação</th>
                  <th className="py-3 pl-3 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((member) => {
                  const activeTables = state.tables.filter(
                    (t) => t.status === 'ocupada' && t.waiter === member.name,
                  ).length;
                  const handledOrders = state.orders.filter(
                    (o) => o.waiter === member.name && o.status !== 'cancelado',
                  ).length;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 font-display text-xs font-semibold flex items-center justify-center shrink-0">
                            {getInitials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">{member.name}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              {member.phone || member.email || 'Sem contato'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{member.role}</div>
                        <div className="text-xs text-slate-500">{member.sector}</div>
                      </td>

                      <td className="py-4 px-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {member.shiftLabel}
                      </td>

                      <td className="py-4 px-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {activeTables > 0 || handledOrders > 0 ? (
                          <span>
                            {activeTables} {activeTables === 1 ? 'mesa ativa' : 'mesas ativas'} ·{' '}
                            {handledOrders} {handledOrders === 1 ? 'pedido' : 'pedidos'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sem atribuição direta</span>
                        )}
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        <select
                          aria-label={`Situação de ${member.name}`}
                          value={member.status}
                          onChange={(e) =>
                            onUpdateMember(member.id, {
                              status: e.target.value as StaffShiftStatus,
                            })
                          }
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 ${
                            member.status === 'em_turno'
                              ? 'border-emerald-200 text-emerald-700'
                              : member.status === 'pausa'
                                ? 'border-amber-200 text-amber-700'
                                : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="em_turno">Em Turno</option>
                          <option value="pausa">Em Pausa</option>
                          <option value="folga">Folga</option>
                        </select>
                      </td>

                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            title="Editar colaborador"
                            className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMember(member.id)}
                            title="Remover colaborador"
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingMember ? 'Editar Integrante' : 'Novo Integrante da Equipe'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Juliana Ferreira"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cargo / Função
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Setor
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value as StaffSector)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Salão">Salão</option>
                    <option value="Cozinha">Cozinha</option>
                    <option value="Bar">Bar</option>
                    <option value="Caixa & Recepção">Caixa & Recepção</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Horário do turno
                  </label>
                  <input
                    type="text"
                    required
                    value={shiftLabel}
                    onChange={(e) => setShiftLabel(e.target.value)}
                    placeholder="11:00 – 19:00"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Situação atual
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StaffShiftStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="em_turno">Em Turno</option>
                    <option value="pausa">Em Pausa</option>
                    <option value="folga">Folga</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@restaurante.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
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
                  {saving ? 'Salvando...' : editingMember ? 'Salvar Alterações' : 'Adicionar à Equipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
