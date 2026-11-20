import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, Utensils, Coffee, Wine, CakeSlice } from 'lucide-react';
import type { MenuCategory, MenuItem, RestaurantState } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';

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
    Principais: { bg: 'bg-teal-50', iconColor: 'text-teal-700', Icon: Utensils },
    Sobremesas: { bg: 'bg-rose-50', iconColor: 'text-rose-700', Icon: CakeSlice },
    Bebidas: { bg: 'bg-slate-100', iconColor: 'text-slate-700', Icon: category === 'Bebidas' ? Wine : Coffee },
  };
  const { bg, iconColor, Icon } = config[category];
  return (
    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
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
      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prato ou código..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Prato
          </button>
        </div>
      </div>

      {/* Menu Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-800">Nenhum prato encontrado.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
            >
              Cadastrar primeiro prato
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Prato</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Preparo</th>
                  <th className="py-3 px-3">Disponibilidade</th>
                  <th className="py-3 px-3 text-right">Preço</th>
                  <th className="py-3 pl-3 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 pl-6 pr-3 max-w-md">
                      <div className="flex items-start gap-3.5">
                        <DishEmblem category={item.category} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{item.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {item.sku}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                          {item.dietary && (
                            <div className="text-[11px] font-medium text-teal-700 mt-1">
                              {item.dietary}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-xs text-slate-600 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-4 px-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {item.prepTimeMin} min
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onUpdateDish(item.id, { available: !item.available })}
                        className={`text-xs font-semibold transition-colors ${
                          item.available
                            ? 'text-emerald-700 hover:text-emerald-800'
                            : 'text-red-600 hover:text-red-700'
                        }`}
                      >
                        {item.available ? 'Disponível' : 'Esgotado'}
                      </button>
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Editar prato"
                          className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDish(item.id)}
                          title="Remover prato"
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
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

      {/* Create/Edit Dish Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingItem ? 'Editar Item do Cardápio' : 'Novo Item no Cardápio'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do prato ou bebida
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Polvo Grelhado ao Azeite de Páprica"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descrição e acompanhamentos
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ingredientes principais e modo de preparo..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MenuCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Entradas">Entradas</option>
                    <option value="Principais">Principais</option>
                    <option value="Sobremesas">Sobremesas</option>
                    <option value="Bebidas">Bebidas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preparo (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={prepTimeMin}
                    onChange={(e) => setPrepTimeMin(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Observação dietética (opcional)
                  </label>
                  <input
                    type="text"
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    placeholder="Ex: Sem glúten, Vegano"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Disponível para venda
                </label>
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
                  {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
