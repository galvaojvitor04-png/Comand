import { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import type { NavSection, RestaurantState, StaffMember, StaffRole } from '../types.ts';
import { formatTimeShort } from '../utils/format.ts';

interface AccessPanelViewProps {
  state: RestaurantState;
  currentOperator: StaffMember;
  onLockTerminal: (preselectedStaffId?: string) => void;
  onUpdateStaffAccess: (
    staffId: string,
    payload: { pin?: string; accessEnabled?: boolean },
  ) => Promise<void>;
  onUpdateRolePermissions: (role: StaffRole, modules: NavSection[]) => Promise<void>;
  onResetSystem: () => Promise<void>;
}

const ALL_ROLES: StaffRole[] = [
  'Gerente',
  'Chef de Cozinha',
  'Garçom',
  'Bartender',
  'Caixa',
  'Hostess',
];

const MODULE_COLUMNS: Array<{ id: NavSection; label: string }> = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'pdv', label: 'PDV' },
  { id: 'cash', label: 'Caixa' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'floor', label: 'Mesas' },
  { id: 'kds', label: 'Cozinha' },
  { id: 'menu', label: 'Cardápio' },
  { id: 'reservations', label: 'Reservas' },
  { id: 'inventory', label: 'Estoque' },
  { id: 'staff', label: 'Equipe' },
  { id: 'access', label: 'Acesso' },
];

export function AccessPanelView({
  state,
  currentOperator,
  onLockTerminal,
  onUpdateStaffAccess,
  onUpdateRolePermissions,
  onResetSystem,
}: AccessPanelViewProps) {
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const staffList = state.staff || [];
  const enabledCount = staffList.filter((s) => s.accessEnabled !== false).length;
  const blockedCount = staffList.length - enabledCount;
  const permissions = state.rolePermissions;
  const logs = state.accessLogs || [];

  const toggleReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startPinEdit = (member: StaffMember) => {
    setEditingPinId(member.id);
    const isManager = member.id === 's1' || member.role === 'Gerente';
    setPinDraft(isManager ? '' : member.pin || '');
  };

  const savePin = async (staffId: string) => {
    const cleaned = pinDraft.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) return;
    setBusyKey(staffId);
    try {
      await onUpdateStaffAccess(staffId, { pin: cleaned });
      setEditingPinId(null);
    } finally {
      setBusyKey(null);
    }
  };

  const toggleAccess = async (member: StaffMember) => {
    if (member.id === 's1') return; // General Manager always remains active
    setBusyKey(member.id);
    try {
      await onUpdateStaffAccess(member.id, {
        accessEnabled: member.accessEnabled === false,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const toggleModulePermission = async (role: StaffRole, moduleId: NavSection) => {
    if (role === 'Gerente' && (moduleId === 'access' || moduleId === 'staff' || moduleId === 'overview')) {
      return;
    }
    const current = permissions[role] || [];
    const exists = current.includes(moduleId);
    const updated = exists
      ? current.filter((m) => m !== moduleId)
      : [...current, moduleId];

    setBusyKey(`${role}:${moduleId}`);
    try {
      await onUpdateRolePermissions(role, updated);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Access KPI & Lock Terminal Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Operador Conectado</div>
          <div className="mt-1.5 text-base font-semibold text-slate-900 truncate">
            {currentOperator.name}
          </div>
          <div className="mt-1 text-xs text-teal-700 font-medium">
            {currentOperator.role} · {currentOperator.sector}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Credenciais Ativas</div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-700 font-mono tabular-nums">
            {enabledCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Operadores com PIN liberado</div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Acessos Bloqueados</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {blockedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Sem permissão de entrada</div>
        </div>

        <div className="p-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-500">Terminal de Acesso</div>
            <div className="mt-1 text-xs text-slate-600">Trocar usuário via PIN</div>
          </div>
          <button
            type="button"
            onClick={() => onLockTerminal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear Terminal
          </button>
        </div>
      </section>

      {/* Section 1: Operator PINs & Status */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Credenciais e PINs da Equipe
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o PIN de 4 dígitos de cada operador e libere ou bloqueie o acesso ao terminal
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-6 pr-3">Operador</th>
                <th className="py-3 px-3">Cargo</th>
                <th className="py-3 px-3">PIN de Acesso</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 pl-3 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {staffList.map((member) => {
                const isEnabled = member.accessEnabled !== false;
                const isRevealed = !!revealedPins[member.id];
                const isEditing = editingPinId === member.id;
                const isGM = member.id === 's1';

                return (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 pl-6 pr-3">
                      <div className="font-medium text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.sector}</div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                      {member.role}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-2">
                          <input
                            type={isGM || member.role === 'Gerente' ? 'password' : 'text'}
                            inputMode="numeric"
                            maxLength={4}
                            value={pinDraft}
                            onChange={(e) =>
                              setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))
                            }
                            placeholder="4 dígitos"
                            className="w-20 px-2.5 py-1 text-xs font-mono border border-teal-700 rounded-md tabular-nums focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={pinDraft.length !== 4 || busyKey === member.id}
                            onClick={() => savePin(member.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md disabled:opacity-40"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPinId(null)}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : isGM || member.role === 'Gerente' ? (
                        <div className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span className="text-slate-900 font-semibold tracking-widest">
                            ••••
                          </span>
                          <span className="font-sans text-[11px] text-slate-400">
                            Sigiloso
                          </span>
                          <button
                            type="button"
                            onClick={() => startPinEdit(member)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
                          >
                            <KeyRound className="w-3 h-3" />
                            Alterar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span className="text-slate-900 font-semibold tracking-widest">
                            {isRevealed ? member.pin || '••••' : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReveal(member.id)}
                            title={isRevealed ? 'Ocultar PIN' : 'Mostrar PIN'}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded"
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => startPinEdit(member)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
                          >
                            <KeyRound className="w-3 h-3" />
                            Alterar
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          isEnabled ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {isEnabled ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                        {isEnabled ? 'Liberado' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => onLockTerminal(member.id)}
                            className="text-xs font-medium text-slate-700 hover:text-teal-700 underline underline-offset-2"
                          >
                            Entrar como operador
                          </button>
                        )}
                        {!isGM ? (
                          <button
                            type="button"
                            disabled={busyKey === member.id}
                            onClick={() => toggleAccess(member)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              isEnabled
                                ? 'border-slate-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {isEnabled ? 'Bloquear' : 'Liberar'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Admin principal</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Role Permissions Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Matriz de Permissões por Cargo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle quais módulos do sistema ficam visíveis para cada função durante o turno
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-6 pr-4">Cargo</th>
                {MODULE_COLUMNS.map((mod) => (
                  <th key={mod.id} className="py-3 px-2.5 text-center whitespace-nowrap">
                    {mod.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {ALL_ROLES.map((role) => {
                const roleModules = permissions[role] || [];
                return (
                  <tr key={role} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-6 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      {role}
                    </td>
                    {MODULE_COLUMNS.map((mod) => {
                      const checked = roleModules.includes(mod.id);
                      const locked =
                        role === 'Gerente' &&
                        (mod.id === 'access' || mod.id === 'staff' || mod.id === 'overview');

                      return (
                        <td key={mod.id} className="py-3.5 px-2.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${role} acessar ${mod.label}`}
                            checked={checked}
                            disabled={locked || busyKey === `${role}:${mod.id}`}
                            onChange={() => toggleModulePermission(role, mod.id)}
                            className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700 disabled:opacity-50 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Recent Access Audit Trail */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Registro de Acessos Recentes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auditoria de entradas, trocas de operador, bloqueios e alterações de permissão
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum evento de acesso registrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Horário</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3">Cargo</th>
                  <th className="py-3 pl-3 pr-6">Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.slice(0, 12).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-6 pr-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {formatTimeShort(log.timestamp)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {log.staffName}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {log.role}
                    </td>
                    <td
                      className={`py-3 pl-3 pr-6 ${
                        log.action === 'acesso_bloqueado'
                          ? 'text-red-600 font-medium'
                          : 'text-slate-700'
                      }`}
                    >
                      {log.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 4: Limpeza Completa do Sistema */}
      {currentOperator.role === 'Gerente' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Limpar Dados do Sistema
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Apaga todas as mesas, cardápio, pedidos, reservas, estoque, vendas, caixas e reinicia para o cadastro do Gerente Geral.
            </p>
          </div>

          {!confirmingReset ? (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Todos os Dados
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 mr-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Confirmar limpeza total?
              </span>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={async () => {
                  setResetting(true);
                  try {
                    await onResetSystem();
                    setConfirmingReset(false);
                  } finally {
                    setResetting(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40"
              >
                {resetting ? 'Limpando...' : 'Sim, Limpar Tudo'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
