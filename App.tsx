import React, { useState, useEffect, useRef } from 'react';
import { Users, Package, ShoppingCart, FileBarChart, Menu, X, Moon, Sun, LayoutDashboard, BookOpen, Download, Upload, Database, Pin, PinOff } from 'lucide-react';
import { CrewMember, Product, Transaction, ViewState, Theme, ReportSettings } from './types';
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

  // --- SETTINGS STATE ---
  const [theme, setTheme] = useState<Theme>('light'); // Default Light

  // --- DATA STATE & PERSISTENCE ---
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
      addedStock1: p.addedStock1 ?? p.addedStock ?? 0,
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
      exchangeRate: 1.1000 // Default Rate
    };
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('bsm_crew', JSON.stringify(crew));
  }, [crew]);

  useEffect(() => {
    localStorage.setItem('bsm_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('bsm_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('bsm_settings', JSON.stringify(reportSettings));
  }, [reportSettings]);

  useEffect(() => {
    localStorage.setItem('bsm_sidebar_pinned', JSON.stringify(isSidebarPinned));
  }, [isSidebarPinned]);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => {
      if (updatedTx.items.length === 0) {
        return prev.filter(t => t.id !== updatedTx.id);
      }
      const newTotal = updatedTx.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const finalTx = { ...updatedTx, totalAmount: newTotal };
      return prev.map(t => t.id === finalTx.id ? finalTx : t);
    });
  };

  const handleMonthReset = (nextMonth: string, nextYear: string) => {
    const updatedProducts = products.map(product => {
       let totalOut = 0;
       transactions.forEach(t => {
         const item = t.items.find(i => i.productId === product.id);
         if (item) totalOut += item.quantity;
       });
       const totalAdded = product.addedStock1 + product.addedStock2 + product.addedStock3;
       const finalStock = (product.initialStock + totalAdded) - totalOut;
       return {
         ...product,
         initialStock: finalStock,
         addedStock1: 0,
         addedStock2: 0,
         addedStock3: 0,
       };
    });
    setCrew(prev => prev.filter(c => c.isActive));
    setProducts(updatedProducts);
    setTransactions([]);
    setReportSettings(prev => ({
      ...prev,
      reportMonth: nextMonth,
      reportYear: nextYear
    }));
    setCurrentView('DASHBOARD');
  };

  const handleHardReset = () => {
    setCrew([]);
    setProducts([]);
    setTransactions([]);
    const today = new Date();
    setReportSettings({
      vesselName: '',
      masterName: '',
      reportMonth: String(today.getMonth() + 1).padStart(2, '0'),
      reportYear: String(today.getFullYear()),
      exchangeRate: 1.1000
    });
    localStorage.removeItem('bsm_crew');
    localStorage.removeItem('bsm_products');
    localStorage.removeItem('bsm_transactions');
    localStorage.removeItem('bsm_settings');
  };

  const t = (key: string): string => {
    return translations['en'][key] || key;
  };

  const handleSaveProject = async () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const suggestedName = `BSM_Backup_${dateStr}_${timeStr}.json`;

      const projectData = {
        version: '1.4',
        timestamp: now.toISOString(),
        crew,
        products,
        transactions,
        settings: reportSettings
      };

      const jsonString = JSON.stringify(projectData, null, 2);

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
              description: 'JSON Data File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(t('save_error'));
    }
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (!result) throw new Error("Empty file");
        const data = JSON.parse(result);
        if (!Array.isArray(data.crew) && !Array.isArray(data.products)) {
          throw new Error("Invalid structure");
        }
        if (window.confirm("Overwrite current data with this backup?")) {
           const migratedCrew = (data.crew || []).map((c: any) => ({
             ...c,
             isActive: c.isActive ?? true,
             currency: c.currency || 'EUR'
           }));
           setCrew(migratedCrew);
           const migratedProducts = (data.products || []).map((p: any) => ({
             ...p,
             addedStock1: p.addedStock1 ?? p.addedStock ?? 0,
             addedStock2: p.addedStock2 ?? 0,
             addedStock3: p.addedStock3 ?? 0,
             unitType: p.unitType || 'pcs',
             packSize: p.packSize || 1
           }));
           setProducts(migratedProducts);
           setTransactions(data.transactions || []);
           const migratedSettings = {
             vesselName: '',
             masterName: '',
             reportMonth: '01',
             reportYear: '2024',
             exchangeRate: 1.1000,
             ...(data.settings || {})
           };
           setReportSettings(migratedSettings);
           alert(t('import_success'));
        }
      } catch (err: any) {
        alert(`${t('import_error')} Details: ${err.message}`);
      } finally {
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
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
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`
          group fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 dark:bg-slate-950 text-white transform transition-all duration-300 ease-in-out no-print
          ${isSidebarPinned ? 'lg:static lg:translate-x-0' : 'lg:fixed lg:-translate-x-[calc(100%-8px)] lg:hover:translate-x-0'}
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-inherit'}
          flex flex-col border-r border-slate-700/50
        `}
      >
        <div className="p-6 border-b border-slate-700 relative">
          <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 lg:hidden text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-start justify-between">
             <div className="flex flex-col items-start gap-3">
                <div className="bg-white p-1.5 rounded-lg">
                  <img 
                    src="https://www.cldn.com/sites/default/files/CLdN_Logo_worldwide_logistiscs_specialist-.jpg" 
                    alt="CLdN Logo" 
                    className="h-8 w-auto object-contain" 
                  />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight">{t('app_title')}</h1>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate w-40">{reportSettings.vesselName || t('manager_version')}</p>
                </div>
             </div>
             
             {/* Pin Toggle Button */}
             <button 
               onClick={() => setIsSidebarPinned(!isSidebarPinned)}
               className="hidden lg:block p-3 -mr-3 text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95 bg-slate-800/50 rounded-xl"
               title="закрепи боковую панель или открепи"
             >
               {isSidebarPinned ? <PinOff className="w-6 h-6" /> : <Pin className="w-6 h-6" />}
             </button>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as ViewState);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Settings Area */}
        <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900 dark:bg-slate-950">
           
           {/* Data Management Section */}
           <div className="pb-4 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                 <Database className="w-3 h-3" />
                 <span className="whitespace-nowrap">{t('system_backup')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleSaveProject}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white text-xs gap-1"
                  title={t('save_project')}
                >
                  <Download className="w-4 h-4 text-green-500" />
                  <span>{t('save')}</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white text-xs gap-1"
                  title={t('load_project')}
                >
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>{t('load_project').split(' ')[0]}</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleLoadProject} accept=".json" className="hidden" />
              </div>
           </div>

           {/* Author & Theme Area */}
           <div className="space-y-4 px-2">
              <div className="text-[10px] text-slate-500 font-medium tracking-tight whitespace-nowrap">
                {t('app_author')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span className="whitespace-nowrap">Theme</span>
                </div>
                <button 
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className="bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors text-xs whitespace-nowrap w-24 text-center"
                >
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar (Mobile) */}
        <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm z-10 no-print">
           <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded-md border border-slate-200 dark:border-slate-600">
               <img 
                 src="https://www.cldn.com/sites/default/files/CLdN_Logo_worldwide_logistiscs_specialist-.jpg" 
                 alt="CLdN" 
                 className="h-6 w-auto object-contain" 
               />
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-white leading-tight">{t('app_title')}</span>
                {reportSettings.vesselName && <span className="text-xs text-slate-500">{reportSettings.vesselName}</span>}
             </div>
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
             <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
           </button>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 relative">
          {currentView === 'DASHBOARD' && (
            <Dashboard 
              settings={reportSettings} 
              setSettings={setReportSettings} 
              onResetMonth={handleMonthReset}
              onHardReset={handleHardReset}
              t={t} 
            />
          )}
          {currentView === 'CREW' && (
            <CrewManager crew={crew} setCrew={setCrew} t={t} />
          )}
          {currentView === 'INVENTORY' && (
            <InventoryManager products={products} setProducts={setProducts} transactions={transactions} t={t} />
          )}
          {currentView === 'DISTRIBUTION' && (
            <DistributionCenter 
              crew={crew} 
              products={products} 
              transactions={transactions} 
              addTransaction={addTransaction} 
              t={t}
            />
          )}
          {currentView === 'REPORTS' && (
            <FinancialReports 
              crew={crew} 
              products={products} 
              transactions={transactions}
              updateTransaction={handleUpdateTransaction}
              settings={reportSettings} 
              t={t} 
            />
          )}
          {currentView === 'INSTRUCTION' && (
            <Instruction t={t} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;