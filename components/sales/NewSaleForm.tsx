import React, { useState, useMemo } from 'react';
import { Customer, Product, Sale, Installment, ViewState } from '../../types';
import { Plus, Search, ShoppingBag, Tag } from 'lucide-react';
import { addSale, updateProduct } from '../../services/firestore';

interface NewSaleFormProps {
    products: Product[];
    customers: Customer[];
    changeView: (view: ViewState) => void;
    onSuccess: () => void;
}

interface CartItem {
    product: Product;
    quantity: number;
}

const NewSaleForm: React.FC<NewSaleFormProps> = ({ products, customers, changeView, onSuccess }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<CartItem[]>([]);
    const [installmentsCount, setInstallmentsCount] = useState(1);
    const [productSearch, setProductSearch] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const calculateSubtotal = () => selectedProducts.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);

    const calculateFinalTotal = () => {
        const sub = calculateSubtotal();
        return Math.max(0, sub - discount);
    };

    const handleCreateSale = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!selectedCustomerId || selectedProducts.length === 0 || isSubmitting) return;

        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) return;

        setIsSubmitting(true);

        try {
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

            // Update Stock in Firestore
            for (const item of selectedProducts) {
                const product = products.find(p => p.id === item.product.id);
                if (product) {
                    await updateProduct({
                        ...product,
                        stock: product.stock - item.quantity
                    });
                }
            }

            // Add Sale to Firestore
            await addSale(newSale);
            onSuccess();
        } catch (error) {
            console.error("Error creating sale:", error);
            // Optionally add error handling UI here
        } finally {
            setIsSubmitting(false);
        }
    };

    const addToCart = (product: Product) => {
        const existing = selectedProducts.find(p => p.product.id === product.id);
        if (existing) {
            if (existing.quantity < product.stock) {
                setSelectedProducts(selectedProducts.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
            }
        } else {
            setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            (p.stock > 0) &&
            (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        );
    }, [products, productSearch]);

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
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCustomerId(e.target.value)}
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)}
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
                                            <Plus className="rotate-45" size={16} />
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscount(Number(e.target.value))}
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
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInstallmentsCount(Number(e.target.value))}
                                    className="w-full border p-2 rounded-lg text-sm bg-slate-50 focus:border-rose-500 outline-none"
                                >
                                    <option value={1}>À vista (R$ {calculateFinalTotal().toFixed(2)})</option>
                                    <option value={2}>2x de R$ {(calculateFinalTotal() / 2).toFixed(2)}</option>
                                    <option value={3}>3x de R$ {(calculateFinalTotal() / 3).toFixed(2)}</option>
                                    <option value={4}>4x de R$ {(calculateFinalTotal() / 4).toFixed(2)}</option>
                                    <option value={5}>5x de R$ {(calculateFinalTotal() / 5).toFixed(2)}</option>
                                    <option value={6}>6x de R$ {(calculateFinalTotal() / 6).toFixed(2)}</option>
                                    <option value={10}>10x de R$ {(calculateFinalTotal() / 10).toFixed(2)}</option>
                                    <option value={12}>12x de R$ {(calculateFinalTotal() / 12).toFixed(2)}</option>
                                </select>
                            </div>

                            <button
                                onClick={handleCreateSale}
                                disabled={!selectedCustomerId || selectedProducts.length === 0 || isSubmitting}
                                className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                            >
                                {isSubmitting ? 'Finalizando...' : 'Finalizar Venda'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewSaleForm;
