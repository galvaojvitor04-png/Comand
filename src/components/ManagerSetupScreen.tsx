import { useState } from 'react';
import { ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

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
      setError('Crie um PIN numérico de 4 dígitos.');
      return;
    }
    if (confirmPin !== pin) {
      setError('Os PINs digitados não conferem.');
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
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-stone-900">
              Comanda & Co.
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Primeiro acesso · Gerente Geral
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h1 className="text-base font-semibold text-stone-900">
              Cadastro do responsável
            </h1>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Informe seu nome e crie um PIN de 4 dígitos para liberar o terminal.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="setup-gm-name"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Nome completo
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
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>

            <div>
              <label
                htmlFor="setup-gm-email"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                E-mail (opcional)
              </label>
              <input
                id="setup-gm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gerencia@restaurante.com.br"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="setup-gm-pin"
                    className="text-xs font-medium text-stone-700"
                  >
                    PIN de acesso (4 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-900"
                  >
                    {showPin ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        Mostrar
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
                  className="w-full px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800 tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-gm-pin-confirm"
                  className="block text-xs font-medium text-stone-700 mb-1.5"
                >
                  Confirmar PIN
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
                  className="w-full px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800 tabular-nums"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-500">
            Após o cadastro, o PIN gerencial permanece oculto em todas as telas.
          </p>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || name.trim().length < 2 || pin.length !== 4 || confirmPin.length !== 4}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors disabled:opacity-40"
          >
            <span>{submitting ? 'Salvando...' : 'Concluir e Entrar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
