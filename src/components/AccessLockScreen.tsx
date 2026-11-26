import { useState } from 'react';
import {
  Lock,
  Delete,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  UserCheck,
  ChefHat,
  Utensils,
  Wine,
  Calculator,
  DoorOpen,
} from 'lucide-react';
import type { RestaurantState, StaffMember, StaffRole } from '../types.ts';

interface AccessLockScreenProps {
  state: RestaurantState;
  initialStaffId: string | null;
  onAuthenticate: (payload: {
    role: StaffRole;
    pin: string;
    staffId?: string;
  }) => Promise<void>;
}

const ROLE_OPTIONS: Array<{
  role: StaffRole;
  description: string;
  Icon: typeof ShieldCheck;
}> = [
  { role: 'Gerente', description: 'Administração e acessos', Icon: Briefcase },
  { role: 'Chef de Cozinha', description: 'Cozinha, cardápio e estoque', Icon: ChefHat },
  { role: 'Garçom', description: 'Salão, mesas e pedidos', Icon: Utensils },
  { role: 'Bartender', description: 'Bar, PDV e bebidas', Icon: Wine },
  { role: 'Caixa', description: 'PDV e fechamento de contas', Icon: Calculator },
  { role: 'Hostess', description: 'Recepção e reservas', Icon: DoorOpen },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AccessLockScreen({
  state,
  initialStaffId,
  onAuthenticate,
}: AccessLockScreenProps) {
  const operators = state.staff || [];
  const preselectedMember = initialStaffId
    ? operators.find((o) => o.id === initialStaffId)
    : undefined;

  const [selectedRole, setSelectedRole] = useState<StaffRole | ''>(
    preselectedMember?.role || '',
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    preselectedMember?.id || null,
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const operatorsForRole: StaffMember[] = selectedRole
    ? operators.filter((o) => o.role === selectedRole)
    : [];

  const selectedOperator: StaffMember | undefined = selectedStaffId
    ? operatorsForRole.find((o) => o.id === selectedStaffId)
    : undefined;

  const handleSelectRole = (role: StaffRole) => {
    setSelectedRole(role);
    setSelectedStaffId(null);
    setPin('');
    setError(null);
  };

  const handleDigit = (digit: string) => {
    setError(null);
    setPin((prev) => (prev.length < 4 ? `${prev}${digit}` : prev));
  };

  const handleBackspace = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(null);
    setPin('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRole) {
      setError('Selecione seu cargo para continuar.');
      return;
    }
    if (pin.length !== 4) {
      setError('Informe os 4 dígitos do PIN.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAuthenticate({
        role: selectedRole,
        pin,
        staffId: selectedOperator?.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-6 border-b md:border-b-0 md:border-r border-stone-200 flex flex-col">
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-stone-900">
                Comanda & Co.
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Acesso de operador
              </p>
            </div>
            <Lock className="w-4 h-4 text-stone-400" />
          </div>

          <div className="p-5 space-y-5 flex-1 overflow-y-auto max-h-[540px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Cargo
                </label>
                {selectedRole && (
                  <span className="text-xs font-medium text-emerald-800">
                    {selectedRole}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ role, description, Icon }) => {
                  const isSelected = selectedRole === role;
                  const roleStaff = operators.filter((o) => o.role === role);
                  const activeCount = roleStaff.filter(
                    (o) => o.accessEnabled !== false,
                  ).length;

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-emerald-800 bg-emerald-50/60'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-emerald-800' : 'text-stone-500'
                          }`}
                        />
                        <span className="text-[11px] font-mono text-stone-400 tabular-nums">
                          {activeCount}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-stone-900 leading-tight">
                          {role}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                          {description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Operador
                </span>
              </div>

              {!selectedRole ? (
                <div className="p-4 rounded-lg border border-dashed border-stone-200 bg-stone-50/70 text-xs text-stone-500 text-center">
                  Escolha um cargo acima para continuar.
                </div>
              ) : (
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(null);
                      setError(null);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                      selectedStaffId === null
                        ? 'bg-emerald-50/60'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserCheck
                        className={`w-4 h-4 shrink-0 ${
                          selectedStaffId === null ? 'text-emerald-800' : 'text-stone-400'
                        }`}
                      />
                      <span className="text-xs font-medium text-stone-800 truncate">
                        Identificar pelo PIN
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-800 shrink-0">
                      {selectedStaffId === null ? 'Ativo' : 'Usar'}
                    </span>
                  </button>

                  {operatorsForRole.map((op) => {
                    const isSelected = op.id === selectedStaffId;
                    const isBlocked = op.accessEnabled === false;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => {
                          setSelectedStaffId(op.id);
                          setPin('');
                          setError(null);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-stone-50'
                        } ${isBlocked ? 'opacity-55' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-md font-display text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-emerald-800 text-white'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {getInitials(op.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-stone-900 truncate">
                              {op.name}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">
                              {op.sector} · {op.shiftLabel}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-medium shrink-0 ${
                            isBlocked
                              ? 'text-red-600'
                              : op.status === 'em_turno'
                                ? 'text-emerald-700'
                                : 'text-stone-400'
                          }`}
                        >
                          {isBlocked
                            ? 'Bloqueado'
                            : op.status === 'em_turno'
                              ? 'Em turno'
                              : 'Escala'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-stone-50/50"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  {selectedRole || 'Selecione o cargo ao lado'}
                </h2>
                <div className="text-xs text-emerald-800 font-medium mt-0.5">
                  {selectedOperator
                    ? selectedOperator.name
                    : selectedRole
                      ? 'Informe seu PIN de 4 dígitos'
                      : 'Aguardando seleção'}
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0" />
            </div>

            <div>
              <label
                htmlFor="access-pin-input"
                className="block text-xs font-medium text-stone-600 mb-2"
              >
                PIN pessoal
              </label>
              <input
                id="access-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setError(null);
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                }}
                placeholder="••••"
                className="w-full py-3 px-4 text-center font-mono text-2xl tracking-[0.5em] bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
              {error && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="py-3 text-base font-mono font-semibold text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-md transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 text-xs font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 rounded-md transition-colors"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="py-3 text-base font-mono font-semibold text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-md transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Apagar dígito"
                className="py-3 flex items-center justify-center text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 rounded-md transition-colors"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={!selectedRole || pin.length !== 4 || submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors disabled:opacity-40"
            >
              <span>{submitting ? 'Verificando...' : 'Entrar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
