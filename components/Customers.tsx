import React, { useState } from 'react';
import { Customer } from '../types';
import { UserPlus, Phone, Mail, User, Trash2 } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomers([...customers, { ...newCustomer, id: crypto.randomUUID() }]);
    setIsAdding(false);
    setNewCustomer({ name: '', phone: '', email: '' });
  };

  const deleteCustomer = (id: string) => {
    if (window.confirm("Excluir cliente?")) {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <UserPlus size={20} />
          Novo Cliente
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-rose-100">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase">Nome</label>
              <input required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full border p-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase">Telefone / WhatsApp</label>
              <input required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full border p-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase">Email (Opcional)</label>
              <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full border p-2 rounded-lg" />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Salvar Cliente</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-rose-200 transition-all group relative">
            <button onClick={() => deleteCustomer(customer.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={16} />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{customer.name}</h3>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  {customer.email}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Customers;