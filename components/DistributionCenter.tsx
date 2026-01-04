import React, { useState, useMemo } from 'react';
import { CrewMember, Product, Transaction, TransactionType, TransactionItem } from '../types';
import { ShoppingCart, Plus, Minus, User, Building, Trash, Calendar, Tag } from 'lucide-react';

interface DistributionCenterProps {
  crew: CrewMember[];
  products: Product[];
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  t: (key: string) => string;
}

type ProductWithStock = Product & { stock: number };

const RANKS = [
  "Master", "Ch. Off", "1st Off", "2nd Off", "3rd Off", "JDO", 
  "Ch. Eng", "2nd Eng", "3rd Eng", "4th Eng", "ETO", "JEO", "JETO", 
  "Fitter", "M/Man", "Bosun", "A.B", "O.S", "Cook", "Steward", 
  "Deck Cad.", "Eng Cad."
];

const CATEGORY_ORDER = ['Cigarettes', 'Soft Drinks', 'Water', 'Snacks', 'Other'];

export const DistributionCenter: React.FC<DistributionCenterProps> = ({ crew, products, transactions, addTransaction, t }) => {
  const [mode, setMode] = useState<TransactionType>(TransactionType.CREW);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [repName, setRepName] = useState('');
  const [repType, setRepType] = useState<'CHARTERER' | 'OWNER'>('CHARTERER');
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // Removed searchQuery state
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const availableProducts = useMemo<ProductWithStock[]>(() => {
    return products.map(p => {
      const distributed = transactions.reduce((acc, t) => {
        const item = t.items.find(i => i.productId === p.id);
        return acc + (item ? item.quantity : 0);
      }, 0);
      const totalAdded = p.addedStock1 + p.addedStock2 + p.addedStock3;
      const stock = (p.initialStock + totalAdded) - distributed;
      return { ...p, stock };
    }).filter(p => p.stock > 0);
  }, [products, transactions]);

  // Updated filteredProducts to only filter by activeCategory (searchQuery removed)
  const filteredProducts = useMemo(() => {
    const productsToSort = activeCategory === 'ALL'
      ? availableProducts
      : availableProducts.filter(p => p.category === activeCategory);
      
    return productsToSort.sort((a,b) => a.name.localeCompare(b.name));
  }, [availableProducts, activeCategory]);

  const activeCrew = useMemo(() => {
    return crew
      .filter(c => c.isActive)
      .sort((a, b) => {
        const rankIndexA = RANKS.indexOf(a.rank);
        const rankIndexB = RANKS.indexOf(b.rank);
        const valA = rankIndexA === -1 ? 999 : rankIndexA;
        const valB = rankIndexB === -1 ? 999 : rankIndexB;
        if (valA !== valB) return valA - valB;
        return a.name.localeCompare(b.name);
      });
  }, [crew]);

  const cartTotal = cart.reduce((total, item) => {
    const p = products.find(prod => prod.id === item.productId);
    return total + (p ? p.price * item.quantity : 0);
  }, 0);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      const product = availableProducts.find(p => p.id === productId);
      const inCartQty = existing ? existing.quantity : 0;
      if (product && inCartQty < product.stock) {
        if (existing) return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { productId, quantity: 1 }];
      }
      return prev;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing && existing.quantity > 1) return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.productId !== productId);
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (mode === TransactionType.CREW && !selectedRecipientId) return alert(t('alert_select_crew'));
    if (mode === TransactionType.REPRESENTATION && !repName) return alert(t('alert_select_rep'));

    const recipientName = mode === TransactionType.CREW ? crew.find(c => c.id === selectedRecipientId)?.name || 'Unknown' : repName;
    const items: TransactionItem[] = cart.map(item => {
      const p = products.find(prod => prod.id === item.productId)!;
      return { productId: p.id, productName: p.name, quantity: item.quantity, unitPrice: p.price };
    });

    const d = new Date(date);
    const timestamp = d.getTime();

    addTransaction({
      id: crypto.randomUUID(), timestamp, type: mode, recipientId: mode === TransactionType.CREW ? selectedRecipientId : repName, 
      recipientName, representationType: mode === TransactionType.REPRESENTATION ? repType : undefined,
      items, totalAmount: cartTotal
    });
    setCart([]); setSelectedRecipientId(''); setRepName('');
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'Cigarettes': return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'Soft Drinks': return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10';
      case 'Water': return 'border-l-sky-500 bg-sky-50/50 dark:bg-sky-900/10';
      case 'Snacks': return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10';
      default: return 'border-l-slate-400 bg-slate-50 dark:bg-slate-800/50';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] animate-in fade-in duration-500">
      
      {/* Left Area: Product Selector */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Filters (Search removed) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
           <div className="flex flex-col md:flex-row gap-4">
              {/* Search input removed */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1"> {/* Adjusted flex-1 after removing search */}
                <button 
                    onClick={() => setActiveCategory('ALL')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCategory === 'ALL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >All Items</button>
                {CATEGORY_ORDER.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >{t(`cat_${cat.toLowerCase().replace(/ /g, '_')}`) || cat}</button>
                ))}
              </div>
           </div>
        </div>

        {/* Product Grid - Grouped by Category */}
        <div className="flex-1 overflow-y-auto pr-2 pb-8">
           {CATEGORY_ORDER.map(category => {
              const productsInCategory = filteredProducts.filter(p => p.category === category);
              if (productsInCategory.length === 0) return null;

              return (
                 <div key={category} className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 bg-slate-100 dark:bg-slate-800/50 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
                       {t(`cat_${category.toLowerCase().replace(/ /g, '_')}`) || category}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                       {productsInCategory.map(p => (
                         <div 
                            key={p.id} 
                            onClick={() => addToCart(p.id)}
                            // Card height reduced to h-24, padding to p-3, and internal elements adjusted
                            className={`group cursor-pointer p-3 rounded-2xl border-l-4 border-y border-r border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between h-24 ${getCategoryColor(p.category)}`}
                         >
                            <div>
                               <div className="flex justify-between items-start mb-1">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded-lg">{p.category}</span>
                                  <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> {p.stock} left</div>
                               </div>
                               <h4 className="font-bold text-slate-800 dark:text-white leading-tight line-clamp-1 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.name}</h4>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50 mt-1">
                               <p className="text-base font-black text-slate-900 dark:text-white">€{p.price.toFixed(2)}</p>
                               <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              );
           })}
           {filteredProducts.length === 0 && (
             <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 opacity-50"><ShoppingCart className="w-12 h-12 mb-4" /><p className="font-bold">No products available</p></div>
           )}
        </div>
      </div>

      {/* Right Area: Checkout Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-4 no-print h-full">
         <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
               <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /><h3 className="font-bold">{t('total')}</h3></div>
               <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg uppercase">{cart.length} Items</div>
            </div>

            <div className="p-4 space-y-4 border-b border-slate-100 dark:border-slate-700">
               <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button onClick={() => setMode(TransactionType.CREW)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === TransactionType.CREW ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}><User className="w-3.5 h-3.5" /> Crew</button>
                  <button onClick={() => setMode(TransactionType.REPRESENTATION)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === TransactionType.REPRESENTATION ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm' : 'text-slate-500'}`}><Building className="w-3.5 h-3.5" /> Rep.</button>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Issue Date</label>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                     <Calendar className="w-4 h-4 text-slate-400" />
                     <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-blue-600 dark:text-blue-400 flex-1" />
                  </div>
               </div>

               {mode === TransactionType.CREW ? (
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Recipient</label>
                    <select 
                      value={selectedRecipientId} 
                      onChange={e => setSelectedRecipientId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    >
                      <option value="">{t('select_crew')}</option>
                      {activeCrew.map(c => <option key={c.id} value={c.id}>{c.name} ({c.rank})</option>)}
                    </select>
                 </div>
               ) : (
                 <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Account</label>
                       <div className="flex gap-2">
                          <button onClick={() => setRepType('CHARTERER')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${repType === 'CHARTERER' ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>Charterer</button>
                          <button onClick={() => setRepType('OWNER')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${repType === 'OWNER' ? 'bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>Owner</button>
                       </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Recipient Name / Reason</label>
                       <input type="text" value={repName} onChange={e => setRepName(e.target.value)} placeholder="Agent, Port, etc." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold" />
                    </div>
                 </div>
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
               {cart.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40"><ShoppingCart className="w-12 h-12 mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Cart is empty</p></div>
               ) : (
                 cart.map(item => {
                    const p = products.find(prod => prod.id === item.productId)!;
                    return (
                      <div key={item.productId} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                         <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate leading-tight">{p.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">€{p.price.toFixed(2)}</p>
                         </div>
                         <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shrink-0">
                            <button onClick={() => removeFromCart(p.id)} className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                            <button onClick={() => addToCart(p.id)} className="p-1 hover:bg-green-50 text-slate-500 hover:text-green-600 transition-colors"><Plus className="w-3 h-3" /></button>
                         </div>
                      </div>
                    );
                 })
               )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700">
               <div className="flex justify-between items-baseline mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grand Total</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">€{cartTotal.toFixed(2)}</span>
               </div>
               <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-[0.98] ${mode === TransactionType.CREW ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'} disabled:opacity-50 disabled:grayscale disabled:shadow-none`}
               >Confirm Issue</button>
            </div>
         </div>
      </div>
    </div>
  );
};
