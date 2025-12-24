import React, { useState } from 'react';
import { CrewMember, Product, Transaction, TransactionType, ReportSettings, TransactionItem } from '../types';
import { FileText, RefreshCw, Edit2, Trash2, X, Save, Calendar, Filter, Plus, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialReportsProps {
  crew: CrewMember[];
  products: Product[];
  transactions: Transaction[];
  settings: ReportSettings;
  updateTransaction?: (t: Transaction) => void;
  t: (key: string) => string;
}

const RANKS = [
  "Master", "Ch. Off", "1st Off", "2nd Off", "3rd Off", "JDO", 
  "Ch. Eng", "2nd Eng", "3rd Eng", "4th Eng", "ETO", "JEO", "JETO", 
  "Fitter", "M/Man", "Bosun", "A.B", "O.S", "Cook", "Steward", 
  "Deck Cad.", "Eng Cad."
];

const CATEGORIES = ['Cigarettes', 'Soft Drinks', 'Water', 'Snacks', 'Other'];

export const FinancialReports: React.FC<FinancialReportsProps> = ({ crew, products, transactions, settings, updateTransaction, t }) => {
  const [activeTab, setActiveTab] = useState<'PAYROLL' | 'INVENTORY' | 'HISTORY' | 'MONTHLY' | 'REPRESENTATION' | 'ORDER_SHEET'>('PAYROLL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyRecipientFilter, setHistoryRecipientFilter] = useState<string>('ALL');
  
  // Editing State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');

  // Filter transactions by global month settings
  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.timestamp);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = String(d.getFullYear());
    return m === settings.reportMonth && y === settings.reportYear;
  });

  const monthLabel = `${t(`month_${settings.reportMonth}`)} ${settings.reportYear}`;

  const formatDate = (dateInput: number | string | Date) => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for File System Access API
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

  // Helper to determine week of month (1-5)
  const getWeekOfMonth = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = date.getDate();
    return Math.min(Math.ceil(day / 7), 5);
  };

  // --- Transaction Editing Logic ---
  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(JSON.parse(JSON.stringify(t)));
    setSelectedProductIdToAdd('');
  };

  const handleEditQuantity = (index: number, newQty: number) => {
    if (!editingTransaction) return;
    const updatedItems = [...editingTransaction.items];
    if (newQty <= 0) {
      updatedItems[index].quantity = 0;
    } else {
      updatedItems[index].quantity = newQty;
    }
    setEditingTransaction({ ...editingTransaction, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingTransaction) return;
    const updatedItems = editingTransaction.items.filter((_, i) => i !== index);
    setEditingTransaction({ ...editingTransaction, items: updatedItems });
  };

  const handleAddProductToEdit = () => {
    if (!editingTransaction || !selectedProductIdToAdd) return;
    const product = products.find(p => p.id === selectedProductIdToAdd);
    if (!product) return;

    const existingIndex = editingTransaction.items.findIndex(i => i.productId === product.id);
    if (existingIndex > -1) {
      const updatedItems = [...editingTransaction.items];
      updatedItems[existingIndex].quantity += 1;
      setEditingTransaction({ ...editingTransaction, items: updatedItems });
    } else {
      const newItem: TransactionItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price
      };
      setEditingTransaction({
        ...editingTransaction,
        items: [...editingTransaction.items, newItem]
      });
    }
    setSelectedProductIdToAdd('');
  };

  const handleSaveTransaction = () => {
    if (!editingTransaction || !updateTransaction) return;
    const cleanItems = editingTransaction.items.filter(i => i.quantity > 0);
    const newTotal = cleanItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const cleanTransaction = { ...editingTransaction, items: cleanItems, totalAmount: newTotal };
    updateTransaction(cleanTransaction);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = () => {
    if (!editingTransaction || !updateTransaction) return;
    if (window.confirm(t('confirm_delete_tr'))) {
       updateTransaction({ ...editingTransaction, items: [] });
       setEditingTransaction(null);
    }
  };

  // --- Sorting Logic used for Payroll and Filter Dropdown ---
  const sortedCrew = [...crew].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const rankIndexA = RANKS.indexOf(a.rank);
    const rankIndexB = RANKS.indexOf(b.rank);
    const valA = rankIndexA === -1 ? 999 : rankIndexA;
    const valB = rankIndexB === -1 ? 999 : rankIndexB;
    if (valA !== valB) return valA - valB;
    return a.name.localeCompare(b.name);
  });

  // --- Payroll Logic ---
  const payrollData = sortedCrew.map(member => {
    const memberTransactions = filteredTransactions.filter(
      t => t.type === TransactionType.CREW && t.recipientId === member.id
    );
    const totalDeductionEUR = memberTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const currency = member.currency || 'EUR';
    const finalDeduction = currency === 'USD' 
       ? totalDeductionEUR * (settings.exchangeRate || 1)
       : totalDeductionEUR;
    return { member, totalDeductionEUR, finalDeduction, currency, transactions: memberTransactions };
  });

  const eurCrew = payrollData.filter(d => d.currency === 'EUR');
  const usdCrew = payrollData.filter(d => d.currency === 'USD');
  const totalDeductionEUR = eurCrew.reduce((sum, p) => sum + p.finalDeduction, 0);
  const totalDeductionUSD = usdCrew.reduce((sum, p) => sum + p.finalDeduction, 0);
  const grandTotalEUR = payrollData.reduce((sum, p) => sum + p.totalDeductionEUR, 0);

  // --- Inventory Logic ---
  const inventoryReport = products.map(product => {
    const soldToCrew = filteredTransactions
      .filter(t => t.type === TransactionType.CREW)
      .reduce((sum, t) => {
        const item = t.items.find(i => i.productId === product.id);
        return sum + (item ? item.quantity : 0);
      }, 0);
    const givenToReps = filteredTransactions
      .filter(t => t.type === TransactionType.REPRESENTATION)
      .reduce((sum, t) => {
        const item = t.items.find(i => i.productId === product.id);
        return sum + (item ? item.quantity : 0);
      }, 0);
    const totalOut = soldToCrew + givenToReps;
    const totalAdded = product.addedStock1 + product.addedStock2 + product.addedStock3;
    const finalStock = (product.initialStock + totalAdded) - totalOut;
    return { ...product, totalAdded, soldToCrew, givenToReps, totalOut, finalStock };
  });

  // --- Monthly Report Calculations ---
  const monthlyReportData = CATEGORIES.map(category => {
    const categoryProducts = products.filter(p => p.category === category);
    if (categoryProducts.length === 0) return null;
    const items = categoryProducts.map(p => {
       const packSize = p.packSize || 1;
       const pricePerPack = p.price;
       const pricePerUnit = pricePerPack / packSize;
       let crewOut = 0; let chartOut = 0; let ownOut = 0;
       filteredTransactions.forEach(t => {
          const item = t.items.find(i => i.productId === p.id);
          if (item) {
             if (t.type === TransactionType.CREW) crewOut += item.quantity;
             else if (t.type === TransactionType.REPRESENTATION) {
                if (t.representationType === 'OWNER') ownOut += item.quantity;
                else chartOut += item.quantity;
             }
          }
       });
       const totalConsumption = crewOut + chartOut + ownOut;
       const totalAdded = p.addedStock1 + p.addedStock2 + p.addedStock3;
       const endingStock = (p.initialStock + totalAdded) - totalConsumption;
       return {
         ...p, unitType: p.unitType || 'pcs', packSize, pricePerPack, pricePerUnit,
         valInitial: p.initialStock * pricePerUnit, totalSupply: totalAdded, valTotalSupply: totalAdded * pricePerUnit,
         valSupply1: p.addedStock1 * pricePerUnit, valSupply2: p.addedStock2 * pricePerUnit, valSupply3: p.addedStock3 * pricePerUnit,
         crewQty: crewOut, crewVal: crewOut * pricePerUnit, chartQty: chartOut, chartVal: chartOut * pricePerUnit, ownQty: ownOut, ownVal: ownOut * pricePerUnit,
         totalConsumption, valConsumption: totalConsumption * pricePerUnit, endingStock, valEnding: endingStock * pricePerUnit
       };
    });
    return { category, items };
  }).filter(Boolean);

  const monthlyTotals = monthlyReportData.reduce((acc, group) => {
    if (!group) return acc;
    group.items.forEach(i => {
       acc.valInitial += i.valInitial; acc.valSupply1 += i.valSupply1; acc.valSupply2 += i.valSupply2; acc.valSupply3 += i.valSupply3;
       acc.valTotalSupply += i.valTotalSupply; acc.crewVal += i.crewVal; acc.chartVal += i.chartVal; acc.ownVal += i.ownVal;
       acc.valConsumption += i.valConsumption; acc.valEnding += i.valEnding;
    });
    return acc;
  }, { valInitial: 0, valSupply1: 0, valSupply2: 0, valSupply3: 0, valTotalSupply: 0, crewVal: 0, chartVal: 0, ownVal: 0, valConsumption: 0, valEnding: 0 });

  // --- Representation Report Logic ---
  const repReportData = CATEGORIES.map(category => {
    const categoryProducts = products.filter(p => p.category === category);
    if (categoryProducts.length === 0) return null;
    const items = categoryProducts.map(p => {
       const pricePerPack = p.price;
       const totalAdded = p.addedStock1 + p.addedStock2 + p.addedStock3;
       const totalOut = filteredTransactions.reduce((sum, t) => {
         const item = t.items.find(i => i.productId === p.id);
         return sum + (item ? item.quantity : 0);
       }, 0);
       const currentStock = (p.initialStock + totalAdded) - totalOut;
       const chartWeeks = [0,0,0,0,0]; const ownWeeks = [0,0,0,0,0];
       filteredTransactions.filter(t => t.type === TransactionType.REPRESENTATION).forEach(t => {
          const item = t.items.find(i => i.productId === p.id);
          if (item) {
             const w = getWeekOfMonth(t.timestamp) - 1; 
             if (w >= 0 && w <= 4) {
                if (t.representationType === 'OWNER') ownWeeks[w] += item.quantity;
                else chartWeeks[w] += item.quantity;
             }
          }
       });
       const chartQty = chartWeeks.reduce((a, b) => a + b, 0); const chartVal = chartQty * pricePerPack;
       const ownQty = ownWeeks.reduce((a, b) => a + b, 0); const ownVal = ownQty * pricePerPack;
       return { ...p, currentStock, chartWeeks, chartQty, chartVal, ownWeeks, ownQty, ownVal };
    });
    return { category, items };
  }).filter(Boolean);

   const repTotals = repReportData.reduce((acc, group) => {
    if (!group) return acc;
    group.items.forEach(i => { acc.chartVal += i.chartVal; acc.ownVal += i.ownVal; });
    return acc;
  }, { chartVal: 0, ownVal: 0 });

  // --- History Filtered Logic ---
  const sortedHistory = [...filteredTransactions]
    .filter(tr => {
      if (historyRecipientFilter === 'ALL') return true;
      if (historyRecipientFilter === 'REPRESENTATION') return tr.type === TransactionType.REPRESENTATION;
      return tr.recipientId === historyRecipientFilter;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === TransactionType.CREW ? -1 : 1;
      return b.timestamp - a.timestamp;
    });

  // --- PDF Export Logic ---
  const generateHeader = (doc: jsPDF, title: string) => {
    doc.setFontSize(14); doc.text(settings.vesselName, 14, 15);
    doc.setFontSize(10); doc.text(`${t('master')}: ${settings.masterName}`, 14, 20);
    doc.text(`${t('period')}: ${monthLabel}`, 14, 25); doc.text(`${t('exchange_rate')}: ${settings.exchangeRate}`, 14, 30);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(title, 14, 38); doc.setFont("helvetica", "normal");
  };

  const exportPayrollPDF = async () => {
    const doc = new jsPDF();
    const addPayrollTable = (data: typeof payrollData, currencyName: string, total: number, startY: number) => {
      generateHeader(doc, `${t('payroll_title')} (${currencyName})`);
      const tableColumn = ["#", t('name'), t('rank'), t('col_price_plain')];
      const tableRows = data.map((d, idx) => {
         const name = d.member.isActive ? d.member.name : `${d.member.name} (${t('signed_off')})`;
         const currencySymbol = d.currency === 'EUR' ? 'EUR' : 'USD';
         return [idx + 1, name, d.member.rank, `${currencySymbol} ${d.finalDeduction.toFixed(2)}`];
      });
      tableRows.push(['', '', `TOTAL ${currencyName}`, `${currencyName} ${total.toFixed(2)}`]);
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: startY });
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(10); doc.text(t('master'), 40, finalY); doc.line(40, finalY - 5, 90, finalY - 5);
      doc.text(t('keeper'), 140, finalY); doc.line(140, finalY - 5, 190, finalY - 5);
      return finalY;
    };
    if (eurCrew.length > 0) addPayrollTable(eurCrew, 'EUR', totalDeductionEUR, 45);
    if (usdCrew.length > 0) { if (eurCrew.length > 0) doc.addPage(); addPayrollTable(usdCrew, 'USD', totalDeductionUSD, 45); }
    await savePDF(doc, `Payroll_${settings.reportYear}_${settings.reportMonth}.pdf`);
  };

  const exportInventoryPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(settings.vesselName, 10, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${t('master')}: ${settings.masterName}`, 10, 21);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(t('inventory_title'), pageWidth / 2, 15, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${t('period')}: ${monthLabel}`, pageWidth / 2, 21, { align: "center" });
    doc.setFontSize(11); doc.text(formatDate(new Date()), pageWidth - 10, 15, { align: "right" });
    const tableColumn = [t('col_product'), t('col_start'), t('sup1_short'), t('sup2_short'), t('sup3_short'), t('col_in'), t('col_out_crew'), t('col_out_rep'), t('col_total_out'), t('col_end')];
    const tableRows = inventoryReport.map(p => [p.name, p.initialStock, p.addedStock1 > 0 ? p.addedStock1 : '-', p.addedStock2 > 0 ? p.addedStock2 : '-', p.addedStock3 > 0 ? p.addedStock3 : '-', p.totalAdded, p.soldToCrew, p.givenToReps, p.totalOut, p.finalStock]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] }, columnStyles: { 0: { cellWidth: 60 } } });
    await savePDF(doc, `Inventory_${settings.reportYear}_${settings.reportMonth}.pdf`);
  };

  const exportHistoryPDF = async () => {
    const doc = new jsPDF();
    const filterLabel = historyRecipientFilter === 'ALL' 
      ? '' 
      : historyRecipientFilter === 'REPRESENTATION' 
        ? ` - ${t('representation')}` 
        : ` - ${crew.find(c => c.id === historyRecipientFilter)?.name || ''}`;
    
    generateHeader(doc, t('history_title') + filterLabel);
    const tableColumn = [t('col_date'), t('col_recipient'), t('category'), t('col_items'), t('col_amount')];
    const tableRows = sortedHistory.map(tr => [formatDate(tr.timestamp), tr.recipientName, tr.type === TransactionType.CREW ? t('crew') : t('representation'), tr.items.map(i => `${i.productName} (${i.quantity})`).join(', '), `EUR ${tr.totalAmount.toFixed(2)}`]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 45, styles: { fontSize: 8 } });
    await savePDF(doc, `History_${settings.reportYear}_${settings.reportMonth}.pdf`);
  };

  const exportMonthlyReportPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(settings.vesselName, 10, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${t('master')}: ${settings.masterName}`, 10, 21);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(t('monthly_title'), pageWidth / 2, 15, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${t('period')}: ${monthLabel}`, pageWidth / 2, 21, { align: "center" });
    doc.setFontSize(11); doc.text(formatDate(new Date()), pageWidth - 10, 15, { align: "right" });
    
    const head: any[] = [[ { content: t('col_product'), rowSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_unit'), rowSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_units_pack'), rowSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_price_pack'), rowSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_price_unit'), rowSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('initial_stock'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_supply'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_cons_crew'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_cons_chart'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_cons_owner'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_consumption'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }, { content: t('col_ending'), colSpan: 2, styles: { halign: 'center' as any, valign: 'middle' as any } }], [ { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }]];
    const body: any[] = [];
    monthlyReportData.forEach(group => {
       if(!group) return; 
       body.push([{ content: group.category, colSpan: 19, styles: { fontStyle: 'bold' as any, fillColor: [240, 240, 240] } }]);
       group.items.forEach(item => { body.push([ item.name, item.unitType, item.packSize, item.pricePerPack.toFixed(1), item.pricePerUnit.toFixed(1), item.initialStock, item.valInitial.toFixed(1), item.totalSupply || '', item.valTotalSupply > 0 ? item.valTotalSupply.toFixed(1) : '', item.crewQty || '', item.crewVal > 0 ? item.crewVal.toFixed(1) : '', item.chartQty || '', item.chartVal > 0 ? item.chartVal.toFixed(1) : '', item.ownQty || '', item.ownVal > 0 ? item.ownVal.toFixed(1) : '', item.totalConsumption || '', item.valConsumption > 0 ? item.valConsumption.toFixed(1) : '', item.endingStock, item.valEnding.toFixed(1) ]); });
    });
    body.push([{ content: t('total').toUpperCase(), colSpan: 5, styles: { fontStyle: 'bold' as any, halign: 'right' as any } }, '', monthlyTotals.valInitial.toFixed(1), '', monthlyTotals.valTotalSupply.toFixed(1), '', monthlyTotals.crewVal.toFixed(1), '', monthlyTotals.chartVal.toFixed(1), '', monthlyTotals.ownVal.toFixed(1), '', monthlyTotals.valConsumption.toFixed(1), '', monthlyTotals.valEnding.toFixed(1)]);
    
    autoTable(doc, { head: head, body: body, startY: 30, styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak' }, columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 8, halign: 'center' }, 2: { cellWidth: 8, halign: 'center' }, 3: { cellWidth: 10, halign: 'right' }, 4: { cellWidth: 10, halign: 'right' }, 5: { halign: 'center', cellWidth: 8 }, 6: { halign: 'right' }, 7: { halign: 'center', cellWidth: 8 }, 8: { halign: 'right' }, 9: { halign: 'center', cellWidth: 8 }, 10: { halign: 'right' }, 11: { halign: 'center', cellWidth: 8 }, 12: { halign: 'right' }, 13: { halign: 'center', cellWidth: 8 }, 14: { halign: 'right' }, 15: { halign: 'center', cellWidth: 8 }, 16: { halign: 'right' }, 17: { halign: 'center', cellWidth: 8 }, 18: { halign: 'right' } }, theme: 'grid', headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], lineColor: [255, 255, 255], lineWidth: 0.1, fontStyle: 'normal' } });
    await savePDF(doc, `MonthlyReport_${settings.reportYear}_${settings.reportMonth}.pdf`);
  };

  const exportRepresentationPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(settings.vesselName, 10, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${t('master')}: ${settings.masterName}`, 10, 21);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(t('rep_title'), pageWidth / 2, 15, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${t('period')}: ${monthLabel}`, pageWidth / 2, 21, { align: "center" });
    doc.setFontSize(11); doc.text(formatDate(new Date()), pageWidth - 10, 15, { align: "right" });
    
    const head: any[] = [[ { content: "", colSpan: 4, styles: { halign: 'center' as any, valign: 'middle' as any, fontSize: 12, fontStyle: 'bold' as any } }, { content: t('rep_charterers_full'), colSpan: 7, styles: { halign: 'center' as any, valign: 'middle' as any, fontStyle: 'bold' as any } }, { content: t('rep_owners_full'), colSpan: 7, styles: { halign: 'center' as any, valign: 'middle' as any, fontStyle: 'bold' as any } } ], [ { content: t('col_product'), styles: { halign: 'center' as any } }, { content: t('col_unit'), styles: { halign: 'center' as any } }, { content: t('col_price_plain'), styles: { halign: 'center' as any } }, { content: t('current_stock'), styles: { halign: 'center' as any } }, { content: t('wk1'), styles: { halign: 'center' as any } }, { content: t('wk2'), styles: { halign: 'center' as any } }, { content: t('wk3'), styles: { halign: 'center' as any } }, { content: t('wk4'), styles: { halign: 'center' as any } }, { content: t('wk5'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } }, { content: t('wk1'), styles: { halign: 'center' as any } }, { content: t('wk2'), styles: { halign: 'center' as any } }, { content: t('wk3'), styles: { halign: 'center' as any } }, { content: t('wk4'), styles: { halign: 'center' as any } }, { content: t('wk5'), styles: { halign: 'center' as any } }, { content: t('col_qty'), styles: { halign: 'center' as any } }, { content: t('col_value'), styles: { halign: 'center' as any } } ]];
    const body: any[] = [];
    repReportData.forEach(group => {
       if(!group) return;
       body.push([{ content: group.category, colSpan: 18, styles: { fontStyle: 'bold' as any, fillColor: [30, 58, 138], textColor: [255, 255, 255] } }]);
       group.items.forEach(item => { body.push([ item.name, item.unitType, item.price.toFixed(2) + ' €', item.currentStock, item.chartWeeks[0] || '', item.chartWeeks[1] || '', item.chartWeeks[2] || '', item.chartWeeks[3] || '', item.chartWeeks[4] || '', item.chartQty || '', item.chartVal > 0 ? item.chartVal.toFixed(2) + ' €' : '-', item.ownWeeks[0] || '', item.ownWeeks[1] || '', item.ownWeeks[2] || '', item.ownWeeks[3] || '', item.ownWeeks[4] || '', item.ownQty || '', item.ownVal > 0 ? item.ownVal.toFixed(2) + ' €' : '-' ]); });
    });
    body.push([ { content: t('total').toUpperCase(), colSpan: 4, styles: { fontStyle: 'bold' as any, halign: 'right' as any } }, { content: '', colSpan: 5 }, { content: '', styles: { halign: 'center' as any } }, { content: repTotals.chartVal.toFixed(2) + ' €', styles: { fontStyle: 'bold' as any, halign: 'right' as any } }, { content: '', colSpan: 5 }, { content: '', styles: { halign: 'center' as any } }, { content: repTotals.ownVal.toFixed(2) + ' €', styles: { fontStyle: 'bold' as any, halign: 'right' as any } } ]);
    
    autoTable(doc, { head: head, body: body, startY: 30, styles: { fontSize: 8, cellPadding: 1 }, theme: 'grid', headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], lineColor: [255, 255, 255], lineWidth: 0.1, fontStyle: 'normal' }, columnStyles: { 0: { cellWidth: 40 } } });
    await savePDF(doc, `Representation_Report_${settings.reportYear}_${settings.reportMonth}.pdf`);
  };

  const handleExportPDF = async () => {
    if (activeTab === 'PAYROLL') await exportPayrollPDF();
    else if (activeTab === 'INVENTORY') await exportInventoryPDF();
    else if (activeTab === 'HISTORY') await exportHistoryPDF();
    else if (activeTab === 'MONTHLY') await exportMonthlyReportPDF();
    else if (activeTab === 'REPRESENTATION') await exportRepresentationPDF();
  };

  const PayrollTableSection = ({ data, currency, total }: { data: typeof payrollData, currency: string, total: number }) => (
    <div className="mb-12 break-inside-avoid">
       <div className="text-center mb-6 hidden print:block">
          <h2 className="text-lg font-bold">{settings.vesselName}</h2>
          <h1 className="text-xl font-bold uppercase mt-2">{t('payroll_title')}</h1>
          <p className="text-slate-500 mt-1">{t('period')}: {monthLabel}</p>
       </div>
       <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 print:hidden tracking-tight">{t('payroll_title')} — <span className="text-blue-600 dark:text-blue-400">{currency}</span></h3>
       <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">#</th>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('name')}</th>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('rank')}</th>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t('col_price_plain')}</th>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-40 print:block hidden">{t('signature')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((data, idx) => {
                const currencySymbol = data.currency === 'EUR' ? '€' : '$';
                return (
                  <tr key={data.member.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors print:hover:bg-transparent">
                    <td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-500 text-sm">{idx + 1}</td>
                    <td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 font-medium text-slate-800 dark:text-white text-sm">
                      <span className={!data.member.isActive ? 'line-through decoration-slate-400 text-slate-400' : ''}>{data.member.name}</span>
                      {!data.member.isActive && <span className="text-[10px] text-red-500 font-bold ml-2 uppercase border border-red-200 px-1 rounded bg-red-50">{t('signed_off')}</span>}
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm">{data.member.rank}</td>
                    <td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-right font-medium text-slate-800 dark:text-white tabular-nums text-sm">
                      {currencySymbol}{data.finalDeduction.toFixed(2)}
                      {data.currency === 'USD' && <span className="text-xs text-slate-400 block font-normal">(€{data.totalDeductionEUR.toFixed(2)} @ {settings.exchangeRate})</span>}
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 print:border-slate-300 print:block hidden"></td>
                  </tr>
                );
              })}
              <tr className="print:bg-transparent">
                <td colSpan={3} className="pt-6 px-4 text-right text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{t('total_deduction')} ({currency}):</td>
                <td className="pt-6 px-4 text-right text-xl font-bold text-slate-900 dark:text-white tabular-nums">{currency === 'EUR' ? '€' : '$'}{total.toFixed(2)}</td>
                <td className="print:block hidden"></td>
              </tr>
            </tbody>
          </table>
          <div className="mt-16 hidden print:flex justify-between px-16">
             <div><p className="border-t border-slate-400 pt-2 w-48 text-center text-sm">{t('master')}</p><p className="text-center font-bold text-sm mt-1">{settings.masterName}</p></div>
             <div><p className="border-t border-slate-400 pt-2 w-48 text-center text-sm">{t('keeper')}</p></div>
          </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div><div><h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('edit_transaction')}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{editingTransaction.recipientName} • {formatDate(editingTransaction.timestamp)}</p></div></div>
               <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-6 h-6" /></button>
             </div>
             
             {/* Add Product Section in Modal */}
             <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700 flex gap-2 items-end">
                <div className="flex-1">
                   <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Add Product to Transaction</label>
                   <select 
                      value={selectedProductIdToAdd}
                      onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                   >
                      <option value="">-- Select Product --</option>
                      {products.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                        <option key={p.id} value={p.id}>{p.name} (€{p.price.toFixed(2)})</option>
                      ))}
                   </select>
                </div>
                <button 
                  onClick={handleAddProductToEdit}
                  disabled={!selectedProductIdToAdd}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-2 rounded-lg flex items-center gap-1 text-sm font-bold transition-colors"
                >
                   <Plus className="w-4 h-4" /> {t('add')}
                </button>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4">
                {editingTransaction.items.map((item, idx) => (
                  <div key={`${item.productId}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 dark:text-white text-sm">{item.productName}</p>
                      <p className="text-xs text-slate-500">€{item.unitPrice.toFixed(2)} / unit</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 uppercase">{t('col_qty')}</span>
                        <input type="number" min="0" value={item.quantity} onChange={(e) => handleEditQuantity(idx, parseInt(e.target.value) || 0)} className="w-16 p-1 text-center bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-sm font-bold" />
                      </div>
                      <button onClick={() => handleRemoveItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove Item"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))} 
                {editingTransaction.items.length === 0 && (
                  <div className="text-center py-8 text-red-500 italic bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">Warning: Saving empty transaction will delete it.</div>
                )}
             </div>

             <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={handleDeleteTransaction} className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium flex items-center gap-2 transition-colors"><Trash2 className="w-4 h-4" /> {t('delete_transaction')}</button>
                <div className="flex gap-2">
                  <button onClick={() => setEditingTransaction(null)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium">{t('cancel')}</button>
                  <button onClick={handleSaveTransaction} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2"><Save className="w-4 h-4" /> {t('save_changes')}</button>
                </div>
             </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-6 h-6" />{t('reports')}</h2><p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{settings.vesselName} | {monthLabel}</p></div>
        <div className="flex items-center gap-2">
           {activeTab === 'ORDER_SHEET' && (
             <>
               <div className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 mr-2"><Calendar className="w-4 h-4 text-slate-500 dark:text-slate-300" /><input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="bg-transparent outline-none text-sm text-slate-700 dark:text-white font-bold" /></div>
               <button onClick={handlePrint} className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-sm hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-600"><Printer className="w-5 h-5" /> {t('print')}</button>
             </>
           )}
           {activeTab !== 'ORDER_SHEET' && (
             <button onClick={handleExportPDF} className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-xl flex items-center gap-3 text-base font-bold transition-all shadow-lg hover:scale-105 active:scale-95"><FileText className="w-5 h-5" /> {t('export_pdf')}</button>
           )}
           <button onClick={handleRefresh} className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 px-3 py-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors ml-2" title={t('refresh')}><RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>
      <div className="flex gap-1 no-print border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {[ { id: 'PAYROLL', label: t('payroll_report') }, { id: 'MONTHLY', label: t('monthly_report') }, { id: 'REPRESENTATION', label: t('rep_report') }, { id: 'INVENTORY', label: t('inventory_report') }, { id: 'HISTORY', label: t('history_report') }, { id: 'ORDER_SHEET', label: t('order_sheet') }, ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap relative ${ activeTab === tab.id ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50' }`} >
            {tab.label}
            {activeTab === tab.id && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
          </button>
        ))}
      </div>
      {isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in no-print"><RefreshCw className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-4" /><p className="text-slate-500 dark:text-slate-400 font-medium">Refreshing reports...</p></div>
      ) : (
        <React.Fragment>
          {activeTab === 'PAYROLL' && (
            <div className="bg-white dark:bg-slate-800 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 print:shadow-none print:border-none print:p-0">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-8 border border-slate-200 dark:border-slate-600 flex justify-between items-center max-w-sm ml-auto print:hidden"><div><h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('total_summary_eur')}</h4><p className="text-xs text-slate-400">All crew combined</p></div><div className="text-2xl font-mono font-bold text-slate-800 dark:text-white">€{grandTotalEUR.toFixed(2)}</div></div>
              {eurCrew.length > 0 && <PayrollTableSection data={eurCrew} currency="EUR" total={totalDeductionEUR} />}
              {eurCrew.length > 0 && usdCrew.length > 0 && <div className="print:block hidden h-8 page-break" style={{ pageBreakBefore: 'always' }}></div>}
              {eurCrew.length > 0 && usdCrew.length > 0 && <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-12 print:hidden"></div>}
              {usdCrew.length > 0 && <PayrollTableSection data={usdCrew} currency="USD" total={totalDeductionUSD} />}
              {eurCrew.length === 0 && usdCrew.length === 0 && <p className="text-center text-slate-400 italic py-12">{t('empty_list')}</p>}
            </div>
          )}
          {activeTab === 'MONTHLY' && (
            <div className="bg-white dark:bg-slate-900 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 print:shadow-none print:border-none print:p-0">
              <div className="text-center mb-8 hidden print:block"><h2 className="text-lg font-bold">{settings.vesselName}</h2><h1 className="text-xl font-bold uppercase mt-2">{t('monthly_title')}</h1><p className="text-slate-500 mt-1">{t('period')}: {monthLabel}</p></div>
              <div className="overflow-x-auto pb-4">
                 <table className="w-full text-left border-collapse text-xs">
                    <thead>
                       <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                          <th className="p-3 font-semibold uppercase tracking-wider w-[180px]" rowSpan={2}>{t('col_product')}</th>
                          <th className="p-2 text-center font-normal" rowSpan={2}>{t('col_unit')}</th>
                          <th className="p-2 text-center font-normal" rowSpan={2}>{t('col_units_pack')}</th>
                          <th className="p-2 text-right font-normal" rowSpan={2}>{t('col_price_pack')}</th>
                          <th className="p-2 text-right font-normal border-r border-slate-100 dark:border-slate-800" rowSpan={2}>{t('col_price_unit')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider border-r border-slate-100 dark:border-slate-800" colSpan={2}>{t('initial_stock')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 bg-green-50/30 dark:bg-green-900/10" colSpan={2}>{t('col_supply')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10" colSpan={2}>{t('col_cons_crew')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 bg-orange-50/30 dark:bg-orange-900/10" colSpan={2}>{t('col_cons_chart')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 bg-cyan-50/30 dark:bg-cyan-900/10" colSpan={2}>{t('col_cons_owner')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800" colSpan={2}>{t('col_consumption')}</th>
                          <th className="p-2 text-center font-semibold uppercase tracking-wider" colSpan={2}>{t('col_ending')}</th>
                       </tr>
                       <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                          <th className="pb-2 text-center font-normal">{t('col_qty')}</th><th className="pb-2 text-center font-normal border-r border-slate-100 dark:border-slate-800">{t('col_value')}</th>
                          <th className="pb-2 text-center font-normal bg-green-50/30 dark:bg-green-900/10">{t('col_qty')}</th><th className="pb-2 text-center font-normal border-r border-slate-100 dark:border-slate-800 bg-green-50/30 dark:bg-green-900/10">{t('col_value')}</th>
                          <th className="pb-2 text-center font-normal bg-blue-50/30 dark:bg-blue-900/10">{t('col_qty')}</th><th className="pb-2 text-center font-normal border-r border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">{t('col_value')}</th>
                          <th className="pb-2 text-center font-normal bg-orange-50/30 dark:bg-orange-900/10">{t('col_qty')}</th><th className="pb-2 text-center font-normal border-r border-slate-100 dark:border-slate-800 bg-orange-50/30 dark:bg-orange-900/10">{t('col_value')}</th>
                          <th className="pb-2 text-center font-normal bg-cyan-50/30 dark:bg-cyan-900/10">{t('col_qty')}</th><th className="pb-2 text-center font-normal border-r border-slate-100 dark:border-slate-800 bg-cyan-50/30 dark:bg-cyan-900/10">{t('col_value')}</th>
                          <th className="pb-2 text-center font-normal bg-slate-100 dark:bg-slate-800">{t('col_qty')}</th><th className="pb-2 text-center font-normal border-r border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">{t('col_value')}</th>
                          <th className="pb-2 text-center font-normal">{t('col_qty')}</th><th className="pb-2 text-center font-normal">{t('col_value')}</th>
                       </tr>
                    </thead>
                    <tbody>
                       {monthlyReportData.map(group => (
                         <React.Fragment key={group.category}>
                           <tr className="bg-slate-50 dark:bg-slate-800/50"><td colSpan={19} className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">{t(`cat_${group.category.toLowerCase().replace(/ /g, '_')}`) || group.category}</td></tr>
                           {group.items.map(item => (
                             <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 last:border-0 text-xs transition-colors">
                                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{item.name}</td>
                                <td className="py-2 text-center text-slate-500">{item.unitType}</td><td className="py-2 text-center text-slate-500">{item.packSize}</td>
                                <td className="py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">{item.pricePerPack.toFixed(1)}</td>
                                <td className="py-2 text-right text-slate-400 tabular-nums border-r border-slate-100 dark:border-slate-800 pr-2">{item.pricePerUnit.toFixed(1)}</td>
                                <td className="py-2 text-center font-medium text-slate-700 dark:text-slate-300">{item.initialStock}</td><td className="py-2 text-center text-slate-500 tabular-nums border-r border-slate-100 dark:border-slate-800">{item.valInitial.toFixed(1)}</td>
                                <td className="py-2 text-center text-green-600 dark:text-green-400 bg-green-50/10 dark:bg-green-900/5">{item.totalSupply || ''}</td><td className="py-2 text-center text-green-600/70 dark:text-green-400/70 tabular-nums border-r border-slate-100 dark:border-slate-800 bg-green-50/10 dark:bg-green-900/5">{item.valTotalSupply > 0 ? item.valTotalSupply.toFixed(1) : ''}</td>
                                <td className="py-2 text-center text-blue-600 dark:text-blue-400 bg-blue-50/10 dark:bg-green-900/5">{item.crewQty || ''}</td><td className="py-2 text-center text-blue-600/70 dark:text-blue-400/70 tabular-nums border-r border-slate-100 dark:border-slate-800 bg-blue-50/10 dark:bg-blue-900/5">{item.crewVal > 0 ? item.crewVal.toFixed(1) : ''}</td>
                                <td className="py-2 text-center text-orange-600 dark:text-orange-400 bg-orange-50/10 dark:bg-orange-900/5">{item.chartQty || ''}</td><td className="py-2 text-center text-orange-600/70 dark:text-orange-400/70 tabular-nums border-r border-slate-100 dark:border-slate-800 bg-orange-50/10 dark:bg-orange-900/5">{item.chartVal > 0 ? item.chartVal.toFixed(1) : ''}</td>
                                <td className="py-2 text-center text-cyan-600 dark:text-cyan-400 bg-cyan-50/10 dark:bg-cyan-900/5">{item.ownQty || ''}</td><td className="py-2 text-center text-cyan-600/70 dark:text-cyan-400/70 tabular-nums border-r border-slate-100 dark:border-slate-800 bg-cyan-50/10 dark:bg-cyan-900/5">{item.ownVal > 0 ? item.ownVal.toFixed(1) : ''}</td>
                                <td className="py-2 text-center font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">{item.totalConsumption || ''}</td><td className="py-2 text-center text-slate-500 tabular-nums border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">{item.valConsumption > 0 ? item.valConsumption.toFixed(1) : ''}</td>
                                <td className="py-2 text-center font-bold text-slate-800 dark:text-white">{item.endingStock}</td><td className="py-2 text-center font-medium text-slate-800 dark:text-slate-200 tabular-nums">{item.valEnding.toFixed(1)}</td>
                             </tr>
                           ))}
                         </React.Fragment>
                       ))}
                    </tbody>
                    <tfoot>
                       <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                          <td colSpan={5} className="py-3 px-3 text-right uppercase text-xs tracking-wider">{t('total')}</td>
                          <td className="py-3 text-center"></td><td className="py-3 text-center tabular-nums text-xs">{monthlyTotals.valInitial.toFixed(1)} €</td>
                          <td className="py-3 text-center bg-green-50/20 dark:bg-green-900/10"></td><td className="py-3 text-center tabular-nums text-xs text-green-700 dark:text-green-400 bg-green-50/20 dark:bg-green-900/10">{monthlyTotals.valTotalSupply > 0 ? monthlyTotals.valTotalSupply.toFixed(1) + ' €' : ''}</td>
                          <td className="py-3 text-center bg-blue-50/20 dark:bg-blue-900/10"></td><td className="py-3 text-center tabular-nums text-xs text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/10">{monthlyTotals.crewVal > 0 ? monthlyTotals.crewVal.toFixed(1) + ' €' : ''}</td>
                          <td className="py-3 text-center bg-orange-50/20 dark:bg-orange-900/10"></td><td className="py-3 text-center tabular-nums text-xs text-orange-700 dark:text-orange-400 bg-orange-50/20 dark:bg-orange-900/10">{monthlyTotals.chartVal > 0 ? monthlyTotals.chartVal.toFixed(1) + ' €' : ''}</td>
                          <td className="py-3 text-center bg-cyan-50/20 dark:bg-cyan-900/10"></td><td className="py-3 text-center tabular-nums text-xs text-cyan-700 dark:text-cyan-400 bg-cyan-50/20 dark:bg-cyan-900/10">{monthlyTotals.ownVal > 0 ? monthlyTotals.ownVal.toFixed(1) + ' €' : ''}</td>
                          <td className="py-3 text-center bg-slate-50 dark:bg-slate-800"></td><td className="py-3 text-center tabular-nums text-xs bg-slate-50 dark:bg-slate-800">{monthlyTotals.valConsumption.toFixed(1)} €</td>
                          <td className="py-3 text-center"></td><td className="py-3 text-center tabular-nums text-xs">{monthlyTotals.valEnding.toFixed(1)} €</td>
                       </tr>
                    </tfoot>
                 </table>
              </div>
            </div>
          )}
          {activeTab === 'REPRESENTATION' && (
             <div className="bg-white dark:bg-slate-800 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 print:shadow-none print:border-none print:p-0">
                 <div className="text-center mb-6 hidden print:block"><h2 className="text-lg font-bold">{settings.vesselName}</h2><h1 className="text-xl font-bold uppercase mt-2">{t('rep_title')}</h1><p className="text-slate-500 mt-1">{t('period')}: {monthLabel}</p></div>
                 <div className="overflow-x-auto pb-4">
                   <table className="w-full text-left border-collapse text-xs">
                      <thead>
                         <tr><th className="p-2 w-[180px]"></th><th className="p-2 text-center font-bold text-orange-600 dark:text-orange-400 border-b-2 border-orange-100 dark:border-orange-900/50 uppercase tracking-wider" colSpan={7}>{t('rep_charterers_full')}</th><th className="p-2 text-center font-bold text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-100 dark:border-cyan-900/50 uppercase tracking-wider" colSpan={7}>{t('rep_owners_full')}</th></tr>
                         <tr className="text-[10px] text-slate-400 uppercase tracking-wide"><th className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-300">{t('col_product')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk1')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk2')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk3')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk4')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk5')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-semibold text-slate-500 dark:text-slate-300 w-12">{t('col_qty')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-semibold text-slate-500 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 w-16">{t('col_value')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk1')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk2')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk3')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk4')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-normal w-10">{t('wk5')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-semibold text-slate-500 dark:text-slate-300 w-12">{t('col_qty')}</th><th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-semibold text-slate-500 dark:text-slate-300 w-16">{t('col_value')}</th></tr>
                      </thead>
                      <tbody>
                         {repReportData.map(group => (
                           <React.Fragment key={group.category}>
                              <tr className="bg-slate-50 dark:bg-slate-800/50"><td colSpan={15} className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">{group.category}</td></tr>
                              {group.items.map(item => (
                                 <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"><td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200">{item.name} <span className="text-slate-400 ml-1 text-[10px]">({item.unitType})</span></td><td className="py-2 text-center text-slate-400">{item.chartWeeks[0] || '-'}</td><td className="py-2 text-center text-slate-400">{item.chartWeeks[1] || '-'}</td><td className="py-2 text-center text-slate-400">{item.chartWeeks[2] || '-'}</td><td className="py-2 text-center text-slate-400">{item.chartWeeks[3] || '-'}</td><td className="py-2 text-center text-slate-400">{item.chartWeeks[4] || '-'}</td><td className="py-2 text-center font-medium text-slate-700 dark:text-slate-300 bg-orange-50/50 dark:bg-orange-900/10 rounded">{item.chartQty || '-'}</td><td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 pr-2">{item.chartVal > 0 ? item.chartVal.toFixed(2) : '-'}</td><td className="py-2 text-center text-slate-400">{item.ownWeeks[0] || '-'}</td><td className="py-2 text-center text-slate-400">{item.ownWeeks[1] || '-'}</td><td className="py-2 text-center text-slate-400">{item.ownWeeks[2] || '-'}</td><td className="py-2 text-center text-slate-400">{item.ownWeeks[3] || '-'}</td><td className="py-2 text-center text-slate-400">{item.ownWeeks[4] || '-'}</td><td className="py-2 text-center font-medium text-slate-700 dark:text-slate-300 bg-cyan-50/50 dark:bg-cyan-900/10 rounded">{item.ownQty || '-'}</td><td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400 pr-2">{item.ownVal > 0 ? item.ownVal.toFixed(2) : '-'}</td></tr>
                              ))}
                           </React.Fragment>
                         ))}
                      </tbody>
                      <tfoot>
                         <tr className="border-t-2 border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-white"><td className="py-4 px-3 text-right uppercase text-xs tracking-wider text-slate-500">{t('total')}</td><td colSpan={5}></td><td className="py-4 text-center"></td><td className="py-4 text-right tabular-nums border-r border-slate-100 dark:border-slate-800 pr-2">{repTotals.chartVal.toFixed(2)} €</td><td colSpan={5}></td><td className="py-4 text-center"></td><td className="py-4 text-right tabular-nums pr-2">{repTotals.ownVal.toFixed(2)} €</td></tr>
                      </tfoot>
                   </table>
                 </div>
             </div>
          )}
          {activeTab === 'ORDER_SHEET' && (
             <div className="flex flex-col items-center">
               <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-sm border border-slate-300 dark:border-slate-600 p-8 w-full max-w-[1200px] overflow-x-auto print:shadow-none print:border-none print:p-0 print:m-0">
                   <div className="flex justify-between items-start mb-8 border-b pb-6">
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a8a] dark:text-blue-400">{settings.vesselName}</h2>
                        <h1 className="text-2xl font-black uppercase mt-1 tracking-tight text-slate-800 dark:text-white">{t('order_sheet_title')}</h1>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('issue_date')}</p>
                        <p className="text-lg font-mono font-bold text-red-600 dark:text-red-500">{formatDate(orderDate)}</p>
                      </div>
                   </div>
                   
                   <div className="overflow-x-auto pb-4">
                     <table className="w-full text-left border-collapse text-[11px] print:text-[9px]">
                        <thead>
                           <tr className="bg-[#1e3a8a] text-white print:bg-[#1e3a8a] print:text-white">
                             <th className="p-3 border border-[#1e3a8a] text-center w-10 print:p-1">#</th>
                             <th className="p-3 border border-[#1e3a8a] w-56 font-bold uppercase print:p-1">{t('name')}</th>
                             <th className="p-3 border border-[#1e3a8a] w-36 font-bold uppercase print:p-1">{t('rank')}</th>
                             {products.sort((a,b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name)).map(p => (
                               <th key={p.id} className="p-0 border border-[#1e3a8a] w-10 align-bottom h-40 print:h-24">
                                 <div className="flex justify-center items-end h-full pb-4 print:pb-2">
                                   <span className="whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-bold tracking-widest text-[10px] print:text-[8px]">{p.name}</span>
                                 </div>
                               </th>
                             ))} 
                             <th className="p-3 border border-[#1e3a8a] w-40 text-center font-bold uppercase print:p-1">{t('signature')}</th>
                           </tr>
                        </thead>
                        <tbody>
                           {crew.filter(c => c.isActive).sort((a,b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.localeCompare(b.name)).map((member, idx) => (
                             <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 print:hover:bg-transparent">
                               <td className="p-3 border border-slate-300 dark:border-slate-600 text-center font-bold text-slate-400 print:p-1">{idx + 1}</td>
                               <td className="p-3 border border-slate-300 dark:border-slate-600 font-bold text-slate-800 dark:text-white print:p-1">{member.name}</td>
                               <td className="p-3 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-medium print:p-1">{member.rank}</td>
                               {products.map(p => (
                                 <td key={p.id} className="p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 print:p-1"></td>
                               ))} 
                               <td className="p-3 border border-slate-300 dark:border-slate-600 h-10 print:p-1"></td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                   </div>
               </div>
               <p className="mt-4 text-xs text-slate-500 italic no-print">Portrait of the exported document. All product columns are generated automatically.</p>
             </div>
          )}
          {activeTab === 'INVENTORY' && (
            <div className="bg-white dark:bg-slate-800 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 print:shadow-none print:border-none print:p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">{t('col_product')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">{t('col_start')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center bg-green-50/30 dark:bg-green-900/10">{t('sup1_short')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center bg-green-50/30 dark:bg-green-900/10">{t('sup2_short')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center bg-green-50/30 dark:bg-green-900/10">{t('sup3_short')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">{t('col_in')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">{t('col_out_crew')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">{t('col_out_rep')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">{t('col_total_out')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">{t('col_end')}</th></tr>
                  </thead>
                  <tbody>
                    {inventoryReport.map((p) => (<tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group print:hover:bg-transparent"><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 font-medium text-slate-800 dark:text-white">{p.name}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400">{p.initialStock}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-green-600 dark:text-green-400 bg-green-50/10 dark:bg-green-900/5">{p.addedStock1 > 0 ? `+${p.addedStock1}` : '-'}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-green-600 dark:text-green-400 bg-green-50/10 dark:bg-green-900/5">{p.addedStock2 > 0 ? `+${p.addedStock2}` : '-'}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-green-600 dark:text-green-400 bg-green-50/10 dark:bg-green-900/5">{p.addedStock3 > 0 ? `+${p.addedStock3}` : '-'}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 font-medium">{p.totalAdded > 0 ? <span className="text-green-700 dark:text-green-400">+{p.totalAdded}</span> : '-'}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-slate-500">{p.soldToCrew > 0 ? p.soldToCrew : '-'}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center text-slate-500">{p.givenToReps > 0 ? p.givenToReps : '-'}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center font-medium text-slate-700 dark:text-slate-300">{p.totalOut}</td><td className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-center font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/50">{p.finalStock}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'HISTORY' && (
            <div className="bg-white dark:bg-slate-800 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 print:shadow-none print:border-none print:p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                   </div>
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('filter_by_recipient')}</label>
                 </div>
                 <select 
                    value={historyRecipientFilter}
                    onChange={(e) => setHistoryRecipientFilter(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 shadow-sm"
                 >
                    <option value="ALL">{t('all_recipients')}</option>
                    <optgroup label={t('crew')}>
                      {sortedCrew.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.rank}){!c.isActive ? ` - ${t('inactive')}` : ''}</option>
                      ))}
                    </optgroup>
                    <option value="REPRESENTATION">{t('representation')}</option>
                 </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">{t('col_date')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">{t('col_recipient')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">{t('col_items')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-right">{t('col_amount')}</th><th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 text-xs w-16 no-print"></th></tr>
                  </thead>
                  <tbody>
                    {sortedHistory.length === 0 ? (<tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">{t('empty_list')}</td></tr>) : (sortedHistory.map((tr) => (<tr key={tr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors print:hover:bg-transparent"><td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(tr.timestamp)}</td><td className="py-3 px-4"><span className="font-medium text-slate-800 dark:text-white block">{tr.recipientName}</span><span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${tr.type === TransactionType.CREW ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300' : 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300'}`}>{tr.type === TransactionType.CREW ? t('crew') : t('representation')}</span></td><td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">{tr.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}</td><td className="py-3 px-4 font-mono font-medium text-right text-slate-800 dark:text-white tabular-nums">€{tr.totalAmount.toFixed(2)}</td><td className="py-3 px-4 text-right no-print"><button onClick={() => handleEditClick(tr)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title={t('edit_transaction')}><Edit2 className="w-4 h-4" /></button></td></tr>)))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </React.Fragment>
      )}
    </div>
  );
};