import React, { useState, useMemo } from 'react';
import { CrewMember, Product, Transaction, TransactionType, TransactionItem } from '../types';
import { ShoppingCart, Plus, Minus, User, Building, Trash, Calendar } from 'lucide-react';

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
  const [repName, setRepName] = useState(''); // Only for Representation
  const [repType, setRepType] = useState<'CHARTERER' | 'OWNER'>('CHARTERER'); // For Rep
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter products that have stock
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

  // Group products by category
  const groupedProducts = useMemo<Record<string, ProductWithStock[]>>(() => {
    const groups: Record<string, ProductWithStock[]> = {};
    availableProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [availableProducts]);

  // Filter active crew and sort by Rank (matching CrewManager)
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

  // Derived logic
  const cartTotal = cart.reduce((total, item) => {
    const p = products.find(prod => prod.id === item.productId);
    return total + (p ? p.price * item.quantity : 0);
  }, 0);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      const product = availableProducts.find(p => p.id === productId);
      
      // Calculate how many are already in cart
      const inCartQty = existing ? existing.quantity : 0;
      
      if (product && inCartQty < product.stock) {
        if (existing) {
          return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { productId, quantity: 1 }];
      }
      return prev;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.productId !== productId);
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (mode === TransactionType.CREW && !selectedRecipientId) return alert(t('alert_select_crew'));
    if (mode === TransactionType.REPRESENTATION && !repName) return alert(t('alert_select_rep'));

    const recipientName = mode === TransactionType.CREW 
      ? crew.find(c => c.id === selectedRecipientId)?.name || 'Unknown' 
      : repName;

    const items: TransactionItem[] = cart.map(item => {
      const p = products.find(prod => prod.id === item.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        quantity: item.quantity,
        unitPrice: p.price
      };
    });

    // Create timestamp from selected date
    const dateParts = date.split('-');
    const timestamp = new Date(
      parseInt(dateParts[0]), 
      parseInt(dateParts[1]) - 1, 
      parseInt(dateParts[2])
    ).getTime();

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      timestamp: timestamp,
      type: mode,
      recipientId: mode === TransactionType.CREW ? selectedRecipientId : repName, 
      recipientName,
      representationType: mode === TransactionType.REPRESENTATION ? repType : undefined,
      items,
      totalAmount: cartTotal
    };

    addTransaction(newTransaction);
    setCart([]);
    setSelectedRecipientId(''); // Reset crew selection dropdown
    if (mode === TransactionType.REPRESENTATION) setRepName('');
  };

  // Helper to get color theme for category
  const getCategoryTheme = (category: string) => {
    switch(category) {
      case 'Cigarettes':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'Soft Drinks':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'Water':
        return 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800';
      case 'Snacks':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      default:
        // Other / Others
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in h-[calc(100vh-140px)]">
      
      {/* Left Panel: Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2 pb-20 space-y-4">
          {CATEGORY_ORDER.map((category) => {
            const items = groupedProducts[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 px-1 sticky top-0 bg-slate-100 dark:bg-slate-900 py-1.5 z-10 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border-b border-slate-200 dark:border-slate-800">
                   {t(`cat_${category.toLowerCase().replace(/ /g, '_')}`) || category}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                  {items.map(product => (
                    <div key={product.id} className={`${getCategoryTheme(product.category)} p-1.5 rounded-lg shadow-sm border flex flex-col justify-between hover:shadow-md transition-shadow group`}>
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded uppercase tracking-wide truncate max-w-[50px]" title={product.category}>{product.category}</span>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">Qty: {product.stock}</span>
                        </div>
                        <h4 className="font-semibold text-slate-800 dark:text-white leading-tight mb-0.5 text-xs sm:text-sm line-clamp-2 h-6 sm:h-8" title={product.name}>{product.name}</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-mono">€{product.price.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(product.id)}
                        className="mt-1 w-full bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-white py-1 rounded-md flex items-center justify-center gap-1 transition-all active:scale-95 text-[10px] sm:text-xs font-medium shadow-sm"
                      >
                        <Plus className="w-3 h-3" /> {t('checkout_crew')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Cart & Checkout */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2 pt-2">
              <ShoppingCart className="w-4 h-4" /> {t('menu_distribution')}
            </h3>
            {/* Date Picker - Resized and Stylized as requested */}
            <div className="flex flex-col items-end gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mr-1">
                Select date of issue
              </label>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-600 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-500 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
                 <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                 <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-red-600 dark:text-red-500 w-36 font-bold text-center"
                 />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
            <button 
              onClick={() => { setMode(TransactionType.CREW); setCart([]); }}
              className={`flex-1 py-1 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all ${mode === TransactionType.CREW ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <User className="w-3.5 h-3.5" /> {t('crew')}
            </button>
            <button 
              onClick={() => { setMode(TransactionType.REPRESENTATION); setCart([]); }}
              className={`flex-1 py-1 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all ${mode === TransactionType.REPRESENTATION ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <Building className="w-3.5 h-3.5" /> {t('representation')}
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          {mode === TransactionType.CREW ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('crew_list')}</label>
              <select 
                value={selectedRecipientId} 
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">{t('select_crew')}</option>
                {activeCrew.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.rank})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Account Type Toggle */}
              <div>
                 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('rep_account')}</label>
                 <div className="flex gap-2">
                    <button 
                       onClick={() => setRepType('CHARTERER')}
                       className={`flex-1 py-1.5 text-xs border rounded-lg transition-colors ${repType === 'CHARTERER' ? 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-200' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}`}
                    >
                      {t('rep_charterers')}
                    </button>
                    <button 
                       onClick={() => setRepType('OWNER')}
                       className={`flex-1 py-1.5 text-xs border rounded-lg transition-colors ${repType === 'OWNER' ? 'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-200' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}`}
                    >
                      {t('rep_owners')}
                    </button>
                 </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('rep_reason')}</label>
                <input 
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder={t('rep_placeholder')}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">{t('cart_empty')}</p>
            </div>
          ) : (
            cart.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              return (
                <div key={item.productId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-slate-800 dark:text-white text-xs truncate" title={product.name}>{product.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">€{product.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-mono font-medium text-slate-700 dark:text-slate-200 text-xs">
                      €{(product.price * item.quantity).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-md overflow-hidden">
                      <button onClick={() => removeFromCart(item.productId)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200">
                         {item.quantity === 1 ? <Trash className="w-3 h-3 text-red-500"/> : <Minus className="w-3 h-3"/>}
                      </button>
                      <span className="text-[10px] w-5 text-center font-semibold dark:text-white">{item.quantity}</span>
                      <button onClick={() => addToCart(item.productId)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-end mb-3">
            <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">{t('total')}:</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-white">€{cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-2.5 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98] flex justify-center gap-2 items-center text-sm
              ${mode === TransactionType.CREW ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200 dark:shadow-none'}
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
            `}
          >
            {mode === TransactionType.CREW ? t('checkout_crew') : t('checkout_rep')}
          </button>
        </div>
      </div>
    </div>
  );
};