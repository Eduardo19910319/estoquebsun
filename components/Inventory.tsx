import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { Plus, Sparkles, Trash2, Upload, FileSpreadsheet, Search, ShoppingBag } from 'lucide-react';
import { parseProductDescription } from '../services/geminiService';
import { addProduct, deleteProduct, updateProduct } from '../services/firestore';

interface InventoryProps {
  products: Product[];
}

const Inventory: React.FC<InventoryProps> = ({ products }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    sku: '',
    name: '',
    category: '',
    size: '',
    color: '',
    price: 0,
    cost: 0,
    stock: 1,
  });

  // Helper to generate SKU based on B.Sun logic
  // Logic: BS - CAT(2) - COR(2) - ID - TAM
  const generateSKU = (prod: typeof newProduct, id: number | string) => {
    const brand = "BS";
    const cat = (prod.category || "XX").substring(0, 2).toUpperCase();
    const color = (prod.color || "XX").substring(0, 2).toUpperCase();
    const size = (prod.size || "U").toLowerCase();
    // Padding ID to 2 digits if number
    const idStr = String(id).padStart(2, '0');
    return `${brand}-${cat}-${color}-${idStr}-${size}`;
  };

  // Auto update SKU when fields change
  const handleFieldChange = (field: keyof typeof newProduct, value: string | number) => {
    const updated = { ...newProduct, [field]: value };
    // Only auto-gen SKU if user hasn't manually typed a complex one or if it's empty
    if (!updated.sku || updated.sku.startsWith('BS-')) {
      // Estimate next ID based on list length + 1
      const nextId = products.length + 1;
      updated.sku = generateSKU(updated, nextId);
    }
    setNewProduct(updated);
  };

  const handleAiFill = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const result = await parseProductDescription(aiInput);

      const filledProduct = {
        ...newProduct,
        ...result,
        stock: result.stock || 1
      };

      // Generate SKU for the AI result
      filledProduct.sku = generateSKU(filledProduct, products.length + 1);

      setNewProduct(filledProduct);
    } catch (error) {
      console.error("AI Error", error);
      alert("Erro ao usar IA. Verifique sua chave API.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const product: Product = {
      ...newProduct,
      id: crypto.randomUUID(),
    };
    await addProduct(product);
    setIsAdding(false);
    setNewProduct({ sku: '', name: '', category: '', size: '', color: '', price: 0, cost: 0, stock: 1 });
    setAiInput('');
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      await deleteProduct(id);
    }
  };

  // CSV Parsing Logic with UPSERT (Update or Insert)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      let addedCount = 0;
      let updatedCount = 0;

      // Clone existing products to modify
      const currentProductsMap = new Map<string, Product>();
      products.forEach(p => currentProductsMap.set(p.sku, p));

      // Skip header (Row 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Regex to split by comma but ignore commas inside quotes
        const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (columns.length < 5) continue;

        const parseCurrency = (str: string) => {
          if (!str) return 0;
          const clean = str.replace(/["R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        const status = columns[4]?.replace(/"/g, '').trim().toUpperCase();
        const stock = status === 'EM ESTOQUE' ? 1 : 0;
        const sku = columns[2]?.replace(/"/g, '');

        if (!sku) continue;

        const csvProdData = {
          sku: sku,
          name: columns[3]?.replace(/"/g, '') || 'Sem Nome',
          category: columns[14]?.replace(/"/g, '') || columns[1]?.replace(/"/g, '') || 'Geral',
          size: columns[12]?.replace(/"/g, '') || '',
          color: columns[13]?.replace(/"/g, '') || '',
          price: parseCurrency(columns[8]),
          cost: parseCurrency(columns[7]),
          stock: stock
        };

        if (currentProductsMap.has(sku)) {
          // Update existing
          const existing = currentProductsMap.get(sku)!;
          const updated = {
            ...existing,
            ...csvProdData,
            id: existing.id // Keep original ID to preserve sales history
          };
          await updateProduct(updated);
          updatedCount++;
        } else {
          // Create new
          const newProd = {
            ...csvProdData,
            id: crypto.randomUUID()
          };
          await addProduct(newProd);
          addedCount++;
        }
      }

      alert(`Importação concluída!\n\nNovos produtos: ${addedCount}\nProdutos atualizados: ${updatedCount}`);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Estoque</h2>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por SKU ou Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            title="Importar CSV (Atualiza SKUs existentes)"
          >
            <FileSpreadsheet size={20} />
            <span className="hidden md:inline">Importar / Atualizar</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Novo</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-rose-100 animate-fade-in">
          <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Sparkles className="inline w-4 h-4 mr-1 text-purple-500" />
              Preenchimento Mágico (IA)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ex: Vestido de seda vermelho tamanho M custo 80 venda 200"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <button
                onClick={handleAiFill}
                disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {aiLoading ? 'Lendo...' : 'Preencher'}
              </button>
            </div>
          </div>

          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 uppercase">Nome</label>
                <input required value={newProduct.name} onChange={e => handleFieldChange('name', e.target.value)} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">SKU (Código)</label>
                <input value={newProduct.sku} onChange={e => handleFieldChange('sku', e.target.value)} className="w-full border p-2 rounded-lg bg-slate-50 font-mono text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase">Categoria</label>
              <input list="categories" value={newProduct.category} onChange={e => handleFieldChange('category', e.target.value)} className="w-full border p-2 rounded-lg" />
              <datalist id="categories">
                <option value="Casual" />
                <option value="Social" />
                <option value="Fitness" />
                <option value="Acessório" />
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">Tamanho</label>
                <input value={newProduct.size} onChange={e => handleFieldChange('size', e.target.value)} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">Cor</label>
                <input value={newProduct.color} onChange={e => handleFieldChange('color', e.target.value)} className="w-full border p-2 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">Custo (R$)</label>
                <input type="number" step="0.01" value={newProduct.cost} onChange={e => handleFieldChange('cost', Number(e.target.value))} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">Venda (R$)</label>
                <input type="number" step="0.01" value={newProduct.price} onChange={e => handleFieldChange('price', Number(e.target.value))} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">Estoque</label>
                <input type="number" value={newProduct.stock} onChange={e => handleFieldChange('stock', Number(e.target.value))} className="w-full border p-2 rounded-lg" />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Salvar Produto</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Produto</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Detalhes</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Preço</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Estoque</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono text-xs text-slate-500">
                    {product.sku}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.category}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs uppercase">{product.size}</span>
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-1 uppercase">
                        <div className="w-2 h-2 rounded-full bg-current opacity-70" />
                        {product.color}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-rose-600">
                    R$ {product.price.toFixed(2)}
                  </td>
                  <td className="p-4 text-slate-600">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.stock} un
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;