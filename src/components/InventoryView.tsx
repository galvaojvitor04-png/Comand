import { useState } from 'react';
import { Plus, Search, Minus, X, Package } from 'lucide-react';
import type { InventoryCategory, InventoryItem, RestaurantState } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';

interface InventoryViewProps {
  state: RestaurantState;
  onAdjustStock: (id: string, delta: number) => Promise<void>;
  onCreateInventoryItem: (payload: Omit<InventoryItem, 'id' | 'updatedAt'>) => Promise<void>;
}

const CATEGORIES: Array<'Todos' | InventoryCategory> = [
  'Todos',
  'Proteínas',
  'Hortifruti',
  'Laticínios',
  'Secos & Grãos',
  'Bebidas',
];

export function InventoryView({
  state,
  onAdjustStock,
  onCreateInventoryItem,
}: InventoryViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | InventoryCategory>('Todos');
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Proteínas');
  const [unit, setUnit] = useState('kg');
  const [quantity, setQuantity] = useState('10');
  const [minQuantity, setMinQuantity] = useState('4');
  const [unitCost, setUnitCost] = useState('45');
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = state.inventory.filter((item) => {
    if (categoryFilter !== 'Todos' && item.category !== categoryFilter) return false;
    if (onlyLow && item.quantity > item.minQuantity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalInventoryValue = state.inventory.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  );
  const lowCount = state.inventory.filter((i) => i.quantity <= i.minQuantity).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreateInventoryItem({
        name: name.trim(),
        category,
        unit: unit.trim() || 'un',
        quantity: Math.max(0, Number(quantity) || 0),
        minQuantity: Math.max(0, Number(minQuantity) || 1),
        unitCost: Math.max(0, Number(unitCost) || 0),
        supplier: supplier.trim() || 'Fornecedor Local',
      });
      setModalOpen(false);
      setName('');
      setSupplier('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyLow((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              onlyLow
                ? 'border-amber-600 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
            }`}
          >
            Apenas abaixo do mínimo ({lowCount})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar insumo..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Insumo
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{filtered.length} insumos listados</span>
          <span className="font-mono tabular-nums">
            Valor total em estoque: <strong className="text-slate-900">{formatCurrency(totalInventoryValue)}</strong>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="mt-3 text-sm font-medium text-slate-800">Nenhum insumo encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Insumo</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Nível Atual</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Custo Unit.</th>
                  <th className="py-3 pl-3 pr-6 text-right">Ajuste Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => {
                  const isCritical = item.quantity <= item.minQuantity * 0.6;
                  const isLow = item.quantity <= item.minQuantity && !isCritical;
                  const ratio = Math.min(100, Math.round((item.quantity / Math.max(1, item.minQuantity * 2)) * 100));
                  const step = item.unit === 'kg' ? 0.5 : 1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.supplier}</div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="py-3.5 px-3 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                          <span className="font-semibold text-slate-900">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-slate-400">
                            mín {item.minQuantity} {item.unit}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${ratio}%` }}
                            className={`h-full rounded-full ${
                              isCritical
                                ? 'bg-red-600'
                                : isLow
                                  ? 'bg-amber-500'
                                  : 'bg-teal-700'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            isCritical
                              ? 'text-red-600'
                              : isLow
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {isCritical ? 'Crítico' : isLow ? 'Estoque Baixo' : 'Normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(item.unitCost)}/{item.unit}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                          <button
                            type="button"
                            onClick={() => onAdjustStock(item.id, -step)}
                            title={`Reduzir ${step} ${item.unit}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 font-mono text-xs text-slate-500 tabular-nums">
                            ±{step}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAdjustStock(item.id, step)}
                            title={`Adicionar ${step} ${item.unit}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
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

      {/* New Inventory Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Cadastrar Novo Insumo</h3>
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
                  Nome do insumo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Azeite Extravirgem Italiano 500ml"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Proteínas">Proteínas</option>
                    <option value="Hortifruti">Hortifruti</option>
                    <option value="Laticínios">Laticínios</option>
                    <option value="Secos & Grãos">Secos & Grãos</option>
                    <option value="Bebidas">Bebidas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unidade de medida
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg, un, L, gf"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Qtd. Inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estoque Mín.
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    required
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fornecedor
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ex: Empório Importadora"
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
                  {saving ? 'Salvando...' : 'Adicionar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
