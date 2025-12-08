import React, { useRef } from 'react';
import { Customer, Product, Sale } from '../types';
import { Download, Upload, Trash2, Save, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  setSales: (sales: Sale[]) => void;
  setProducts: (products: Product[]) => void;
  setCustomers: (customers: Customer[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ sales, products, customers, setSales, setProducts, setCustomers }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("ATENÇÃO: Restaurar um backup substituirá TODOS os dados atuais. Deseja continuar?")) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.system !== "ModaGestão AI") {
            throw new Error("Arquivo de backup inválido.");
        }

        if (data.products) setProducts(data.products);
        if (data.customers) setCustomers(data.customers);
        if (data.sales) setSales(data.sales);

        alert("Sistema restaurado com sucesso!");
      } catch (err) {
        console.error(err);
        alert("Erro ao ler arquivo de backup. Verifique se é um arquivo válido do ModaGestão.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearSystem = () => {
      const confirmText = "DELETAR";
      const input = prompt(`Para apagar TODOS os dados (produtos, clientes, vendas), digite "${confirmText}":`);
      
      if (input === confirmText) {
          setProducts([]);
          setCustomers([]);
          setSales([]);
          localStorage.clear();
          alert("Sistema resetado com sucesso.");
      }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <SettingsIcon className="text-slate-500" />
        Configurações & Dados
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-lg mb-4 text-slate-700">Backup e Restauração</h3>
            <p className="text-sm text-slate-500 mb-6">
                Como este sistema roda localmente no seu navegador, é fundamental baixar seus dados regularmente.
                Salve o arquivo em um local seguro (Google Drive, Email, Pen drive).
            </p>

            <div className="space-y-4">
                <button 
                    onClick={handleBackup}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                    <Download size={20} />
                    Baixar Cópia de Segurança (Backup)
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
                        className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Upload size={20} />
                        Restaurar Backup
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-lg mb-4 text-slate-700">Zona de Perigo</h3>
            <p className="text-sm text-slate-500 mb-6">
                Ações irreversíveis. Tenha cuidado.
            </p>

            <button 
                onClick={handleClearSystem}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
                <Trash2 size={20} />
                Apagar Todos os Dados
            </button>
        </div>

        <div className="md:col-span-2 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm">
                    <Save size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900 text-lg">Dica Operacional</h3>
                    <p className="text-indigo-800 mt-1">
                        Para usar este sistema em múltiplos computadores sem um servidor pago:
                    </p>
                    <ol className="list-decimal list-inside mt-2 text-indigo-700 space-y-1 text-sm">
                        <li>Ao final do dia, faça o <strong>Backup</strong> neste computador.</li>
                        <li>Envie o arquivo baixado para seu email ou Google Drive.</li>
                        <li>No outro computador, acesse o sistema e use <strong>Restaurar Backup</strong> com o arquivo mais recente.</li>
                    </ol>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;