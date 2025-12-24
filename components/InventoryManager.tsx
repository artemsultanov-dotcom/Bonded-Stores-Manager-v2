
import React, { useState, useMemo, useRef } from 'react';
import { Product, Transaction, TransactionType } from '../types';
import { Package, Plus, Edit2, Trash2, Save, Cigarette } from 'lucide-react';

interface InventoryManagerProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  transactions: Transaction[];
  t: (key: string) => string;
}

const CATEGORIES = ['Cigarettes', 'Soft Drinks', 'Water', 'Snacks', 'Other'];

export const InventoryManager: React.FC<InventoryManagerProps> = ({ products, setProducts, transactions, t }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Ref for auto-focusing Name field
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Form State (Using strings for numbers to allow empty values in inputs)
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [unitType, setUnitType] = useState('pcs');
  const [packSize, setPackSize] = useState('1');
  const [initialStock, setInitialStock] = useState('');
  const [addedStock1, setAddedStock1] = useState('');
  const [addedStock2, setAddedStock2] = useState('');
  const [addedStock3, setAddedStock3] = useState('');

  const resetForm = () => {
    setName('');
    setCategory(CATEGORIES[0]);
    setPrice('');
    setUnitType('pcs');
    setPackSize('1');
    setInitialStock('');
    setAddedStock1('');
    setAddedStock2('');
    setAddedStock3('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!name) return;
    const numPrice = Number(price) || 0;
    
    const newProduct: Product = {
      id: crypto.randomUUID(),
      name,
      category: category,
      price: numPrice,
      unitType,
      packSize: Number(packSize) || 1,
      initialStock: Number(initialStock) || 0,
      addedStock1: Number(addedStock1) || 0,
      addedStock2: Number(addedStock2) || 0,
      addedStock3: Number(addedStock3) || 0,
    };
    setProducts([...products, newProduct]);
    resetForm();
    
    // Set cursor back to Name field
    setTimeout(() => {
        setIsAdding(true); // Keep adding mode open as requested by "place cursor in Name cell" flow
        setTimeout(() => nameInputRef.current?.focus(), 0);
    }, 0);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category);
    setPrice(product.price.toString());
    setUnitType(product.unitType || 'pcs');
    setPackSize(product.packSize?.toString() || '1');
    setInitialStock(product.initialStock.toString());
    setAddedStock1(product.addedStock1.toString());
    setAddedStock2(product.addedStock2.toString());
    setAddedStock3(product.addedStock3.toString());
    setIsAdding(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleUpdate = () => {
    if (!editingId || !name) return;
    const updated = products.map(p => 
      p.id === editingId 
        ? { 
            ...p, 
            name, 
            category, 
            price: Number(price) || 0, 
            unitType,
            packSize: Number(packSize) || 1,
            initialStock: Number(initialStock) || 0, 
            addedStock1: Number(addedStock1) || 0,
            addedStock2: Number(addedStock2) || 0,
            addedStock3: Number(addedStock3) || 0
          } 
        : p
    );
    setProducts(updated);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('delete_confirm_product'))) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // Helper to calculate stock stats
  const getProductStats = (product: Product) => {
    let crewOut = 0;
    let repOut = 0;

    transactions.forEach(t => {
      const item = t.items.find(i => i.productId === product.id);
      if (item) {
        if (t.type === TransactionType.CREW) crewOut += item.quantity;
        if (t.type === TransactionType.REPRESENTATION) repOut += item.quantity;
      }
    });

    const totalAdded = product.addedStock1 + product.addedStock2 + product.addedStock3;
    const totalOut = crewOut + repOut;
    const currentStock = (product.initialStock + totalAdded) - totalOut;

    return { crewOut, repOut, currentStock };
  };

  // Memoized totals calculation for the footer and cigarette summary
  const { totals, cigaretteStats } = useMemo(() => {
    let tInitial = 0;
    let tS1 = 0;
    let tS2 = 0;
    let tS3 = 0;
    let tCurrent = 0;
    let tCrewOut = 0;
    let tRepOut = 0;

    let cigCartons = 0;

    products.forEach(p => {
       const { currentStock, crewOut, repOut } = getProductStats(p);
       const pValue = p.price;
       
       tInitial += p.initialStock * pValue;
       tS1 += p.addedStock1 * pValue;
       tS2 += p.addedStock2 * pValue;
       tS3 += p.addedStock3 * pValue;
       tCurrent += currentStock * pValue;
       tCrewOut += crewOut * pValue;
       tRepOut += repOut * pValue;

       // Cigarette stats
       if (p.category === 'Cigarettes') {
         cigCartons += currentStock;
       }
    });

    return { 
      totals: { tInitial, tS1, tS2, tS3, tCurrent, tCrewOut, tRepOut },
      cigaretteStats: {
        cartons: cigCartons,
        units: cigCartons * 200
      }
    };
  }, [products, transactions]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Cigarette Summary Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
             <Cigarette className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">{t('total_cigarettes')}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{cigaretteStats.cartons}</span>
              <span className="text-sm text-slate-300">{t('cartons')}</span>
            </div>
          </div>
        </div>
        <div className="text-right border-l border-white/10 pl-6">
           <p className="text-xs text-slate-400 uppercase font-medium">{t('units')}</p>
           <p className="text-2xl font-mono font-bold text-yellow-400">{cigaretteStats.units.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Package className="w-6 h-6" />
          {t('inventory')}
        </h2>
        <button
          onClick={() => {
              setIsAdding(true);
              setTimeout(() => nameInputRef.current?.focus(), 0);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          disabled={isAdding && !editingId}
        >
          <Plus className="w-4 h-4" /> {t('add_product')}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-4 text-lg text-slate-800 dark:text-white">{editingId ? t('edit_product') : t('add_product')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('name')}</label>
              <input 
                ref={nameInputRef}
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Marlboro Red" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('category')}</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Price, Unit Type, Pack Size */}
            <div className="flex gap-2">
               <div className="flex-1">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('price')}</label>
                 <input 
                    type="number" 
                    step="0.001" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500" 
                 />
               </div>
               <div className="w-20">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('unit_type')}</label>
                  <input type="text" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="pcs" className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 text-center" />
               </div>
               <div className="w-16">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" title={t('pack_size')}>Size</label>
                  <input type="number" value={packSize} onChange={(e) => setPackSize(e.target.value)} className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 text-center" />
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('initial_stock')}</label>
              <input type="number" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            {/* 3 Supplies Inputs */}
            <div className="grid grid-cols-3 gap-2 lg:col-span-2">
               <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('supply_1')}</label>
                <input type="number" value={addedStock1} onChange={(e) => setAddedStock1(e.target.value)} className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('supply_2')}</label>
                <input type="number" value={addedStock2} onChange={(e) => setAddedStock2(e.target.value)} className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('supply_3')}</label>
                <input type="number" value={addedStock3} onChange={(e) => setAddedStock3(e.target.value)} className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={resetForm} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{t('cancel')}</button>
            <button onClick={editingId ? handleUpdate : handleAdd} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" /> {t('save')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase">{t('name')}</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-right text-xs uppercase">{t('price')}</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase">{t('initial_stock')}</th>
              
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase bg-green-50/50 dark:bg-green-900/10">{t('supply_1')}</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase bg-green-50/50 dark:bg-green-900/10">{t('supply_2')}</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase bg-green-50/50 dark:bg-green-900/10">{t('supply_3')}</th>

              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase bg-blue-50/50 dark:bg-blue-900/10">{t('col_out_crew')}</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase bg-purple-50/50 dark:bg-purple-900/10">{t('col_out_rep')}</th>
              
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center text-xs uppercase bg-slate-100 dark:bg-slate-900/40">{t('current_stock')}</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-right text-xs uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
               <React.Fragment>
                  <tr className="bg-slate-100 dark:bg-slate-700/80 opacity-60">
                    <td colSpan={10} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider border-y border-slate-200 dark:border-slate-600">
                      Cigarettes (Example)
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700 opacity-50 bg-slate-50/50 dark:bg-slate-800/50 pointer-events-none grayscale">
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      Marlboro Red (Example)
                      <span className="ml-2 text-xs text-slate-400 font-normal">(1 ctn)</span>
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-300 text-right font-mono">15.500</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-center">50</td>
                    
                    <td className="p-3 text-center text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">+10</td>
                    <td className="p-3 text-center text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">-</td>
                    <td className="p-3 text-center text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">-</td>
                    
                    <td className="p-3 text-slate-600 dark:text-slate-300 text-center bg-blue-50/50 dark:bg-blue-900/10">5</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 text-center bg-purple-50/50 dark:bg-purple-900/10">2</td>
                    
                    <td className="p-3 text-slate-800 dark:text-white text-center bg-slate-100 dark:bg-slate-900/40 font-bold">53</td>
                    <td className="p-3 text-right text-xs text-slate-400 italic">
                      (Example)
                    </td>
                  </tr>
               </React.Fragment>
            ) : (
                <React.Fragment>
                  {CATEGORIES.map(category => {
                    const categoryProducts = products.filter(p => p.category === category);
                    if (categoryProducts.length === 0) return null;

                    return (
                      <React.Fragment key={category}>
                        <tr className="bg-slate-100 dark:bg-slate-700/80">
                          <td colSpan={10} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider border-y border-slate-200 dark:border-slate-600">
                            {t(`cat_${category.toLowerCase().replace(/ /g, '_')}`) || category}
                          </td>
                        </tr>
                        
                        {categoryProducts.map(product => {
                          const { crewOut, repOut, currentStock } = getProductStats(product);
                          return (
                            <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0 text-sm">
                              <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                {product.name}
                                <span className="ml-2 text-xs text-slate-400 font-normal">({product.packSize || 1} {product.unitType || 'pcs'})</span>
                              </td>
                              <td className="p-3 text-slate-800 dark:text-slate-300 text-right font-mono">{product.price.toFixed(3)}</td>
                              <td className="p-3 text-slate-600 dark:text-slate-400 text-center">{product.initialStock}</td>
                              
                              <td className="p-3 text-center text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">{product.addedStock1 > 0 ? `+${product.addedStock1}` : '-'}</td>
                              <td className="p-3 text-center text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">{product.addedStock2 > 0 ? `+${product.addedStock2}` : '-'}</td>
                              <td className="p-3 text-center text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">{product.addedStock3 > 0 ? `+${product.addedStock3}` : '-'}</td>
                              
                              <td className="p-3 text-slate-600 dark:text-slate-300 text-center bg-blue-50/50 dark:bg-blue-900/10">{crewOut}</td>
                              <td className="p-3 text-slate-600 dark:text-slate-300 text-center bg-purple-50/50 dark:bg-purple-900/10">{repOut}</td>
                              
                              <td className="p-3 text-slate-800 dark:text-white text-center bg-slate-100 dark:bg-slate-900/40 font-bold">{currentStock}</td>
                              <td className="p-3 flex justify-end gap-2">
                                <button onClick={() => startEdit(product)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Fallback for others */}
                  {products.filter(p => !CATEGORIES.includes(p.category)).map(product => {
                      const { crewOut, repOut, currentStock } = getProductStats(product);
                      return (
                        <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0 bg-red-50/10">
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {product.name}
                            <span className="ml-2 text-xs text-slate-400 font-normal">({product.packSize || 1} {product.unitType || 'pcs'})</span>
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-300 text-right font-mono">{product.price.toFixed(3)}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 text-center">{product.initialStock}</td>
                          <td className="p-3 text-center text-green-600 dark:text-green-400">{product.addedStock1 > 0 ? `+${product.addedStock1}` : '-'}</td>
                          <td className="p-3 text-center text-green-600 dark:text-green-400">{product.addedStock2 > 0 ? `+${product.addedStock2}` : '-'}</td>
                          <td className="p-3 text-center text-green-600 dark:text-green-400">{product.addedStock3 > 0 ? `+${product.addedStock3}` : '-'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 text-center bg-blue-50/50 dark:bg-blue-900/10">{crewOut}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 text-center bg-purple-50/50 dark:bg-purple-900/10">{repOut}</td>
                          <td className="p-3 text-slate-800 dark:text-white text-center bg-slate-100 dark:bg-slate-900/40 font-bold">{currentStock}</td>
                          <td className="p-3 flex justify-end gap-2">
                            <button onClick={() => startEdit(product)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                  })}
               </React.Fragment>
            )}
          </tbody>
          {/* TOTALS FOOTER */}
          <tfoot className="bg-slate-200 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 shadow-inner">
             <tr className="font-bold text-xs text-slate-800 dark:text-slate-200">
               <td className="p-3 uppercase text-right" colSpan={2}>{t('total_value')}</td>
               <td className="p-3 text-center font-mono">€{totals.tInitial.toFixed(2)}</td>
               <td className="p-3 text-center font-mono text-green-700 dark:text-green-400">€{totals.tS1.toFixed(2)}</td>
               <td className="p-3 text-center font-mono text-green-700 dark:text-green-400">€{totals.tS2.toFixed(2)}</td>
               <td className="p-3 text-center font-mono text-green-700 dark:text-green-400">€{totals.tS3.toFixed(2)}</td>
               <td className="p-3 text-center font-mono text-blue-700 dark:text-blue-400">€{totals.tCrewOut.toFixed(2)}</td>
               <td className="p-3 text-center font-mono text-purple-700 dark:text-purple-400">€{totals.tRepOut.toFixed(2)}</td>
               <td className="p-3 text-center font-mono text-slate-800 dark:text-slate-200 text-sm">€{totals.tCurrent.toFixed(2)}</td>
               <td className="p-3"></td>
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
