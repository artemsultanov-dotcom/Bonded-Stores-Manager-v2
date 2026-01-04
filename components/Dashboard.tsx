import React, { useState } from 'react';
import { ReportSettings } from '../types';
import { Ship, User, Calendar, Settings, AlertTriangle, ArrowRight, DollarSign, Trash2, Globe, ShieldAlert } from 'lucide-react';

interface DashboardProps {
  settings: ReportSettings;
  setSettings: (settings: ReportSettings) => void;
  onResetMonth: (nextMonth: string, nextYear: string) => void;
  onHardReset: () => void;
  t: (key: string) => string;
}

export const Dashboard: React.FC<DashboardProps> = ({ settings, setSettings, onResetMonth, onHardReset, t }) => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isHardResetModalOpen, setIsHardResetModalOpen] = useState(false);
  
  const currentM = parseInt(settings.reportMonth);
  const currentY = parseInt(settings.reportYear);
  const nextDate = new Date(currentY, currentM, 1);
  
  const [nextMonth, setNextMonth] = useState(String(nextDate.getMonth() + 1).padStart(2, '0'));
  const [nextYear, setNextYear] = useState(String(nextDate.getFullYear()));

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: m, label: t(`month_${m}`) };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400"><Globe className="w-5 h-5" /></div>
               <h3 className="text-xl font-black tracking-tight">{t('dashboard_title')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="group">
                     <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1 group-focus-within:text-blue-600 transition-colors">{t('vessel_name')}</label>
                     <input type="text" value={settings.vesselName} onChange={e => setSettings({...settings, vesselName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-normal" placeholder="MV Example" />
                  </div>
                  <div className="group">
                     <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1 group-focus-within:text-blue-600 transition-colors">{t('master_name')}</label>
                     <input type="text" value={settings.masterName} onChange={e => setSettings({...settings, masterName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-normal" placeholder="Capt. John Doe" />
                  </div>
               </div>
               
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="group">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">{t('report_year')}</label>
                        <input type="number" value={settings.reportYear} onChange={e => setSettings({...settings, reportYear: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-normal" />
                     </div>
                     <div className="group">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">{t('exchange_rate')}</label>
                        <div className="relative">
                           <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input type="number" step="0.0001" value={settings.exchangeRate} onChange={e => setSettings({...settings, exchangeRate: Number(e.target.value)})} className="w-full pl-9 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-normal" />
                        </div>
                     </div>
                     <div className="group">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">{t('eur_gbp_rate')}</label>
                        <div className="relative">
                           <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input type="number" step="0.0001" value={settings.gpbExchangeRate} onChange={e => setSettings({...settings, gpbExchangeRate: Number(e.target.value)})} className="w-full pl-9 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-normal" />
                        </div>
                     </div>
                     <div className="group flex items-end">
                       <label className="relative inline-flex items-center cursor-pointer mb-2 px-1">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.useGbpForPurchases} 
                            onChange={e => setSettings({...settings, useGbpForPurchases: e.target.checked})} 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">{t('use_gbp_for_purchases')}</span>
                        </label>
                     </div>
                  </div>
                  <div className="group">
                     <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">{t('report_month')}</label>
                     <select value={settings.reportMonth} onChange={e => setSettings({...settings, reportMonth: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 outline-none focus:ring-4 focus:ring-blue-500/10 font-normal appearance-none cursor-pointer">
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                     </select>
                  </div>
               </div>
            </div>
         </div>

         {/* Dangerous Actions Sidebar */}
         <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400"><AlertTriangle className="w-5 h-5" /></div>
                  <h4 className="font-bold text-sm uppercase tracking-tight">{t('reset_section')}</h4>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed mb-6">Transition to the next month. Automatically carries over ending stock as the new initial stock.</p>
               <button onClick={() => setIsResetModalOpen(true)} className="mt-auto w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20 transition-all active:scale-95">Next Month</button>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl p-6 border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600"><Trash2 className="w-5 h-5" /></div>
                  <h4 className="font-bold text-sm uppercase tracking-tight text-red-800 dark:text-red-300">{t('hard_reset_section')}</h4>
               </div>
               <button onClick={() => setIsHardResetModalOpen(true)} className="w-full py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">{t('hard_reset_btn')}</button>
            </div>
         </div>
      </div>

      {/* Month Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl max-w-lg w-full p-10 border border-slate-200 dark:border-slate-700">
             <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 mb-6"><ShieldAlert className="w-10 h-10" /></div>
                <h3 className="text-3xl font-black tracking-tighter mb-2">{t('reset_modal_title')}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t('reset_desc')}</p>
             </div>
             
             <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl mb-8 border border-slate-100 dark:border-slate-800">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Select Starting Period</label>
                <div className="flex gap-3">
                   <select value={nextMonth} onChange={e => setNextMonth(e.target.value)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 outline-none font-normal text-sm">{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                   <input type="number" value={nextYear} onChange={e => setNextYear(e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 outline-none font-normal text-sm" />
                </div>
             </div>

             <div className="flex flex-col gap-3">
                <button onClick={() => { onResetMonth(nextMonth, nextYear); setIsResetModalOpen(false); }} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20">{t('confirm_reset')}</button>
                <button onClick={() => setIsResetModalOpen(false)} className="w-full py-3 text-slate-500 font-bold hover:text-slate-800 dark:hover:text-white transition-colors">{t('cancel')}</button>
             </div>
          </div>
        </div>
      )}

      {/* Hard Reset Modal */}
      {isHardResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-md animate-in zoom-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl max-w-md w-full p-8 border border-red-100 dark:border-red-900/30 text-center">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6"><Trash2 className="w-8 h-8" /></div>
             <h3 className="text-2xl font-black tracking-tight mb-4">{t('hard_reset_title')}</h3>
             <p className="text-sm text-slate-500 mb-8">{t('hard_reset_desc')}</p>
             <div className="flex flex-col gap-2">
                <button onClick={() => { onHardReset(); setIsHardResetModalOpen(false); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-600/20">{t('hard_reset_confirm')}</button>
                <button onClick={() => setIsHardResetModalOpen(false)} className="w-full py-3 text-slate-500 font-bold hover:text-slate-800 dark:hover:text-white transition-colors">{t('cancel')}</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};
