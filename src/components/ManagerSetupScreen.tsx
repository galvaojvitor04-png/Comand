import { useState } from 'react';
import { ShieldCheck, ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react';

interface ManagerSetupScreenProps {
  onCompleteSetup: (payload: {
    name: string;
    email: string;
    pin: string;
    confirmPin: string;
  }) => Promise<void>;
}

export function ManagerSetupScreen({ onCompleteSetup }: ManagerSetupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError('Informe o nome completo do Gerente Geral.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Crie um PIN numérico com exatamente 4 dígitos.');
      return;
    }
    if (confirmPin !== pin) {
      setError('A confirmação do PIN não confere.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onCompleteSetup({
        name: cleanName,
        email: email.trim(),
        pin,
        confirmPin,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-slate-900">
              Comanda & Co.
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuração inicial do sistema · Cadastro do Gerente Geral
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4 text-teal-700" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Cadastre o Gerente Geral para iniciar
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              O sistema está limpo e pronto para uso. Informe seu nome e crie um PIN secreto de 4 dígitos para proteger o acesso gerencial.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="setup-gm-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nome do Gerente Geral
              </label>
              <input
                id="setup-gm-name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => {
                  setError(null);
                  setName(e.target.value);
                }}
                placeholder="Ex: João Vitor Silva"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="setup-gm-email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                E-mail corporativo (opcional)
              </label>
              <input
                id="setup-gm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gerencia@restaurante.com.br"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="setup-gm-pin"
                    className="text-xs font-medium text-slate-700"
                  >
                    Criar PIN de acesso (4 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900"
                  >
                    {showPin ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        Ver ao digitar
                      </>
                    )}
                  </button>
                </div>
                <input
                  id="setup-gm-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => {
                    setError(null);
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-gm-pin-confirm"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Confirmar PIN (4 dígitos)
                </label>
                <input
                  id="setup-gm-pin-confirm"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={(e) => {
                    setError(null);
                    setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span>
              Por segurança, o PIN do Gerente Geral nunca fica visível nas telas do sistema após o cadastro.
            </span>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || name.trim().length < 2 || pin.length !== 4 || confirmPin.length !== 4}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-40"
          >
            <span>{submitting ? 'Salvando cadastro...' : 'Concluir Cadastro e Iniciar Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
