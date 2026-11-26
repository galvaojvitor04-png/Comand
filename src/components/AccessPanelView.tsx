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
    if (member.id === 's1') return;
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
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-stone-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Operador Atual</div>
          <div className="mt-1.5 text-base font-semibold text-stone-900 truncate">
            {currentOperator.name}
          </div>
          <div className="mt-1 text-xs text-emerald-800 font-medium">
            {currentOperator.role} · {currentOperator.sector}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Acessos Liberados</div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-800 font-mono tabular-nums">
            {enabledCount}
          </div>
          <div className="mt-1 text-xs text-stone-500">Com PIN ativo</div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-stone-500">Bloqueados</div>
          <div className="mt-1.5 text-2xl font-semibold text-stone-900 font-mono tabular-nums">
            {blockedCount}
          </div>
          <div className="mt-1 text-xs text-stone-500">Sem acesso</div>
        </div>

        <div className="p-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-stone-500">Terminal</div>
            <div className="mt-1 text-xs text-stone-600">Trocar usuário</div>
          </div>
          <button
            type="button"
            onClick={() => onLockTerminal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear
          </button>
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              PINs da Equipe
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Gerencie os códigos de 4 dígitos e liberação de acesso
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                <th className="py-3 pl-5 pr-3">Operador</th>
                <th className="py-3 px-3">Cargo</th>
                <th className="py-3 px-3">PIN</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 pl-3 pr-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {staffList.map((member) => {
                const isEnabled = member.accessEnabled !== false;
                const isRevealed = !!revealedPins[member.id];
                const isEditing = editingPinId === member.id;
                const isGM = member.id === 's1';

                return (
                  <tr key={member.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="font-medium text-stone-900">{member.name}</div>
                      <div className="text-xs text-stone-500">{member.sector}</div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-stone-700 whitespace-nowrap">
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
                            className="w-20 px-2.5 py-1 text-xs font-mono border border-emerald-800 rounded-md tabular-nums focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={pinDraft.length !== 4 || busyKey === member.id}
                            onClick={() => savePin(member.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-md disabled:opacity-40"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPinId(null)}
                            className="text-xs text-stone-500 hover:text-stone-900"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : isGM || member.role === 'Gerente' ? (
                        <div className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span className="text-stone-900 font-semibold tracking-widest">
                            ••••
                          </span>
                          <span className="font-sans text-[11px] text-stone-400">
                            Sigiloso
                          </span>
                          <button
                            type="button"
                            onClick={() => startPinEdit(member)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
                          >
                            <KeyRound className="w-3 h-3" />
                            Alterar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span className="text-stone-900 font-semibold tracking-widest">
                            {isRevealed ? member.pin || '••••' : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReveal(member.id)}
                            title={isRevealed ? 'Ocultar PIN' : 'Mostrar PIN'}
                            className="p-1 text-stone-400 hover:text-stone-800 rounded-sm"
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
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
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
                          isEnabled ? 'text-emerald-800' : 'text-red-600'
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
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => onLockTerminal(member.id)}
                            className="text-xs font-medium text-stone-700 hover:text-emerald-800 underline underline-offset-2"
                          >
                            Entrar como operador
                          </button>
                        )}
                        {!isGM ? (
                          <button
                            type="button"
                            disabled={busyKey === member.id}
                            onClick={() => toggleAccess(member)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                              isEnabled
                                ? 'border-stone-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {isEnabled ? 'Bloquear' : 'Liberar'}
                          </button>
                        ) : (
                          <span className="text-xs text-stone-400">Admin principal</span>
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

      <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-900">
            Permissões por Cargo
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Defina quais módulos cada função pode acessar
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                <th className="py-3 pl-5 pr-4">Cargo</th>
                {MODULE_COLUMNS.map((mod) => (
                  <th key={mod.id} className="py-3 px-2.5 text-center whitespace-nowrap">
                    {mod.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {ALL_ROLES.map((role) => {
                const roleModules = permissions[role] || [];
                return (
                  <tr key={role} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 pl-5 pr-4 font-semibold text-stone-900 whitespace-nowrap">
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
                            className="w-4 h-4 rounded-sm border-stone-300 text-emerald-800 focus:ring-emerald-800 disabled:opacity-50 cursor-pointer"
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

      <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-900">
            Registro de Acessos
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Entradas no terminal, bloqueios e alterações de permissão
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Nenhum registro ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                  <th className="py-3 pl-5 pr-3">Horário</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3">Cargo</th>
                  <th className="py-3 pl-3 pr-5">Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {logs.slice(0, 12).map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70">
                    <td className="py-3 pl-5 pr-3 font-mono text-stone-500 tabular-nums whitespace-nowrap">
                      {formatTimeShort(log.timestamp)}
                    </td>
                    <td className="py-3 px-3 font-medium text-stone-900 whitespace-nowrap">
                      {log.staffName}
                    </td>
                    <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                      {log.role}
                    </td>
                    <td
                      className={`py-3 pl-3 pr-5 ${
                        log.action === 'acesso_bloqueado'
                          ? 'text-red-600 font-medium'
                          : 'text-stone-700'
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

      {currentOperator.role === 'Gerente' && (
        <section className="bg-white border border-stone-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Limpar Dados do Sistema
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Remove mesas, cardápio, pedidos, reservas, estoque, vendas e caixas, voltando para o cadastro inicial do gerente.
            </p>
          </div>

          {!confirmingReset ? (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Tudo
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 mr-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Confirmar limpeza?
              </span>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md"
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
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-40"
              >
                {resetting ? 'Limpando...' : 'Confirmar'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
