import React, { useMemo } from 'react';
import { Sale, Product, Customer, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, Clock, AlertCircle, ShieldCheck, ArrowRight, FileSpreadsheet, Users, ShoppingCart } from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  changeView?: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, products, customers, changeView }) => {
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalReceivable = 0;
    let totalPaid = 0;
    let overdueCount = 0;

    const today = new Date().toISOString().split('T')[0];

    sales.forEach(sale => {
      totalRevenue += sale.total;
      sale.installments.forEach(inst => {
        // Use the explicit amountPaid field
        const paid = inst.amountPaid || 0;
        const remaining = Math.max(0, inst.value - paid);

        totalPaid += paid;
        totalReceivable += remaining;

        // If there is still amount remaining AND due date is passed
        if (remaining > 0.1 && inst.dueDate < today) {
          overdueCount++;
        }
      });
    });

    return { totalRevenue, totalReceivable, totalPaid, overdueCount };
  }, [sales]);

  const chartData = [
    { name: 'Recebido', value: stats.totalPaid, color: '#10b981' },
    { name: 'A Receber', value: stats.totalReceivable, color: '#f59e0b' },
  ];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // EMPTY STATE: Guia para novos usuários
  if (products.length === 0 && customers.length === 0 && sales.length === 0) {
      return (
          <div className="max-w-4xl mx-auto py-8 animate-fade-in">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-800 mb-4">Bem-vinda ao ModaGestão! ✨</h2>
                  <p className="text-slate-500 max-w-lg mx-auto">
                      Seu sistema está pronto. Siga os passos abaixo para começar a organizar sua loja agora mesmo.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <FileSpreadsheet size={64} className="text-emerald-500" />
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                          <span className="font-bold text-lg">1</span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">Importe seu Estoque</h3>
                      <p className="text-sm text-slate-500 mb-6">
                          Tem uma planilha? Salve como .CSV e importe tudo de uma vez. Ou cadastre manualmente com ajuda da IA.
                      </p>
                      {changeView && (
                        <button onClick={() => changeView(ViewState.INVENTORY)} className="text-emerald-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                            Ir para Estoque <ArrowRight size={16} />
                        </button>
                      )}
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Users size={64} className="text-blue-500" />
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                          <span className="font-bold text-lg">2</span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">Cadastre Clientes</h3>
                      <p className="text-sm text-slate-500 mb-6">
                          Crie sua carteira de clientes para registrar vendas fiado, parcelado ou à vista de forma organizada.
                      </p>
                      {changeView && (
                        <button onClick={() => changeView(ViewState.CUSTOMERS)} className="text-blue-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                            Ir para Clientes <ArrowRight size={16} />
                        </button>
                      )}
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <ShoppingCart size={64} className="text-rose-500" />
                      </div>
                      <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4">
                          <span className="font-bold text-lg">3</span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">Realize Vendas</h3>
                      <p className="text-sm text-slate-500 mb-6">
                          O caixa abre automaticamente. Lance vendas, gere parcelas e controle quem pagou e quem deve.
                      </p>
                      {changeView && (
                        <button onClick={() => changeView(ViewState.NEW_SALE)} className="text-rose-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                            Nova Venda <ArrowRight size={16} />
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Painel Financeiro</h2>
        <div className="text-sm text-slate-500">
            Resumo atualizado em {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Vendas Totais</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Já Recebido</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalPaid)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">A Receber</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalReceivable)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Parcelas Atrasadas</p>
            <p className="text-2xl font-bold text-slate-800">{stats.overdueCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Fluxo de Caixa (Recebido vs. A Receber)</h3>
            <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(val) => `R$${val}`} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-sm text-white flex flex-col justify-between">
             <div>
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="text-emerald-400" />
                    <h3 className="font-semibold text-lg">Status do Sistema</h3>
                </div>
                <div className="space-y-4 text-sm text-slate-300">
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span>Produtos Cadastrados</span>
                        <span className="text-white font-mono">{products.length}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span>Clientes Ativos</span>
                        <span className="text-white font-mono">{customers.length}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span>Vendas Realizadas</span>
                        <span className="text-white font-mono">{sales.length}</span>
                    </div>
                </div>
             </div>
             <p className="text-xs text-slate-500 mt-6">
                Dados salvos neste dispositivo. Vá em Configurações para exportar.
             </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;