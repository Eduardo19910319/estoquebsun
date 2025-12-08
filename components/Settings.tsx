import React, { useRef, useState } from 'react';
import { Customer, Product, Sale } from '../types';
import { Download, Upload, Trash2, Save, Settings as SettingsIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { addProduct, addCustomer, addSale, deleteProduct, deleteCustomer, deleteSale } from '../services/firestore';
import Diagnostics from './Diagnostics';

interface SettingsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
}

const Settings: React.FC<SettingsProps> = ({ sales, products, customers }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBackup = () => {
    const data = {
      products,
      customers,
      sales,
      exportedAt: new Date().toISOString(),
      system: "ModaGestão AI"
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_modagestao_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("ATENÇÃO: Isso importará os dados do backup para o banco de dados online. Duplicatas podem ocorrer se os IDs já existirem. Deseja continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.system !== "ModaGestão AI") {
          throw new Error("Arquivo de backup inválido.");
        }

        // Import Products
        if (data.products && Array.isArray(data.products)) {
          for (const p of data.products) {
            await addProduct(p);
          }
        }

        // Import Customers
        if (data.customers && Array.isArray(data.customers)) {
          for (const c of data.customers) {
            await addCustomer(c);
          }
        }

        // Import Sales
        if (data.sales && Array.isArray(data.sales)) {
          for (const s of data.sales) {
            await addSale(s);
          }
        }

        alert("Dados importados com sucesso para o Firestore!");
      } catch (err) {
        console.error(err);
        alert("Erro ao importar dados. Verifique o console para mais detalhes.");
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearSystem = async () => {
    const confirmText = "DELETAR";
    const input = prompt(`Para apagar TODOS os dados do banco de dados online (produtos, clientes, vendas), digite "${confirmText}":`);

    if (input === confirmText) {
      setIsLoading(true);
      try {
        // Delete all products
        for (const p of products) await deleteProduct(p.id);
        // Delete all customers
        for (const c of customers) await deleteCustomer(c.id);
        // Delete all sales
        for (const s of sales) await deleteSale(s.id);

        alert("Sistema limpo com sucesso.");
      } catch (error) {
        console.error(error);
        alert("Erro ao limpar dados.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <SettingsIcon className="text-slate-500" />
        Configurações & Dados
      </h2>

      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-rose-500" size={32} />
            <p className="font-medium text-slate-700">Processando dados...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-semibold text-lg mb-4 text-slate-700">Backup e Restauração</h3>
          <p className="text-sm text-slate-500 mb-6">
            Seus dados agora estão salvos na nuvem (Firebase). O backup aqui serve para você ter uma cópia local de segurança.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleBackup}
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
            >
              <Download size={20} />
              Baixar Cópia de Segurança (JSON)
            </button>

            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleRestore}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Upload size={20} />
                Importar Backup para Nuvem
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-semibold text-lg mb-4 text-slate-700">Zona de Perigo</h3>
          <p className="text-sm text-slate-500 mb-6">
            Ações irreversíveis. Isso apagará os dados do servidor.
          </p>

          <button
            onClick={handleClearSystem}
            disabled={isLoading}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 size={20} />
            Apagar Todos os Dados Online
          </button>
        </div>

        <div className="md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
              <Save size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-lg">Sincronização em Nuvem Ativa</h3>
              <p className="text-emerald-800 mt-1">
                Seus dados estão sendo salvos automaticamente no Google Firebase.
              </p>
              <ul className="list-disc list-inside mt-2 text-emerald-700 space-y-1 text-sm">
                <li>Você pode acessar de qualquer dispositivo.</li>
                <li>Não é necessário salvar manualmente.</li>
                <li>O backup manual acima é apenas para sua segurança extra.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Diagnostics />
        </div>
      </div>
    </div>
  );
};

export default Settings;