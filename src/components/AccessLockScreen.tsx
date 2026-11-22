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
  { role: 'Gerente', description: 'Gestão completa e acessos', Icon: Briefcase },
  { role: 'Chef de Cozinha', description: 'Cozinha (KDS), cardápio e estoque', Icon: ChefHat },
  { role: 'Garçom', description: 'Salão, mesas e pedidos', Icon: Utensils },
  { role: 'Bartender', description: 'Bar, PDV e preparo de bebidas', Icon: Wine },
  { role: 'Caixa', description: 'PDV, recebimentos e contas', Icon: Calculator },
  { role: 'Hostess', description: 'Recepção, salão e reservas', Icon: DoorOpen },
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
      setError('Selecione o seu cargo antes de acessar o sistema.');
      return;
    }
    if (pin.length !== 4) {
      setError('Informe os 4 dígitos do PIN de acesso.');
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
      setError(err instanceof Error ? err.message : 'Falha ao autenticar acesso.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left: Cargo & Optional Operator Selection */}
        <div className="md:col-span-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-slate-900">
                Comanda & Co.
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Informe seu cargo e PIN de acesso para entrar no sistema
              </p>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="p-5 space-y-5 flex-1 overflow-y-auto max-h-[540px]">
            {/* Step 1: Cargo Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  1. Selecione seu Cargo
                </label>
                {selectedRole && (
                  <span className="text-xs font-medium text-teal-700">
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
                      className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-teal-700' : 'text-slate-500'
                          }`}
                        />
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {activeCount} {activeCount === 1 ? 'ativo' : 'ativos'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 leading-tight">
                          {role}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Operators inside chosen Cargo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  2. Operador ({selectedRole || 'Escolha um cargo acima'})
                </span>
              </div>

              {!selectedRole ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-xs text-slate-500 text-center">
                  Selecione um cargo acima para liberar o acesso via PIN.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(null);
                      setError(null);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                      selectedStaffId === null
                        ? 'bg-teal-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserCheck
                        className={`w-4 h-4 shrink-0 ${
                          selectedStaffId === null ? 'text-teal-700' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-medium text-slate-800 truncate">
                        Identificar automaticamente pelo PIN
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-teal-700 shrink-0">
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
                          isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                        } ${isBlocked ? 'opacity-55' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg font-display text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {getInitials(op.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-900 truncate">
                              {op.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
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
                                : 'text-slate-400'
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

        {/* Right: PIN Keypad & Authentication */}
        <form
          onSubmit={handleSubmit}
          className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-slate-50/40"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-500">Credencial de entrada</div>
                <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                  {selectedRole || 'Selecione o cargo ao lado'}
                </h2>
                <div className="text-xs text-teal-700 font-medium">
                  {selectedOperator
                    ? selectedOperator.name
                    : selectedRole
                      ? 'Identificação via PIN do cargo'
                      : 'Aguardando seleção de cargo'}
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
            </div>

            {/* PIN Display */}
            <div>
              <label
                htmlFor="access-pin-input"
                className="block text-xs font-medium text-slate-600 mb-2"
              >
                PIN de Acesso (4 dígitos)
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
                className="w-full py-3 px-4 text-center font-mono text-2xl tracking-[0.5em] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
              {error && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}
            </div>

            {/* Tactile Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="py-3 text-base font-mono font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="py-3 text-base font-mono font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Apagar dígito"
                className="py-3 flex items-center justify-center text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              type="submit"
              disabled={!selectedRole || pin.length !== 4 || submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-40"
            >
              <span>{submitting ? 'Validando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-slate-500 text-center">
              Acesso restrito · Informe seu cargo e PIN pessoal de 4 dígitos
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
