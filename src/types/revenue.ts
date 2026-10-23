export interface RevenueRange {
  from: string;
  to: string;
}
export interface RevenueSummary {
  saleDate: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}
export interface ProductRevenue {
  storeId: string;
  saleDate: string;
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}
export interface RevenueReport {
  summary: RevenueSummary;
  items: ProductRevenue[];
}
export type RevenueSort =
  | "revenue-desc"
  | "revenue-asc"
  | "profit-desc"
  | "profit-asc"
  | "quantity-desc"
  | "name";
