

export interface CrewMember {
  id: string;
  name: string;
  rank: string;
  isActive: boolean;
  currency?: 'EUR' | 'USD';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // In Euro (Price per Pack/Carton)
  unitType?: string; // e.g. 'ctn', 'btl', 'pcs'
  packSize?: number; // e.g. 1, 24, 6
  initialStock: number; // Stock at start of month (in single units)
  // Supported up to 3 supplies per month
  addedStock1: number; 
  addedStock2: number;
  addedStock3: number;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export enum TransactionType {
  CREW = 'CREW',
  REPRESENTATION = 'REPRESENTATION'
}

export interface Transaction {
  id: string;
  timestamp: number;
  type: TransactionType;
  recipientId: string; // Crew ID or Representative Name/Note
  recipientName: string; // Snapshot of name
  representationType?: 'CHARTERER' | 'OWNER'; // New field for report grouping
  items: TransactionItem[];
  totalAmount: number;
}

export interface ReportSettings {
  vesselName: string;
  masterName: string;
  reportMonth: string; // "01" to "12"
  reportYear: string; // "2024"
  exchangeRate: number; // EUR to USD rate
  gpbExchangeRate: number; // EUR to GBP rate
  useGbpForPurchases: boolean; // Flag if purchases are made in GBP
}

export type ViewState = 'DASHBOARD' | 'CREW' | 'INVENTORY' | 'DISTRIBUTION' | 'REPORTS' | 'INSTRUCTION';

export type Language = 'en';
export type Theme = 'light' | 'dark';
