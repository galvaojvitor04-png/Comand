import { useState } from 'react';
import {
  Lock,
  LockOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  Printer,
  X,
  Receipt,
  FileText,
} from 'lucide-react';
import type {
  CashMovementType,
  CashRegisterSession,
  PaymentMethod,
  RestaurantState,
} from '../types.ts';
import { formatCurrency, formatDateTimeShort, formatTimeShort } from '../utils/format.ts';

interface CashRegisterViewProps {
  state: RestaurantState;
  operatorName: string;
  onOpenCash: (payload: {
    openingBalance: number;
    openedBy: string;
    openingNotes?: string;
  }) => Promise<void>;
  onAddMovement: (payload: {
    type: CashMovementType;
    amount: number;
    reason: string;
    operatorName: string;
  }) => Promise<void>;
  onCloseCash: (payload: {
    countedCash: number;
    closedBy: string;
    closingNotes?: string;
  }) => Promise<void>;
}

const QUICK_OPENING_PRESETS = [100, 200, 300, 500];

const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
];

export function CashRegisterView({
  state,
  operatorName,
  onOpenCash,
  onAddMovement,
  onCloseCash,
}: CashRegisterViewProps) {
  const currentSession = state.cashRegister?.currentSession || null;
  const history = state.cashRegister?.history || [];
  const isOpen = currentSession?.status === 'aberto';

  // Open Cash Form
  const [openingBalanceInput, setOpeningBalanceInput] = useState('200');
  const [openedByInput, setOpenedByInput] = useState(operatorName);
  const [openingNotes, setOpeningNotes] = useState('');
  const [openingSubmitting, setOpeningSubmitting] = useState(false);

  // Movement Form (Suprimento / Sangria)
  const [movementType, setMovementType] = useState<CashMovementType>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  // Close Cash Form
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  // Error & Report Modal
  const [formError, setFormError] = useState<string | null>(null);
  const [reportSession, setReportSession] = useState<CashRegisterSession | null>(null);

  const openOrdersCount = state.orders.filter(
    (o) => !o.paid && o.status !== 'cancelado',
  ).length;

  const sessionTxs = isOpen
    ? state.transactions.filter((tx) => tx.cashSessionId === currentSession.id)
    : [];

  const suprimentosTotal = isOpen
    ? currentSession.movements
        .filter((m) => m.type === 'suprimento')
        .reduce((sum, m) => sum + m.amount, 0)
    : 0;

  const sangriasTotal = isOpen
    ? currentSession.movements
        .filter((m) => m.type === 'sangria')
        .reduce((sum, m) => sum + m.amount, 0)
    : 0;

  const expectedCash = isOpen
    ? currentSession.expectedCash ?? currentSession.openingBalance
    : 0;

  const parsedCounted = countedCashInput.trim() === '' ? null : Number(countedCashInput);
  const liveDifference =
    parsedCounted !== null && !Number.isNaN(parsedCounted)
      ? Number((parsedCounted - expectedCash).toFixed(2))
      : null;

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(openingBalanceInput);
    if (Number.isNaN(balance) || balance < 0) {
      setFormError('Informe um fundo de troco inicial válido.');
      return;
    }
    setFormError(null);
    setOpeningSubmitting(true);
    try {
      await onOpenCash({
        openingBalance: balance,
        openedBy: openedByInput.trim() || operatorName,
        openingNotes: openingNotes.trim() || undefined,
      });
      setOpeningNotes('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao abrir o caixa.');
    } finally {
      setOpeningSubmitting(false);
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(movementAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('Informe um valor positivo para a movimentação.');
      return;
    }
    if (!movementReason.trim()) {
      setFormError('Informe o motivo da movimentação de caixa.');
      return;
    }
    setFormError(null);
    setMovementSubmitting(true);
    try {
      await onAddMovement({
        type: movementType,
        amount,
        reason: movementReason.trim(),
        operatorName,
      });
      setMovementAmount('');
      setMovementReason('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar movimentação.');
    } finally {
      setMovementSubmitting(false);
    }
  };

  const handleConfirmClose = async () => {
    if (parsedCounted === null || Number.isNaN(parsedCounted) || parsedCounted < 0) {
      setFormError('Informe o valor contado em dinheiro na gaveta.');
      return;
    }
    setFormError(null);
    setClosingSubmitting(true);
    try {
      await onCloseCash({
        countedCash: parsedCounted,
        closedBy: operatorName,
        closingNotes: closingNotes.trim() || undefined,
      });
      setCountedCashInput('');
      setClosingNotes('');
      setConfirmingClose(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao fechar o caixa.');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const renderDifferenceBadge = (diff: number) => {
    if (Math.abs(diff) < 0.01) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Conferência exata (R$ 0,00)
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 font-mono tabular-nums">
          Sobra de +{formatCurrency(diff)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 font-mono tabular-nums">
        <AlertTriangle className="w-3.5 h-3.5" />
        Quebra de {formatCurrency(diff)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {formError}
          </span>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-red-500 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isOpen ? (
        /* CLOSED STATE -> OPEN CASH WORKSPACE */
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Caixa Fechado · Abertura de Turno
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informe o fundo de troco inicial na gaveta para liberar recebimentos no PDV e fechamento de mesas.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleOpenSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label
                  htmlFor="cash-opening-balance"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Fundo de Troco Inicial (R$)
                </label>
                <input
                  id="cash-opening-balance"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 font-mono text-base font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 tabular-nums"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_OPENING_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOpeningBalanceInput(String(preset))}
                      className={`px-3 py-1 text-xs font-mono rounded-md border transition-colors tabular-nums ${
                        Number(openingBalanceInput) === preset
                          ? 'border-teal-700 bg-teal-50 text-teal-800 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cash-opened-by"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Operador Responsável
                  </label>
                  <input
                    id="cash-opened-by"
                    type="text"
                    required
                    value={openedByInput}
                    onChange={(e) => setOpenedByInput(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cash-opening-notes"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Observações de Abertura (opcional)
                  </label>
                  <input
                    id="cash-opening-notes"
                    type="text"
                    value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    placeholder="Ex: Troco conferido em cédulas"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2 text-xs text-slate-600">
                <div className="text-sm font-semibold text-slate-900">
                  Resumo da Abertura
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span>Próximo identificador</span>
                  <span className="font-mono font-semibold text-slate-900">
                    CX-{String(history.length + 1).padStart(3, '0')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valor inicial na gaveta</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(Math.max(0, Number(openingBalanceInput) || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operador</span>
                  <span className="font-medium text-slate-900">
                    {openedByInput.trim() || operatorName}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={openingSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                <LockOpen className="w-4 h-4" />
                {openingSubmitting ? 'Abrindo caixa...' : 'Abrir Caixa Agora'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        /* OPEN STATE -> LIVE CASH MONITORING, MOVEMENTS & CLOSING */
        <>
          {/* Status Banner */}
          <section className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <LockOpen className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Caixa {currentSession.code} Aberto
                </div>
                <div className="text-xs text-slate-500">
                  Aberto em {formatDateTimeShort(currentSession.openedAt)} por{' '}
                  {currentSession.openedBy}
                  {currentSession.openingNotes ? ` · ${currentSession.openingNotes}` : ''}
                </div>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-600 tabular-nums">
              {currentSession.transactionCount}{' '}
              {currentSession.transactionCount === 1 ? 'venda registrada' : 'vendas registradas'}
            </div>
          </section>

          {/* 4-column KPI Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Total Vendido no Caixa</div>
              <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                {formatCurrency(currentSession.totalSales)}
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                {currentSession.transactionCount} recebimentos
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Fundo de Troco Inicial</div>
              <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                {formatCurrency(currentSession.openingBalance)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Abertura às {formatTimeShort(currentSession.openedAt)}
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Suprimentos & Sangrias</div>
              <div className="mt-1.5 text-lg font-semibold text-slate-900 font-mono tabular-nums">
                <span className="text-emerald-700">+{formatCurrency(suprimentosTotal)}</span>
                <span className="mx-1.5 text-slate-300">/</span>
                <span className="text-red-600">-{formatCurrency(sangriasTotal)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                {currentSession.movements.length} movimentações lançadas
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Dinheiro Esperado na Gaveta</div>
              <div className="mt-1.5 text-2xl font-semibold text-teal-800 font-mono tabular-nums">
                {formatCurrency(expectedCash)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Troco + Dinheiro + Suprimentos - Sangrias
              </div>
            </div>
          </section>

          {/* 2-Column Operations: Left (Methods + Movements) | Right (Close Cash Register) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7 space-y-6">
              {/* Breakdown by Payment Method */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">
                    Resumo por Forma de Pagamento
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  {PAYMENT_METHOD_ORDER.map((method) => (
                    <div key={method} className="p-4">
                      <div className="text-xs text-slate-500">{method}</div>
                      <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
                        {formatCurrency(currentSession.totalsByMethod[method] || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Suprimento / Sangria Form & Ledger */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">
                    Movimentações de Gaveta (Suprimento / Sangria)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registre reforços de troco (suprimento) ou retiradas de dinheiro (sangria)
                  </p>
                </div>

                <form
                  onSubmit={handleMovementSubmit}
                  className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementType('suprimento')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                        movementType === 'suprimento'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      Suprimento (Entrada)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementType('sangria')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                        movementType === 'sangria'
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      Sangria (Retirada)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={movementAmount}
                        onChange={(e) => setMovementAmount(e.target.value)}
                        placeholder="Valor (R$)"
                        className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={movementReason}
                        onChange={(e) => setMovementReason(e.target.value)}
                        placeholder="Motivo (ex: Pagamento motoboy / Reforço troco)"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        disabled={movementSubmitting}
                        className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        {movementSubmitting ? 'Salvando...' : 'Lançar'}
                      </button>
                    </div>
                  </div>
                </form>

                {currentSession.movements.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Nenhuma sangria ou suprimento registrado neste caixa.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {currentSession.movements.map((mv) => (
                      <li
                        key={mv.id}
                        className="px-6 py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <div className="font-medium text-slate-900">{mv.reason}</div>
                          <div className="text-slate-500 mt-0.5">
                            {mv.type === 'suprimento' ? 'Suprimento' : 'Sangria'} · {mv.operatorName} ·{' '}
                            {formatTimeShort(mv.createdAt)}
                          </div>
                        </div>
                        <span
                          className={`font-mono font-semibold tabular-nums shrink-0 ${
                            mv.type === 'suprimento' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {mv.type === 'suprimento' ? '+' : '-'}
                          {formatCurrency(mv.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Right: Fechamento de Caixa */}
            <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">
                  Conferência e Fechamento de Caixa
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conte o dinheiro físico da gaveta e encerre o turno
                </p>
              </div>

              <div className="p-6 space-y-4">
                {openOrdersCount > 0 && (
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Há <strong>{openOrdersCount}</strong>{' '}
                      {openOrdersCount === 1 ? 'pedido em aberto' : 'pedidos em aberto'} sem
                      pagamento no momento.
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Fundo de troco</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(currentSession.openingBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Vendas em dinheiro</span>
                    <span className="font-mono tabular-nums">
                      +{formatCurrency(currentSession.totalsByMethod.Dinheiro || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Suprimentos / Sangrias</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(suprimentosTotal - sangriasTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold text-slate-900">
                    <span>Esperado na gaveta</span>
                    <span className="font-mono tabular-nums">{formatCurrency(expectedCash)}</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cash-counted-input"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Valor Contado em Dinheiro (R$)
                  </label>
                  <input
                    id="cash-counted-input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={countedCashInput}
                    onChange={(e) => {
                      setCountedCashInput(e.target.value);
                      setConfirmingClose(false);
                    }}
                    placeholder={expectedCash.toFixed(2)}
                    className="w-full px-3.5 py-2.5 font-mono text-base font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 tabular-nums"
                  />
                </div>

                {liveDifference !== null && (
                  <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Resultado da conferência</span>
                    {renderDifferenceBadge(liveDifference)}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="cash-closing-notes"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Observações de Fechamento (opcional)
                  </label>
                  <textarea
                    id="cash-closing-notes"
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Ex: Turno encerrado sem pendências..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                {!confirmingClose ? (
                  <button
                    type="button"
                    disabled={parsedCounted === null || Number.isNaN(parsedCounted) || parsedCounted < 0}
                    onClick={() => setConfirmingClose(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Lock className="w-4 h-4" />
                    Fechar Caixa {currentSession.code}
                  </button>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-300 space-y-3">
                    <p className="text-xs text-slate-700 font-medium">
                      Confirmar fechamento do caixa {currentSession.code} com valor contado de{' '}
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrency(parsedCounted || 0)}
                      </span>
                      ?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingClose(false)}
                        className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        disabled={closingSubmitting}
                        onClick={handleConfirmClose}
                        className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40"
                      >
                        {closingSubmitting ? 'Fechando...' : 'Confirmar Fechamento'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Transactions of this Cash Session */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Recebimentos deste Caixa ({sessionTxs.length})
              </h3>
            </div>
            {sessionTxs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhuma venda registrada neste turno ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                      <th className="py-3 pl-6 pr-3">Origem / Mesa</th>
                      <th className="py-3 px-3">Pagamento</th>
                      <th className="py-3 px-3">Horário</th>
                      <th className="py-3 pl-3 pr-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sessionTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pl-6 pr-3 font-medium text-slate-900">
                          {tx.tableLabel}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{tx.paymentMethod}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 tabular-nums">
                          {formatTimeShort(tx.closedAt)}
                        </td>
                        <td className="py-3 pl-3 pr-6 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(tx.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* History of Closed Cash Sessions */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Histórico de Fechamentos de Caixa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Turnos encerrados e respectivas conferências de gaveta
            </p>
          </div>
          <Receipt className="w-4 h-4 text-slate-400" />
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum fechamento de caixa registrado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Caixa</th>
                  <th className="py-3 px-3">Abertura / Fechamento</th>
                  <th className="py-3 px-3">Responsável</th>
                  <th className="py-3 px-3 text-right">Total Vendido</th>
                  <th className="py-3 px-3 text-right">Contado (Dinheiro)</th>
                  <th className="py-3 px-3">Conferência</th>
                  <th className="py-3 pl-3 pr-6 text-right">Relatório</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {history.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 pl-6 pr-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {session.code}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      <div>{formatDateTimeShort(session.openedAt)}</div>
                      <div className="text-[11px] text-slate-400">
                        até {formatDateTimeShort(session.closedAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                      {session.closedBy || session.openedBy}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(session.totalSales)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {formatCurrency(session.countedCash || 0)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {renderDifferenceBadge(session.cashDifference || 0)}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setReportSession(session)}
                        className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-medium underline underline-offset-2"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Ver resumo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Closed Session Printable Summary Modal */}
      {reportSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  Resumo de Fechamento · {reportSession.code}
                </h4>
                <p className="text-xs text-slate-500">
                  Encerrado em {formatDateTimeShort(reportSession.closedAt)} por{' '}
                  {reportSession.closedBy || reportSession.openedBy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
                aria-label="Fechar resumo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <div className="text-slate-500">Total em Vendas</div>
                  <div className="mt-0.5 text-base font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(reportSession.totalSales)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Recebimentos</div>
                  <div className="mt-0.5 text-base font-mono font-semibold text-slate-900 tabular-nums">
                    {reportSession.transactionCount}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                {PAYMENT_METHOD_ORDER.map((method) => (
                  <div key={method} className="flex justify-between text-slate-700">
                    <span>{method}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatCurrency(reportSession.totalsByMethod[method] || 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Fundo de troco inicial</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(reportSession.openingBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Esperado em gaveta</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(reportSession.expectedCash || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-semibold">
                  <span>Contado no fechamento</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(reportSession.countedCash || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 items-center">
                  <span className="text-slate-600">Conferência</span>
                  {renderDifferenceBadge(reportSession.cashDifference || 0)}
                </div>
              </div>

              {reportSession.closingNotes && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                  <span className="font-medium text-slate-800">Observações: </span>
                  {reportSession.closingNotes}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setReportSession(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
