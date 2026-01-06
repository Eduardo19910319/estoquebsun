import React, { useState, useMemo } from 'react';
import { Sale, Installment, ViewState } from '../../types';
import { Filter, DollarSign, Plus, Calendar, ChevronDown, ChevronUp, ShoppingBag, Check, Trash2 } from 'lucide-react';
import { updateSale, deleteSale } from '../../services/firestore';
import PaymentModal from './PaymentModal';

interface SalesHistoryProps {
    sales: Sale[];
    changeView: (view: ViewState) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, changeView }) => {
    const [salesFilter, setSalesFilter] = useState('');
    const [expandedSale, setExpandedSale] = useState<string | null>(null);
    const [editingInstallment, setEditingInstallment] = useState<{ saleId: string, inst: Installment, customerName: string } | null>(null);

    const filteredSales = useMemo(() => {
        return sales.filter(s => s.customerName.toLowerCase().includes(salesFilter.toLowerCase()));
    }, [sales, salesFilter]);

    const handleInstallmentSave = async (amount: number) => {
        if (!editingInstallment) return;

        const sale = sales.find(s => s.id === editingInstallment.saleId);
        if (!sale) return;

        const updatedSaleData = {
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

        await updateSale(updatedSaleData);
        setEditingInstallment(null);
    };

    const handleDeleteSale = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.")) {
            try {
                await deleteSale(id);
            } catch (error) {
                console.error("Error deleting sale:", error);
                alert("Erro ao excluir venda.");
            }
        }
    };

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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalesFilter(e.target.value)}
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
                                        <div className="flex gap-2 items-center">
                                            <button
                                                onClick={(e) => handleDeleteSale(sale.id, e)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir Venda"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                            {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                        </div>
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
                                                                className={`p-3 rounded-lg border text-left text-sm flex justify-between items-center transition-all ${isFull
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
                                                        )
                                                    })}
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

export default SalesHistory;
