import React, { useState } from 'react';
import { ReportSettings } from '../types';
import { Ship, User, Calendar, Settings, AlertTriangle, ArrowRight, DollarSign, Trash2 } from 'lucide-react';

interface DashboardProps {
  settings: ReportSettings;
  setSettings: (settings: ReportSettings) => void;
  onResetMonth: (nextMonth: string, nextYear: string) => void;
  onHardReset?: () => void; // Optional for backward compatibility, but we'll use it
  t: (key: string) => string;
}

export const Dashboard: React.FC<DashboardProps> = ({ settings, setSettings, onResetMonth, onHardReset, t }) => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isHardResetModalOpen, setIsHardResetModalOpen] = useState(false);
  
  // Calculate default next month logic
  const currentM = parseInt(settings.reportMonth);
  const currentY = parseInt(settings.reportYear);
  const nextDate = new Date(currentY, currentM, 1); // Month is 0-indexed in Date, but reportMonth is 1-indexed, so passing currentM (1-12) effectively gives next month because JS date month is 0-11.
  
  const [nextMonth, setNextMonth] = useState(String(nextDate.getMonth() + 1).padStart(2, '0'));
  const [nextYear, setNextYear] = useState(String(nextDate.getFullYear()));

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: m, label: t(`month_${m}`) };
  });

  const handleChange = (key: keyof ReportSettings, value: string | number) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleConfirmReset = () => {
    onResetMonth(nextMonth, nextYear);
    setIsResetModalOpen(false);
  };

  const handleConfirmHardReset = () => {
    if (onHardReset) {
      onHardReset();
      setIsHardResetModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">{t('dashboard_title')}</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Vessel & Master */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Ship className="w-4 h-4" /> {t('vessel_name')}
              </label>
              <input 
                type="text" 
                value={settings.vesselName} 
                onChange={(e) => handleChange('vesselName', e.target.value)}
                className="w-full text-lg bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                placeholder="MV Example"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> {t('master_name')}
              </label>
              <input 
                type="text" 
                value={settings.masterName} 
                onChange={(e) => handleChange('masterName', e.target.value)}
                className="w-full text-lg bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                placeholder="Capt. John Doe"
              />
            </div>
          </div>

          {/* Date Settings */}
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {t('report_year')}
                  </label>
                  <input 
                    type="number" 
                    value={settings.reportYear} 
                    onChange={(e) => handleChange('reportYear', e.target.value)}
                    className="w-full text-lg bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="2024"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> {t('exchange_rate')}
                  </label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={settings.exchangeRate} 
                    onChange={(e) => handleChange('exchangeRate', Number(e.target.value))}
                    className="w-full text-lg bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="1.10"
                  />
               </div>
             </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {t('report_month')}
              </label>
              <select 
                value={settings.reportMonth} 
                onChange={(e) => handleChange('reportMonth', e.target.value)}
                className="w-full text-lg bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
          * These settings will be applied to all reports (Payroll, Inventory, History).
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MONTH RESET ZONE */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col justify-between">
           <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('reset_section')}</h3>
                 <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                   {t('reset_desc')}
                 </p>
              </div>
           </div>
           <button 
              onClick={() => setIsResetModalOpen(true)}
              className="bg-green-400 hover:bg-green-500 text-black px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors mt-auto w-full"
           >
             {t('reset_btn')} <ArrowRight className="w-4 h-4" />
           </button>
        </div>

        {/* FACTORY RESET ZONE */}
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 p-8 flex flex-col justify-between">
           <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full shrink-0">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">{t('hard_reset_section')}</h3>
                 <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed">
                   {t('hard_reset_desc')}
                 </p>
              </div>
           </div>
           <button 
              onClick={() => setIsHardResetModalOpen(true)}
              className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors mt-auto w-full"
           >
             {t('hard_reset_btn')}
           </button>
        </div>
      </div>

      {/* MONTH RESET CONFIRMATION MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in border border-slate-200 dark:border-slate-700">
             <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="w-8 h-8" />
                <h3 className="text-2xl font-bold">{t('reset_modal_title')}</h3>
             </div>
             
             <p className="text-slate-600 dark:text-slate-300 mb-4">
               {t('reset_warning')} <br/>
               {t('reset_desc')}
             </p>

             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl mb-6">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                   {t('select_next_month')}
                </label>
                <div className="flex gap-4">
                   <select 
                      value={nextMonth} 
                      onChange={(e) => setNextMonth(e.target.value)}
                      className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input 
                      type="number"
                      value={nextYear}
                      onChange={(e) => setNextYear(e.target.value)}
                      className="w-24 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
             </div>

             <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-200 dark:shadow-none"
                >
                  {t('confirm_reset')}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* HARD RESET CONFIRMATION MODAL */}
      {isHardResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in border border-red-200 dark:border-red-900">
             <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
                <Trash2 className="w-8 h-8" />
                <h3 className="text-2xl font-bold">{t('hard_reset_title')}</h3>
             </div>
             
             <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium">
               {t('hard_reset_desc')}
             </p>

             <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsHardResetModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleConfirmHardReset}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-200 dark:shadow-none"
                >
                  {t('hard_reset_confirm')}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};