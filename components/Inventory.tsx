import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { Plus, Sparkles, Trash2, Upload, FileSpreadsheet, Search, ShoppingBag, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { parseProductDescription } from '../services/geminiService';
import { addProduct, deleteProduct, updateProduct, batchProcessProducts } from '../services/firestore';

interface InventoryProps {
  products: Product[];
}

interface ImportPreview {
  toAdd: Product[];
  toUpdate: Product[];
  errors: number;
  totalLines: number;
}

const Inventory: React.FC<InventoryProps> = ({ products }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
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

  // CSV Parsing Logic - STEP 1: Parse and Preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        // Robust splitting for different OS line endings
        const lines = text.split(/\r\n|\n|\r/);
        let errorCount = 0;

        const toAdd: Product[] = [];
        const toUpdate: Product[] = [];

        // Clone existing products to modify
        const currentProductsMap = new Map<string, Product>();
        products.forEach(p => currentProductsMap.set(p.sku, p));

        // Detect delimiter
        const header = lines[0] || '';
        const delimiter = header.includes(';') ? ';' : ',';

        // Skip header (Row 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            // Regex to split by delimiter but ignore delimiters inside quotes
            const regex = delimiter === ';'
              ? /;(?=(?:(?:[^"]*"){2})*[^"]*$)/
              : /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

            const columns = line.split(regex);

            if (columns.length < 3) {
              if (line.replace(/,/g, '').trim().length > 0) {
                errorCount++;
              }
              continue;
            }

            const parseCurrency = (str: string) => {
              if (!str) return 0;
              const clean = str.replace(/["R$\s]/g, '').replace(/\./g, '').replace(',', '.');
              const num = parseFloat(clean);
              return isNaN(num) ? 0 : num;
            };

            const cleanStr = (str: string) => str ? str.replace(/"/g, '').trim() : '';

            const sku = cleanStr(columns[2]);
            if (!sku) {
              errorCount++;
              continue;
            }

            const name = cleanStr(columns[3]) || 'Sem Nome';
            const status = cleanStr(columns[4]).toUpperCase();

            let stock = parseInt(cleanStr(columns[10]));
            if (isNaN(stock)) {
              stock = status === 'EM ESTOQUE' ? 1 : 0;
            }

            const csvProdData = {
              sku: sku,
              name: name,
              category: cleanStr(columns[14]) || cleanStr(columns[1]) || 'Geral',
              size: cleanStr(columns[12]),
              color: cleanStr(columns[13]),
              price: parseCurrency(columns[8]),
              cost: parseCurrency(columns[7]),
              stock: stock
            };

            if (currentProductsMap.has(sku)) {
              const existing = currentProductsMap.get(sku)!;
              const hasChanged =
                existing.name !== csvProdData.name ||
                existing.category !== csvProdData.category ||
                existing.size !== csvProdData.size ||
                existing.color !== csvProdData.color ||
                existing.price !== csvProdData.price ||
                existing.cost !== csvProdData.cost ||
                existing.stock !== csvProdData.stock;

              if (hasChanged) {
                toUpdate.push({
                  ...existing,
                  ...csvProdData,
                  id: existing.id
                });
              }
            } else {
              const newProd = {
                ...csvProdData,
                id: crypto.randomUUID()
              };
              toAdd.push(newProd);
              currentProductsMap.set(sku, newProd);
            }
          } catch (err) {
            console.error(`Erro na linha ${i + 1}:`, err);
            errorCount++;
          }
        }

        setImportPreview({
          toAdd,
          toUpdate,
          errors: errorCount,
          totalLines: lines.length
        });

      } catch (error) {
        console.error("Erro fatal na importação:", error);
        alert(`Erro ao ler arquivo: ${error}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // STEP 2: Confirm and Save
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const confirmImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: importPreview.toAdd.length + importPreview.toUpdate.length });

    try {
      await batchProcessProducts(
        importPreview.toAdd,
        importPreview.toUpdate,
        (current, total) => setImportProgress({ current, total })
      );
      alert("Importação concluída com sucesso!");
      setImportPreview(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar no banco de dados.");
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" />
                Pré-visualização da Importação
              </h3>
              <button onClick={() => setImportPreview(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{importPreview.toAdd.length}</div>
                  <div className="text-xs text-emerald-800 font-medium uppercase">Novos Produtos</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importPreview.toUpdate.length}</div>
                  <div className="text-xs text-blue-800 font-medium uppercase">Atualizações</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                  <div className="text-2xl font-bold text-red-600">{importPreview.errors}</div>
                  <div className="text-xs text-red-800 font-medium uppercase">Erros / Ignorados</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Amostra dos dados detectados:</h4>
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Nome</th>
                        <th className="p-2">Preço</th>
                        <th className="p-2">Estoque</th>
                        <th className="p-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[...importPreview.toAdd, ...importPreview.toUpdate].slice(0, 5).map((p, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono">{p.sku}</td>
                          <td className="p-2 truncate max-w-[150px]">{p.name}</td>
                          <td className="p-2">R$ {p.price}</td>
                          <td className="p-2">{p.stock}</td>
                          <td className="p-2">
                            {importPreview.toAdd.includes(p) ? (
                              <span className="text-emerald-600 font-bold">NOVO</span>
                            ) : (
                              <span className="text-blue-600 font-bold">ATUALIZAR</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                    ... e mais {Math.max(0, (importPreview.toAdd.length + importPreview.toUpdate.length) - 5)} itens
                  </div>
                </div>
              </div>

              {importPreview.errors > 0 && (
                <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                  <p>Algumas linhas foram ignoradas por estarem vazias ou mal formatadas. Isso é comum em arquivos CSV.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={isImporting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {isImporting && !importPreview && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4 w-64">
            <Loader2 className="animate-spin text-rose-500" size={32} />
            <div className="text-center">
              <p className="font-medium text-slate-700 mb-1">Salvando...</p>
              <p className="text-xs text-slate-500">
                {importProgress.current} de {importProgress.total} processados
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
            disabled={isImporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm disabled:opacity-50"
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