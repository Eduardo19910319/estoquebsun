import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, ShoppingCart, Menu, X, Settings as SettingsIcon } from 'lucide-react';
import { Customer, Product, Sale, ViewState } from './types';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Sales from './components/Sales';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './services/firebase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firestore State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Data Synchronization
  useEffect(() => {
    // Products Listener
    const qProducts = query(collection(db, "products"), orderBy("name"));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Product);
      setProducts(data);
    });

    // Customers Listener
    const qCustomers = query(collection(db, "customers"), orderBy("name"));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Customer);
      setCustomers(data);
    });

    // Sales Listener
    const qSales = query(collection(db, "sales"), orderBy("date", "desc"));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Sale);
      setSales(data);
    });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubSales();
    };
  }, []);

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Painel', icon: LayoutDashboard },
    { id: ViewState.SALES, label: 'Vendas', icon: ShoppingCart },
    { id: ViewState.INVENTORY, label: 'Estoque', icon: ShoppingBag },
    { id: ViewState.CUSTOMERS, label: 'Clientes', icon: Users },
    { id: ViewState.SETTINGS, label: 'Configurações', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
            ModaGestão
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id || (item.id === ViewState.SALES && currentView === ViewState.NEW_SALE)
                  ? 'bg-rose-50 text-rose-600 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          &copy; 2024 ModaGestão AI
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-white border-b border-slate-200 z-20 flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-rose-500">ModaGestão</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-10 pt-20 px-6 space-y-4 md:hidden">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-4 p-4 text-lg border-b border-slate-100 text-slate-700"
            >
              <item.icon size={24} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 pt-24 md:pt-6 max-w-7xl mx-auto w-full">
        {currentView === ViewState.DASHBOARD && <Dashboard sales={sales} products={products} customers={customers} changeView={setCurrentView} />}
        {currentView === ViewState.INVENTORY && <Inventory products={products} />}
        {currentView === ViewState.CUSTOMERS && <Customers customers={customers} />}
        {(currentView === ViewState.SALES || currentView === ViewState.NEW_SALE) && (
          <Sales
            sales={sales}
            products={products}
            customers={customers}
            currentView={currentView}
            changeView={setCurrentView}
          />
        )}
        {currentView === ViewState.SETTINGS && (
          <Settings
            sales={sales}
            products={products}
            customers={customers}
          />
        )}
      </main>
    </div>
  );
};

export default App;