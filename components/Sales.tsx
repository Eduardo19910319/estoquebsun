import React, { useState, useMemo } from 'react';
import { Customer, Product, Sale, Installment, ViewState } from '../types';
import { Plus, Check, Search, Calendar, DollarSign, ChevronDown, ChevronUp, ShoppingBag, Filter, Tag, X, Save } from 'lucide-react';

interface SalesProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  customers: Customer[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentView: ViewState;
  changeView: (view: ViewState) => void;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: Installment | null;
  saleCustomerName: string;
  onSave: (amount: number) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, installment, saleCustomerName, onSave }) => {
    const [amount, setAmount] = useState<string>('');

    // Update local state when installment opens
    React.useEffect(() => {
        if (installment) {
            setAmount(installment.amountPaid.toFixed(2));
        }
    }, [installment]);

    if (!isOpen || !installment) return null;

    const currentPaid = parseFloat(amount) || 0;
    const total = installment.value;
    const progress = Math.min(100, Math.max(0, (currentPaid / total) * 100));
    const isFullyPaid = currentPaid >= total - 0.05;

    const handleQuickAction = (type: 'full' | 'clear') => {
        if (type === 'full') setAmount(total.toFixed(2));
        if (type === 'clear') setAmount('0.00');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        <DollarSign size={18} /> Baixar Parcela
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="text-sm text-slate-500 mb-1">{saleCustomerName}</div>
                        <div className="text-2xl font-bold text-slate-800">
                            Parcela {installment.number}
                        </div>
                        <div className="text-sm text-slate-400">
                            Vencimento: {new Date(installment.dueDate).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between text-sm mb-2 font-medium text-slate-700">
                            <span>Valor Previsto</span>
                            <span>R$ {total.toFixed(2)}</span>
                        </div>
                        
                        <div className="relative pt-6">
                            <label className="absolute top-0 left-0 text-xs font-bold text-rose-500 uppercase">Valor Pago (R$)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full text-3xl font-bold text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-rose-500 outline-none pb-2"
                                autoFocus
                            />
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Progresso</span>
                                <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className={`h-2.5 rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="text-center mt-2 text-xs">
                                {isFullyPaid 
                                    ? <span className="text-emerald-600 font-bold flex items-center justify-center gap-1"><Check size={12}/> Quitado</span> 
                                    : <span className="text-amber-600 font-medium">Faltam R$ {Math.max(0, total - currentPaid).toFixed(2)}</span>
                                }
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <button onClick={() => handleQuickAction('full')} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full transition-colors">
                            Marcar Total (R$ {total.toFixed(2)})
                        </button>
                        <button onClick={() => handleQuickAction('clear')} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full transition-colors">
                            Zerar
                        </button>
                    </div>

                    <button 
                        onClick={() => onSave(parseFloat(amount) || 0)}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> Salvar Pagamento
                    </button>
                </div>
            </div>
        </div>
    );
};

const Sales: React.FC<SalesProps> = ({ sales, setSales, products, customers, setProducts, currentView, changeView }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{product: Product, quantity: number}[]>([]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [salesFilter, setSalesFilter] = useState('');

  // Modal State
  const [editingInstallment, setEditingInstallment] = useState<{saleId: string, inst: Installment, customerName: string} | null>(null);

  const calculateSubtotal = () => selectedProducts.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  
  const calculateFinalTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - discount);
  };

  const handleCreateSale = () => {
    if (!selectedCustomerId || selectedProducts.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    const total = calculateFinalTotal();
    const installmentValue = total / installmentsCount;
    const today = new Date();

    const newInstallments: Installment[] = Array.from({ length: installmentsCount }).map((_, idx) => {
        const date = new Date(today);
        date.setMonth(today.getMonth() + idx + 1); 
        return {
            id: crypto.randomUUID(),
            number: idx + 1,
            dueDate: date.toISOString().split('T')[0],
            value: installmentValue,
            amountPaid: 0,
            paid: false
        };
    });

    const newSale: Sale = {
      id: crypto.randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      date: new Date().toISOString(),
      total: total,
      discount: discount,
      items: selectedProducts.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        price: i.product.price
      })),
      installments: newInstallments
    };

    const updatedProducts = products.map(p => {
        const itemInSale = selectedProducts.find(sp => sp.product.id === p.id);
        if (itemInSale) {
            return { ...p, stock: p.stock - itemInSale.quantity };
        }
        return p;
    });

    setProducts(updatedProducts);
    setSales([newSale, ...sales]);
    changeView(ViewState.SALES);
    
    setSelectedCustomerId('');
    setSelectedProducts([]);
    setInstallmentsCount(1);
    setProductSearch('');
    setDiscount(0);
  };

  const addToCart = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setSelectedProducts(selectedProducts.map(p => p.product.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      }
    } else {
        setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const handleInstallmentSave = (amount: number) => {
      if (!editingInstallment) return;

      setSales(sales.map(sale => {
          if (sale.id !== editingInstallment.saleId) return sale;
          return {
              ...sale,
              installments: sale.installments.map(inst => {
                  if (inst.id !== editingInstallment.inst.id) return inst;
                  return {
                      ...inst,
                      amountPaid: amount,
                      // Logic for boolean flag: consider paid if >= 99% of value (tolerance)
                      paid: amount >= (inst.value - 0.05) 
                  };
              })
          };
      }));
      setEditingInstallment(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
        (p.stock > 0) &&
        (p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
         p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    );
  }, [products, productSearch]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => s.customerName.toLowerCase().includes(salesFilter.toLowerCase()));
  }, [sales, salesFilter]);

  if (currentView === ViewState.NEW_SALE) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Nova Venda</h2>
            <button onClick={() => changeView(ViewState.SALES)} className="text-slate-500 hover:text-slate-800">Voltar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
                    <select 
                        className="w-full border p-3 rounded-lg bg-slate-50"
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">Selecione um cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Adicionar Produtos</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Buscar por Nome ou SKU..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto border rounded-lg divide-y scrollbar-thin">
                        {filteredProducts.map(p => (
                            <div key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                <div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        <span className="font-mono text-xs bg-slate-100 px-1 rounded text-slate-500">{p.sku}</span>
                                        {p.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 uppercase">
                                        {p.size} • {p.color} • R$ {p.price.toFixed(2)}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => addToCart(p)}
                                    className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Nenhum produto encontrado no estoque.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-rose-100 sticky top-6">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <ShoppingBag size={18} /> Resumo
                    </h3>
                    
                    <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                        {selectedProducts.map(item => (
                            <div key={item.product.id} className="flex justify-between text-sm py-2 border-b border-dashed border-slate-100 last:border-0">
                                <div className="flex-1">
                                    <div className="font-medium text-slate-700">{item.product.name}</div>
                                    <div className="text-xs text-slate-400">{item.quantity}x R$ {item.product.price.toFixed(2)}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600">
                                        <Plus className="rotate-45" size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {selectedProducts.length === 0 && <p className="text-slate-400 text-sm italic py-4 text-center">Carrinho vazio</p>}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        <div>
                             <label className="block text-xs font-medium text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Tag size={12} /> Desconto (R$)
                             </label>
                             <input 
                                type="number"
                                min="0"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                className="w-full border p-2 rounded-lg text-sm bg-slate-50 focus:border-rose-500 outline-none"
                             />
                        </div>

                        <div className="space-y-1 text-right">
                             <div className="flex justify-between text-sm text-slate-500">
                                <span>Subtotal:</span>
                                <span>R$ {calculateSubtotal().toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-rose-500">
                                    <span>Desconto:</span>
                                    <span>- R$ {discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-xl font-bold text-slate-800 pt-2 border-t border-dashed">
                                <span>Total</span>
                                <span>R$ {calculateFinalTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Condição de Pagamento</label>
                            <select 
                                value={installmentsCount} 
                                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                                className="w-full border p-2 rounded-lg text-sm bg-slate-50 focus:border-rose-500 outline-none"
                            >
                                <option value={1}>À vista (R$ {calculateFinalTotal().toFixed(2)})</option>
                                {[2,3,4,5,6,10,12].map(n => (
                                    <option key={n} value={n}>{n}x de R$ {(calculateFinalTotal() / n).toFixed(2)}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            onClick={handleCreateSale}
                            disabled={!selectedCustomerId || selectedProducts.length === 0}
                            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                        >
                            Finalizar Venda
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PaymentModal 
            isOpen={!!editingInstallment} 
            onClose={() => setEditingInstallment(null)}
            installment={editingInstallment?.inst || null}
            saleCustomerName={editingInstallment?.customerName || ''}
            onSave={handleInstallmentSave}
        />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Histórico de Vendas</h2>
            <div className="flex w-full md:w-auto gap-2">
                 <div className="relative flex-1 md:w-64">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Filtrar por cliente..."
                        value={salesFilter}
                        onChange={(e) => setSalesFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                 </div>
                <button 
                  onClick={() => changeView(ViewState.NEW_SALE)}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Nova Venda</span>
                </button>
            </div>
        </div>

        <div className="space-y-4">
            {filteredSales.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-700">Nenhuma venda encontrada</h3>
                    <p className="text-slate-400">Tente buscar por outro nome ou crie uma nova venda.</p>
                </div>
            ) : (
                filteredSales.map(sale => {
                    const isExpanded = expandedSale === sale.id;
                    const paidAmount = sale.installments.reduce((a, b) => a + (b.amountPaid || 0), 0);
                    const isFullyPaid = paidAmount >= sale.total - 0.05; 

                    return (
                        <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-shadow hover:shadow-md">
                            <div 
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 gap-4"
                                onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isFullyPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{sale.customerName}</h4>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Calendar size={14} />
                                            {new Date(sale.date).toLocaleDateString()}
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            {sale.items.length} itens
                                            {sale.discount ? <span className="text-rose-500 text-xs ml-2 bg-rose-50 px-2 py-0.5 rounded-full">-R${sale.discount} off</span> : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                    <div className="text-right">
                                        <div className="font-bold text-slate-800 text-lg">R$ {sale.total.toFixed(2)}</div>
                                        <div className={`text-sm font-medium ${isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {isFullyPaid ? 'Pago' : `Restam R$ ${(Math.max(0, sale.total - paidAmount)).toFixed(2)}`}
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="bg-slate-50 p-6 border-t border-slate-100 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                                <ShoppingBag size={14} /> Detalhes da Compra
                                            </h5>
                                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-3">
                                                {sale.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between p-3 border-b border-slate-100 last:border-0 text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-700">{item.productName}</span>
                                                            <span className="text-xs text-slate-400">{item.quantity} unidades</span>
                                                        </div>
                                                        <span className="font-medium text-slate-600">R$ {item.price.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                {sale.discount && sale.discount > 0 && (
                                                   <div className="flex justify-between p-3 bg-rose-50 text-rose-700 text-sm font-medium">
                                                        <span>Desconto Aplicado</span>
                                                        <span>- R$ {sale.discount.toFixed(2)}</span>
                                                   </div> 
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                                <Calendar size={14} /> Parcelas (Clique para editar)
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {sale.installments.map(inst => {
                                                    const instPaid = inst.amountPaid || 0;
                                                    const isFull = instPaid >= inst.value - 0.05;
                                                    const isPartial = instPaid > 0 && !isFull;
                                                    
                                                    return (
                                                    <button 
                                                        key={inst.id}
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setEditingInstallment({ saleId: sale.id, inst, customerName: sale.customerName }); 
                                                        }}
                                                        className={`p-3 rounded-lg border text-left text-sm flex justify-between items-center transition-all ${
                                                            isFull
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                                                            : isPartial
                                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:shadow-sm'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold">{inst.number}ª Parcela</div>
                                                            <div className="text-xs opacity-75 mt-1">{new Date(inst.dueDate).toLocaleDateString()}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-medium">
                                                                {isFull ? `R$ ${inst.value.toFixed(2)}` : (
                                                                    <span className="flex flex-col">
                                                                        <span>R$ {instPaid.toFixed(2)}</span>
                                                                        <span className="text-[10px] opacity-70">de R$ {inst.value.toFixed(2)}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isFull && <div className="text-xs flex items-center justify-end gap-1 mt-1"><Check size={10} /> Pago</div>}
                                                            {isPartial && <div className="text-xs flex items-center justify-end gap-1 mt-1">Parcial</div>}
                                                        </div>
                                                    </button>
                                                )})}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default Sales;