
export interface Product {
  id: string;
  sku: string;
  name: string;
}

export interface Movement {
  id: string;
  date: string;
  productId: string;
  in: number;
  out: number;
  notes: string;
}

export type ActiveSheet = 'PRODUCTOS' | 'MOVIMIENTOS' | 'STOCK';

export interface StockSummary {
  sku: string;
  name: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
}
