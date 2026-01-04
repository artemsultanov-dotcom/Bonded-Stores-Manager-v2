import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Transaction, TransactionType, ReportSettings } from '../types';
import { Package, Plus, Edit2, Trash2, Save, Cigarette, ChevronDown, ListFilter, X, Euro, PoundSterling } from 'lucide-react';

interface InventoryManagerProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  transactions: Transaction[];
  settings: ReportSettings; // Added settings prop
  t: (key: string) => string;
}

const CATEGORIES = ['Cigarettes', 'Soft Drinks', 'Water', 'Snacks', 'Other'];

export const InventoryManager: React.FC<InventoryManagerProps> = ({ products, setProducts, transactions, settings, t }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', category: CATEGORIES[0], priceEUR: '', priceGBP: '', unitType: 'pcs', packSize: '1',
    initialStock: '', addedStock1: '', addedStock2: '', addedStock3: ''
  });

  const resetForm = () => {
    setForm({ 
      name: '', category: CATEGORIES[0], priceEUR: '', priceGBP: '', unitType: 'pcs', packSize: '1', 
      initialStock: '', addedStock1: '', addedStock2: '', addedStock3: '' 
    });
    setIsAdding(false); setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name) return;
    const prodData: Product = {
      id: editingId || crypto.randomUUID(),
      name: form.name, 
      category: form.category, 
      price: Number(form.priceEUR) || 0, // Always save in EUR
      unitType: form.unitType, 
      packSize: Number(form.packSize) || 1,
      initialStock: Number(form.initialStock) || 0,
      addedStock1: Number(form.addedStock1) || 0, 
      addedStock2: Number(form.addedStock2) || 0, 
      addedStock3: Number(form.addedStock3) || 0
    };
    if (editingId) setProducts(products.map(p => p.id === editingId ? prodData : p));
    else setProducts([...products, prodData]);
    resetForm();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, 
      category: p.category, 
      priceEUR: p.price.toString(), // Always store EUR price
      priceGBP: settings.useGbpForPurchases && settings.gpbExchangeRate > 0 
                  ? (p.price * settings.gpbExchangeRate).toFixed(3) 
                  : '', // Calculate GBP if relevant
      unitType: p.unitType || 'pcs', 
      packSize: p.packSize?.toString() || '1',
      initialStock: p.initialStock.toString(), 
      addedStock1: p.addedStock1.toString(), 
      addedStock2: p.addedStock2.toString(), 
      addedStock3: p.addedStock3.toString()
    });
    setIsAdding(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handlePriceGBPChange = (value: string) => {
    const gbpValue = Number(value);
    setForm(prev => ({
      ...prev,
      priceGBP: value,
      priceEUR: gbpValue && settings.gpbExchangeRate > 0 ? (gbpValue / settings.gpbExchangeRate).toFixed(3) : ''
    }));
  };

  const handlePriceEURChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      priceEUR: value
    }));
  };

  const getProductStats = (p: Product) => {
    let crewOut = 0; let repOut = 0;
    const weekly = [0,0,0,0,0];
    transactions.forEach(t => {
      const item = t.items.find(i => i.productId === p.id);
      if (item) {
        if (t.type === TransactionType.CREW) {
          crewOut += item.quantity;
          const week = Math.min(Math.ceil(new Date(t.timestamp).getDate() / 7), 5);
          weekly[week-1] += item.quantity;
        } else repOut += item.quantity;
      }
    });
    return { crewOut, repOut, current: (p.initialStock + p.addedStock1 + p.addedStock2 + p.addedStock3) - (crewOut + repOut), weekly };
  };

  const totals = useMemo(() => {
    return products.reduce((acc, p) => {
       const stats = getProductStats(p);
       acc.val += stats.current * p.price;
       if (p.category === 'Cigarettes') acc.cig += stats.current;
       return acc;
    }, { val: 0, cig: 0 });
  }, [products, transactions]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Visual Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 flex items-center justify-between overflow-hidden relative">
            <div className="relative z-10">
               <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/80 mb-2">Inventory Value</p>
               <h3 className="text-4xl font-black">€{totals.val.toFixed(2)}</h3>
            </div>
            <Package className="w-32 h-32 absolute -right-4 -bottom-4 text-white/10 rotate-12" />
         </div>
         <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-center text-yellow-600"><Cigarette className="w-8 h-8" /></div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cigarettes Stock</p>
                  <div className="flex flex-col">
                    <p className="text-2xl font-black leading-tight">{totals.cig} <span className="text-xs text-slate-400 font-bold uppercase tracking-normal">Cartons</span></p>
                    <p className="text-[11px] font-bold text-blue-500/80 dark:text-blue-400/80">{(totals.cig * 200).toLocaleString()} <span className="uppercase tracking-tighter text-[9px]">Sticks Total</span></p>
                  </div>
               </div>
            </div>
            <button onClick={() => setIsAdding(true)} className="p-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg relative z-10"><Plus className="w-6 h-6" /></button>
            <Cigarette className="w-24 h-24 absolute -right-6 -bottom-6 text-slate-100 dark:text-slate-700/30 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
         </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-black tracking-tight">{editingId ? 'Edit Product' : 'Register New Product'}</h3>
             <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-2 group">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1 group-focus-within:text-blue-600 transition-colors">{t('name')}</label>
              <input ref={nameInputRef} type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 outline-none font-normal" />
            </div>
            <div className="group">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1">{t('category')}</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 outline-none font-normal appearance-none">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
            </div>
            
            {settings.useGbpForPurchases ? (
              <>
                <div className="group">
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1">{t('price_gbp')}</label>
                  <div className="relative">
                    <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      step="0.001" 
                      value={form.priceGBP} 
                      onChange={e => handlePriceGBPChange(e.target.value)} 
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-normal" 
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1">{t('price')} (€)</label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      step="0.001" 
                      value={form.priceEUR} 
                      readOnly 
                      disabled 
                      className="w-full pl-9 pr-4 py-3 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-2xl outline-none cursor-not-allowed font-normal text-slate-600 dark:text-slate-400" 
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="group">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1">{t('price')} (€)</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    step="0.001" 
                    value={form.priceEUR} 
                    onChange={e => handlePriceEURChange(e.target.value)} 
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-normal" 
                  />
                </div>
              </div>
            )}

            <div className="group">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1">{t('initial_stock')}</label>
              <input type="number" value={form.initialStock} onChange={e => setForm({...form, initialStock: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 outline-none font-normal" />
            </div>
            {['1', '2', '3'].map(num => (
              <div key={num} className="group">
                 <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block px-1">{t(`supply_${num}`)}</label>
                 <input type="number" value={(form as any)[`addedStock${num}`]} onChange={e => setForm({...form, [`addedStock${num}`]: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 outline-none font-normal" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={handleSave} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 flex items-center gap-2"><Save className="w-4 h-4" /> Save Product</button>
          </div>
        </div>
      )}

      {/* Modern Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 px-4 sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.05)] w-64">{t('name')}</th>
                <th className="py-2 px-4 text-right">€/Unit</th>
                <th className="py-2 px-4 text-center">Start</th>
                <th className="py-2 px-4 text-center bg-green-50/30 dark:bg-green-900/10">Supplies</th>
                <th className="py-2 px-4 text-center bg-blue-50/30 dark:bg-blue-900/10" colSpan={5}>Weekly Issues (Crew)</th>
                <th className="py-2 px-4 text-center font-bold text-slate-900 dark:text-white">Current</th>
                <th className="py-2 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {CATEGORIES.map(cat => {
                const items = products.filter(p => p.category === cat);
                if (!items.length) return null;
                return (
                  <React.Fragment key={cat}>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30"><td colSpan={11} className="px-4 py-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{cat}</td></tr>
                    {items.map(p => {
                      const stats = getProductStats(p);
                      return (
                        <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="py-1.5 px-4 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-inherit z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                             <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{p.name}</div>
                             <div className="text-[9px] text-slate-400 font-bold uppercase">{p.unitType} × {p.packSize}</div>
                          </td>
                          <td className="py-1.5 px-4 text-right font-mono font-bold text-slate-600 text-sm">€{p.price.toFixed(2)}</td>
                          <td className="py-1.5 px-4 text-center font-bold text-slate-500 text-sm">{p.initialStock}</td>
                          <td className="py-1.5 px-4 text-center bg-green-50/20 dark:bg-green-900/5">
                             <div className="flex gap-2 justify-center text-[10px] font-bold">
                                {p.addedStock1 > 0 && <span className="text-green-600">+{p.addedStock1}</span>}
                                {p.addedStock2 > 0 && <span className="text-green-600">+{p.addedStock2}</span>}
                                {p.addedStock3 > 0 && <span className="text-green-600">+{p.addedStock3}</span>}
                                {!p.addedStock1 && !p.addedStock2 && !p.addedStock3 && <span className="text-slate-300">-</span>}
                             </div>
                          </td>
                          {stats.weekly.map((qty, idx) => (
                             <td key={idx} className="py-1.5 px-4 text-center text-[10px] font-bold text-slate-400 bg-blue-50/10 dark:bg-blue-900/5">{qty > 0 ? qty : '-'}</td>
                          ))}
                          <td className="py-1.5 px-4 text-center"><div className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs ${stats.current < 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white'}`}>{stats.current}</div></td>
                          <td className="py-1.5 px-4 text-right">
                             <div className="flex justify-end gap-1">
                                <button onClick={() => startEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
