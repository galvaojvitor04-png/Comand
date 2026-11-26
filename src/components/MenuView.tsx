import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Utensils, Wine, CakeSlice } from 'lucide-react';
import type { MenuCategory, MenuItem, RestaurantState } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';
import { Modal } from './Modal.tsx';

interface MenuViewProps {
  state: RestaurantState;
  onCreateDish: (payload: Omit<MenuItem, 'id' | 'sku'>) => Promise<void>;
  onUpdateDish: (id: string, payload: Partial<MenuItem>) => Promise<void>;
  onDeleteDish: (id: string) => Promise<void>;
}

const CATEGORIES: Array<'Todos' | MenuCategory> = [
  'Todos',
  'Entradas',
  'Principais',
  'Sobremesas',
  'Bebidas',
];

function DishEmblem({ category }: { category: MenuCategory }) {
  const config: Record<MenuCategory, { bg: string; iconColor: string; Icon: typeof Utensils }> = {
    Entradas: { bg: 'bg-amber-50', iconColor: 'text-amber-700', Icon: Utensils },
    Principais: { bg: 'bg-emerald-50', iconColor: 'text-emerald-800', Icon: Utensils },
    Sobremesas: { bg: 'bg-rose-50', iconColor: 'text-rose-700', Icon: CakeSlice },
    Bebidas: { bg: 'bg-stone-100', iconColor: 'text-stone-700', Icon: Wine },
  };
  const { bg, iconColor, Icon } = config[category];
  return (
    <div className={`w-10 h-10 rounded-md ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
  );
}

export function MenuView({
  state,
  onCreateDish,
  onUpdateDish,
  onDeleteDish,
}: MenuViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | MenuCategory>('Todos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MenuCategory>('Principais');
  const [price, setPrice] = useState('68');
  const [prepTimeMin, setPrepTimeMin] = useState('15');
  const [dietary, setDietary] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setCategory('Principais');
    setPrice('68');
    setPrepTimeMin('15');
    setDietary('');
    setAvailable(true);
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setCategory(item.category);
    setPrice(String(item.price));
    setPrepTimeMin(String(item.prepTimeMin));
    setDietary(item.dietary || '');
    setAvailable(item.available);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        price: Math.max(1, Number(price) || 0),
        prepTimeMin: Math.max(1, Number(prepTimeMin) || 10),
        dietary: dietary.trim() || undefined,
        available,
      };
      if (editingItem) {
        await onUpdateDish(editingItem.id, payload);
      } else {
        await onCreateDish(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = state.menu.filter((item) => {
    if (categoryFilter !== 'Todos' && item.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-stone-200 rounded-lg p-4">
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prato ou código..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Prato
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-stone-800">Nenhum prato encontrado.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-xs font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
            >
              Cadastrar item no cardápio
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                  <th className="py-3 pl-5 pr-3">Prato</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Preparo</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Preço</th>
                  <th className="py-3 pl-3 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-4 pl-5 pr-3 max-w-md">
                      <div className="flex items-start gap-3.5">
                        <DishEmblem category={item.category} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-900">{item.name}</span>
                            <span className="font-mono text-[11px] text-stone-400">
                              {item.sku}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {item.dietary && (
                            <div className="text-[11px] font-medium text-emerald-800 mt-1">
                              {item.dietary}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-xs text-stone-600 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-4 px-3 font-mono text-xs text-stone-600 tabular-nums whitespace-nowrap">
                      {item.prepTimeMin} min
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onUpdateDish(item.id, { available: !item.available })}
                        className={`text-xs font-semibold transition-colors ${
                          item.available
                            ? 'text-emerald-800 hover:text-emerald-900'
                            : 'text-red-600 hover:text-red-700'
                        }`}
                      >
                        {item.available ? 'Disponível' : 'Esgotado'}
                      </button>
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-sm font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Editar prato"
                          className="p-2 text-stone-400 hover:text-stone-900 rounded-md transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDish(item.id)}
                          title="Remover prato"
                          className="p-2 text-stone-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Item' : 'Novo Item no Cardápio'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Nome do item
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Polvo Grelhado ao Azeite"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Descrição
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingredientes e acompanhamentos..."
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MenuCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800"
              >
                <option value="Entradas">Entradas</option>
                <option value="Principais">Principais</option>
                <option value="Sobremesas">Sobremesas</option>
                <option value="Bebidas">Bebidas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Preço (R$)
              </label>
              <input
                type="number"
                min={1}
                step="0.5"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Preparo (min)
              </label>
              <input
                type="number"
                min={1}
                required
                value={prepTimeMin}
                onChange={(e) => setPrepTimeMin(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-200 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Restrição (opcional)
              </label>
              <input
                type="text"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Sem glúten, Vegano..."
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700 pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-800"
              />
              Disponível no cardápio
            </label>
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
              {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
