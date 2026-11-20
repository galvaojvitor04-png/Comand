import { useState } from 'react';
import { Lock, Delete, ArrowRight, ShieldCheck } from 'lucide-react';
import type { RestaurantState, StaffMember } from '../types.ts';

interface AccessLockScreenProps {
  state: RestaurantState;
  initialStaffId: string | null;
  onAuthenticate: (staffId: string, pin: string) => Promise<void>;
  onCancelUnlock?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AccessLockScreen({
  state,
  initialStaffId,
  onAuthenticate,
  onCancelUnlock,
}: AccessLockScreenProps) {
  const operators = state.staff || [];
  const defaultId =
    initialStaffId && operators.some((o) => o.id === initialStaffId)
      ? initialStaffId
      : operators[0]?.id || 's1';

  const [selectedId, setSelectedId] = useState<string>(defaultId);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedOperator: StaffMember | undefined = operators.find(
    (o) => o.id === selectedId,
  );

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
    if (!selectedOperator || pin.length !== 4) {
      setError('Informe os 4 dígitos do PIN de acesso.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAuthenticate(selectedOperator.id, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar operador.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left: Operator Selection */}
        <div className="md:col-span-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-slate-900">
                Comanda & Co.
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione seu usuário para acessar o terminal
              </p>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {operators.map((op) => {
              const isSelected = op.id === selectedId;
              const isBlocked = op.accessEnabled === false;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(op.id);
                    setPin('');
                    setError(null);
                  }}
                  className={`w-full px-6 py-3.5 flex items-center justify-between gap-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-teal-50/70'
                      : 'hover:bg-slate-50'
                  } ${isBlocked ? 'opacity-55' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg font-display text-xs font-semibold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {getInitials(op.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {op.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {op.role} · {op.sector}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      isBlocked
                        ? 'text-red-600'
                        : op.status === 'em_turno'
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                    }`}
                  >
                    {isBlocked ? 'Bloqueado' : op.status === 'em_turno' ? 'Em turno' : 'Escala'}
                  </span>
                </button>
              );
            })}
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
                <div className="text-xs text-slate-500">Operador selecionado</div>
                <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                  {selectedOperator?.name || 'Selecione um operador'}
                </h2>
                {selectedOperator && (
                  <div className="text-xs text-teal-700 font-medium">
                    {selectedOperator.role}
                  </div>
                )}
              </div>
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
            </div>

            {/* PIN Display */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                PIN de Acesso (4 dígitos)
              </label>
              <input
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
                <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
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

          <div className="mt-6 space-y-3">
            <button
              type="submit"
              disabled={pin.length !== 4 || submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-40"
            >
              <span>{submitting ? 'Validando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono">
                PIN padrão Gerente: {operators.find((o) => o.id === 's1')?.pin || '0000'}
              </span>
              {onCancelUnlock && (
                <button
                  type="button"
                  onClick={onCancelUnlock}
                  className="font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2"
                >
                  Voltar ao sistema
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
