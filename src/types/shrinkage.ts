export interface ShrinkageItem {
  storeId: string;
  productId: string;
  productName: string;
  expiredDate: string;
  expiredQuantity: number;
  lossAmount: number;
}
export interface ShrinkageReport {
  summary: {
    storeId: string;
    calculatedAt: string;
    totalExpiredQuantity: number;
    totalLossAmount: number;
  };
  items: ShrinkageItem[];
}
export interface ShrinkageFilter {
  search: string;
  from: string;
  to: string;
}
export type ShrinkageSort =
  "date-asc" | "date-desc" | "loss-desc" | "quantity-desc" | "name";
