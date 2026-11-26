import { useState } from 'react';
import { Plus, Search, Minus, Package } from 'lucide-react';
import type { InventoryCategory, InventoryItem, RestaurantState } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';
import { Modal } from './Modal.tsx';

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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-md">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white text-stone-900 border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyLow((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              onlyLow
                ? 'border-amber-600 bg-amber-50 text-amber-800'
                : 'border-stone-200 bg-white text-stone-600 hover:text-stone-900'
            }`}
          >
            Abaixo do mínimo ({lowCount})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar insumo..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Insumo
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>{filtered.length} insumos</span>
          <span className="font-mono tabular-nums">
            Total em estoque: <strong className="text-stone-900">{formatCurrency(totalInventoryValue)}</strong>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="mt-3 text-sm font-medium text-stone-800">Nenhum insumo encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                  <th className="py-3 pl-5 pr-3">Insumo</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Nível Atual</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Custo Unit.</th>
                  <th className="py-3 pl-3 pr-5 text-right">Ajuste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filtered.map((item) => {
                  const isCritical = item.quantity <= item.minQuantity * 0.6;
                  const isLow = item.quantity <= item.minQuantity && !isCritical;
                  const ratio = Math.min(100, Math.round((item.quantity / Math.max(1, item.minQuantity * 2)) * 100));
                  const step = item.unit === 'kg' ? 0.5 : 1;

                  return (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="font-medium text-stone-900">{item.name}</div>
                        <div className="text-xs text-stone-500">{item.supplier}</div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-stone-600 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="py-3.5 px-3 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                          <span className="font-semibold text-stone-900">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-stone-400">
                            mín {item.minQuantity} {item.unit}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-100 rounded-xs overflow-hidden">
                          <div
                            style={{ width: `${ratio}%` }}
                            className={`h-full rounded-xs ${
                              isCritical
                                ? 'bg-red-600'
                                : isLow
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-800'
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
                                : 'text-emerald-800'
                          }`}
                        >
                          {isCritical ? 'Crítico' : isLow ? 'Baixo' : 'Normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-stone-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(item.unitCost)}/{item.unit}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 border border-stone-200 rounded-md p-0.5 bg-white">
                          <button
                            type="button"
                            onClick={() => onAdjustStock(item.id, -step)}
                            title={`Reduzir ${step} ${item.unit}`}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-sm transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 font-mono text-xs text-stone-500 tabular-nums">
                            ±{step}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAdjustStock(item.id, step)}
                            title={`Adicionar ${step} ${item.unit}`}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-sm transition-colors"
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Insumo"
      >
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Nome do insumo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Azeite Extravirgem 500ml"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800"
              >
                <option value="Proteínas">Proteínas</option>
                <option value="Hortifruti">Hortifruti</option>
                <option value="Laticínios">Laticínios</option>
                <option value="Secos & Grãos">Secos & Grãos</option>
                <option value="Bebidas">Bebidas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Unidade
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, un, L, gf"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Qtd. inicial
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Mínimo
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Custo (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Fornecedor
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Nome do fornecedor"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Adicionar Insumo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
