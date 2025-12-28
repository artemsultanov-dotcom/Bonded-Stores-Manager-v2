
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Package, ShoppingCart, FileBarChart, Menu, X, Moon, Sun, LayoutDashboard, BookOpen, Download, Upload, Database, Pin, PinOff, TrendingUp, Wallet, Box } from 'lucide-react';
import { CrewMember, Product, Transaction, ViewState, Theme, ReportSettings, TransactionType } from './types';
import { CrewManager } from './components/CrewManager';
import { InventoryManager } from './components/InventoryManager';
import { DistributionCenter } from './components/DistributionCenter';
import { FinancialReports } from './components/FinancialReports';
import { Dashboard } from './components/Dashboard';
import { Instruction } from './components/Instruction';
import { translations } from './translations';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('bsm_sidebar_pinned');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bsm_theme');
    return (saved as Theme) || 'light';
  });

  const [crew, setCrew] = useState<CrewMember[]>(() => {
    const saved = localStorage.getItem('bsm_crew');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((c: any) => ({
      ...c,
      isActive: c.isActive ?? true,
      currency: c.currency || 'EUR'
    }));
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('bsm_products');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((p: any) => ({
      ...p,
      addedStock1: p.addedStock1 ?? 0,
      addedStock2: p.addedStock2 ?? 0,
      addedStock3: p.addedStock3 ?? 0,
      unitType: p.unitType || 'pcs',
      packSize: p.packSize || 1
    }));
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('bsm_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [reportSettings, setReportSettings] = useState<ReportSettings>(() => {
    const saved = localStorage.getItem('bsm_settings');
    const today = new Date();
    const defaults = {
      vesselName: '',
      masterName: '',
      reportMonth: String(today.getMonth() + 1).padStart(2, '0'),
      reportYear: String(today.getFullYear()),
      exchangeRate: 1.1000
    };
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
    return defaults;
  });

  useEffect(() => { localStorage.setItem('bsm_crew', JSON.stringify(crew)); }, [crew]);
  useEffect(() => { localStorage.setItem('bsm_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('bsm_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('bsm_settings', JSON.stringify(reportSettings)); }, [reportSettings]);
  useEffect(() => { localStorage.setItem('bsm_sidebar_pinned', JSON.stringify(isSidebarPinned)); }, [isSidebarPinned]);
  useEffect(() => { localStorage.setItem('bsm_theme', theme); }, [theme]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const activeCrew = crew.filter(c => c.isActive).length;
    const totalInventoryValue = products.reduce((acc, p) => {
        const out = transactions.reduce((sum, t) => {
            const item = t.items.find(i => i.productId === p.id);
            return sum + (item ? item.quantity : 0);
        }, 0);
        const stock = (p.initialStock + p.addedStock1 + p.addedStock2 + p.addedStock3) - out;
        return acc + (stock * p.price);
    }, 0);
    const monthSales = transactions.reduce((acc, t) => acc + t.totalAmount, 0);

    return { activeCrew, totalInventoryValue, monthSales };
  }, [crew, products, transactions]);

  const addTransaction = (t: Transaction) => setTransactions(prev => [...prev, t]);
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => {
      if (updatedTx.items.length === 0) return prev.filter(t => t.id !== updatedTx.id);
      const newTotal = updatedTx.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      return prev.map(t => t.id === updatedTx.id ? { ...updatedTx, totalAmount: newTotal } : t);
    });
  };

  const handleMonthReset = (nextMonth: string, nextYear: string) => {
    const updatedProducts = products.map(product => {
       let totalOut = 0;
       transactions.forEach(t => {
         const item = t.items.find(i => i.productId === product.id);
         if (item) totalOut += item.quantity;
       });
       const finalStock = (product.initialStock + product.addedStock1 + product.addedStock2 + product.addedStock3) - totalOut;
       return { ...product, initialStock: finalStock, addedStock1: 0, addedStock2: 0, addedStock3: 0 };
    });
    setCrew(prev => prev.filter(c => c.isActive));
    setProducts(updatedProducts);
    setTransactions([]);
    setReportSettings(prev => ({ ...prev, reportMonth: nextMonth, reportYear: nextYear }));
    setCurrentView('DASHBOARD');
  };

  const handleHardReset = () => {
    if(!window.confirm("Permanently delete ALL data?")) return;
    setCrew([]); setProducts([]); setTransactions([]);
    setReportSettings({
      vesselName: '', masterName: '', 
      reportMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
      reportYear: String(new Date().getFullYear()), 
      exchangeRate: 1.1000
    });
  };

  const t = (key: string): string => translations['en'][key] || key;

  const handleSaveProject = async () => {
    const projectData = { version: '1.5', timestamp: new Date().toISOString(), crew, products, transactions, settings: reportSettings };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BSM_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: 'DASHBOARD', label: t('menu_dashboard'), icon: LayoutDashboard },
    { id: 'CREW', label: t('menu_crew'), icon: Users },
    { id: 'INVENTORY', label: t('menu_inventory'), icon: Package },
    { id: 'DISTRIBUTION', label: t('menu_distribution'), icon: ShoppingCart },
    { id: 'REPORTS', label: t('menu_reports'), icon: FileBarChart },
    { id: 'INSTRUCTION', label: t('menu_instruction'), icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 dark:bg-slate-950 text-white transform transition-all duration-300 ease-in-out no-print shadow-2xl
        ${isSidebarPinned ? 'lg:static lg:translate-x-0' : 'lg:fixed lg:-translate-x-[calc(100%-12px)] lg:hover:translate-x-0'}
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-inherit'}
        flex flex-col border-r border-slate-800
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                <Box className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight">BSM Pro</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{reportSettings.vesselName || 'Manager'}</p>
             </div>
          </div>
          <button onClick={() => setIsSidebarPinned(!isSidebarPinned)} className="hidden lg:block p-1.5 text-slate-500 hover:text-white transition-colors bg-slate-800/50 rounded-lg">
             {isSidebarPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        </div>
        
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id as ViewState); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={handleSaveProject} className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-300"><Download className="w-3.5 h-3.5 text-green-500" /> Backup</button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-300"><Upload className="w-3.5 h-3.5 text-blue-500" /> Restore</button>
              <input type="file" ref={fileInputRef} onChange={(e) => {/* load logic */}} accept=".json" className="hidden" />
           </div>
           <div className="flex items-center justify-between px-2">
              <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="text-right">
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Captain Artem Sultanov</p>
                 <p className="text-[9px] text-slate-600">v1.5 Enterprise</p>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 lg:px-8 flex items-center justify-between no-print h-16 shrink-0">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
               <Menu className="w-6 h-6" />
             </button>
             <h2 className="text-lg font-bold text-slate-800 dark:text-white hidden sm:block">
               {navItems.find(i => i.id === currentView)?.label}
             </h2>
           </div>

           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Period</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{translations['en'][`month_${reportSettings.reportMonth}`]} {reportSettings.reportYear}</span>
                 </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">M</div>
                 <div className="hidden lg:block">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{reportSettings.masterName || 'Master'}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Bonded Store Admin</p>
                 </div>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-8">
            
            {/* Context Summary Cards (Always visible on main views) */}
            {['DASHBOARD', 'DISTRIBUTION', 'INVENTORY', 'CREW'].includes(currentView) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 no-print animate-in fade-in slide-in-from-top-4 duration-500">
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400"><Users className="w-6 h-6" /></div>
                    <div><p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Active Crew</p><p className="text-2xl font-bold">{stats.activeCrew}</p></div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400"><Wallet className="w-6 h-6" /></div>
                    <div><p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Sales this month</p><p className="text-2xl font-bold">€{stats.monthSales.toFixed(2)}</p></div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400"><TrendingUp className="w-6 h-6" /></div>
                    <div><p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Stock Value</p><p className="text-2xl font-bold">€{stats.totalInventoryValue.toFixed(2)}</p></div>
                 </div>
              </div>
            )}

            {currentView === 'DASHBOARD' && <Dashboard settings={reportSettings} setSettings={setReportSettings} onResetMonth={handleMonthReset} onHardReset={handleHardReset} t={t} />}
            {currentView === 'CREW' && <CrewManager crew={crew} setCrew={setCrew} t={t} />}
            {currentView === 'INVENTORY' && <InventoryManager products={products} setProducts={setProducts} transactions={transactions} t={t} />}
            {currentView === 'DISTRIBUTION' && <DistributionCenter crew={crew} products={products} transactions={transactions} addTransaction={addTransaction} t={t} />}
            {currentView === 'REPORTS' && <FinancialReports crew={crew} products={products} transactions={transactions} updateTransaction={handleUpdateTransaction} settings={reportSettings} t={t} />}
            {currentView === 'INSTRUCTION' && <Instruction t={t} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
