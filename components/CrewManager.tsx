

import React, { useState } from 'react';
import { CrewMember } from '../types';
import { Users, Plus, Trash2, Edit2, Save, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CrewManagerProps {
  crew: CrewMember[];
  setCrew: (crew: CrewMember[]) => void;
  t: (key: string) => string;
}

const RANKS = [
  "Master", "Ch. Off", "1st Off", "2nd Off", "3rd Off", "JDO", 
  "Ch. Eng", "2nd Eng", "3rd Eng", "4th Eng", "ETO", "JEO", "JETO", 
  "Fitter", "M/Man", "Bosun", "A.B", "O.S", "Cook", "Steward", 
  "Deck Cad.", "Eng Cad."
];

export const CrewManager: React.FC<CrewManagerProps> = ({ crew, setCrew, t }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form States
  const [name, setName] = useState('');
  const [rank, setRank] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [currency, setCurrency] = useState<'EUR'|'USD'>('EUR');

  const resetForm = () => {
    setName('');
    setRank('');
    setIsActive(true);
    setCurrency('EUR');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!name || !rank) return;
    const newMember: CrewMember = {
      id: crypto.randomUUID(),
      name,
      rank,
      isActive,
      currency
    };
    setCrew([...crew, newMember]);
    resetForm();
  };

  const startEdit = (member: CrewMember) => {
    setEditingId(member.id);
    setName(member.name);
    setRank(member.rank);
    setIsActive(member.isActive);
    setCurrency(member.currency || 'EUR');
    setIsAdding(true);
  };

  const handleUpdate = () => {
    if (!editingId || !name || !rank) return;
    const updatedCrew = crew.map(m => 
      m.id === editingId ? { ...m, name, rank, isActive, currency } : m
    );
    setCrew(updatedCrew);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('delete_confirm_crew'))) {
      setCrew(crew.filter(m => m.id !== id));
    }
  };

  const formatDate = (dateInput: number | string | Date) => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Sort crew: Active first, then by Rank order, then by Name
  const sortedCrew = [...crew].sort((a, b) => {
    // 1. Status
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    // 2. Rank
    const rankIndexA = RANKS.indexOf(a.rank);
    const rankIndexB = RANKS.indexOf(b.rank);

    // If rank not found (e.g. custom), put at end
    const valA = rankIndexA === -1 ? 999 : rankIndexA;
    const valB = rankIndexB === -1 ? 999 : rankIndexB;

    if (valA !== valB) {
      return valA - valB;
    }

    // 3. Name fallback
    return a.name.localeCompare(b.name);
  });

  const savePDF = async (doc: jsPDF, filename: string) => {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'PDF Document',
            accept: { 'application/pdf': ['.pdf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(doc.output('blob'));
        await writable.close();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('File save failed:', err);
          doc.save(filename);
        }
      }
    } else {
      doc.save(filename);
    }
  };

  const exportCrewPDF = async () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text(t('crew_list'), 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 22);

    const tableColumn = [t('status'), t('name'), t('rank'), t('salary_currency')];
    const tableRows = sortedCrew.map(m => [
      m.isActive ? t('active') : t('inactive'),
      m.name,
      m.rank,
      m.currency || 'EUR'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    await savePDF(doc, 'CrewList.pdf');
  };

  const activeCount = crew.filter(c => c.isActive).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t('crew_list')}
          <div className="flex items-center gap-2">
            <span className="ml-2 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('crew_on_board')}</span>
          </div>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportCrewPDF}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border border-slate-300 dark:border-slate-600"
            title={t('export_pdf')}
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            disabled={isAdding}
          >
            <Plus className="w-4 h-4" /> {t('add')}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-4 text-lg text-slate-800 dark:text-white">{editingId ? t('edit_crew') : t('add_crew')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('name')}</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-normal"
                placeholder="Ivanov Ivan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('rank')}</label>
              <select 
                value={rank} 
                onChange={(e) => setRank(e.target.value)} 
                className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-normal"
              >
                <option value="">{t('select_rank')}</option>
                {RANKS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('salary_currency')}</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value as 'EUR'|'USD')} 
                className="w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-normal"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mb-2">
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">{isActive ? t('active') : t('inactive')}</span>
                </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={resetForm} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{t('cancel')}</button>
            <button 
              onClick={editingId ? handleUpdate : handleAdd} 
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {t('save')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="py-2 px-4 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-center w-24">{t('status')}</th>
              <th className="py-2 px-4 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300">{t('name')}</th>
              <th className="py-2 px-4 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300">{t('rank')}</th>
              <th className="py-2 px-4 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 w-24">{t('salary_currency')}</th>
              <th className="py-2 px-4 border-b border-slate-200 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedCrew.length === 0 ? (
              <tr className="border-b border-slate-100 dark:border-slate-700 opacity-50 bg-slate-50/50 dark:bg-slate-800/50 pointer-events-none grayscale">
                <td className="py-2 px-4 text-center">
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                     {t('active')}
                   </span>
                </td>
                <td className="py-2 px-4 font-medium text-slate-800 dark:text-slate-200">Ivanov Ivan (Example)</td>
                <td className="py-2 px-4 text-slate-600 dark:text-slate-400">Able Seaman</td>
                <td className="py-2 px-4 text-slate-600 dark:text-slate-400 font-mono text-sm">EUR</td>
                <td className="py-2 px-4 text-right text-xs text-slate-400 italic">
                  (Example)
                </td>
              </tr>
            ) : (
              sortedCrew.map(member => (
                <tr 
                  key={member.id} 
                  className={`border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!member.isActive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/50' : ''}`}
                >
                  <td className="py-2 px-4 text-center">
                    {member.isActive ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                         {t('active')}
                       </span>
                    ) : (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400">
                         {t('inactive')}
                       </span>
                    )}
                  </td>
                  <td className="py-2 px-4 font-medium text-slate-800 dark:text-slate-200">{member.name}</td>
                  <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{member.rank}</td>
                  <td className="py-2 px-4 text-slate-600 dark:text-slate-400 font-mono text-sm">{member.currency || 'EUR'}</td>
                  <td className="py-2 px-4 flex justify-end gap-2">
                    <button onClick={() => startEdit(member)} className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full" title={t('edit_crew')}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(member.id)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
