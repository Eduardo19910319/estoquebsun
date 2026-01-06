import React, { useState, useEffect } from 'react';
import { DollarSign, X, Check, Save } from 'lucide-react';
import { Installment } from '../../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    installment: Installment | null;
    saleCustomerName: string;
    onSave: (amount: number) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    installment,
    saleCustomerName,
    onSave
}) => {
    const [amount, setAmount] = useState<string>('');

    // Update local state when installment opens
    useEffect(() => {
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

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(e.target.value);
    };

    const handleSaveClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onSave(parseFloat(amount) || 0);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        <DollarSign size={18} /> Baixar Parcela
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
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
                                onChange={handleAmountChange}
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
                                    ? <span className="text-emerald-600 font-bold flex items-center justify-center gap-1"><Check size={12} /> Quitado</span>
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
                        onClick={handleSaveClick}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> Salvar Pagamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
