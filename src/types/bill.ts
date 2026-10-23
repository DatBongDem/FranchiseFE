export interface BillItem {
  productId: string;
  quantity: number;
}
export interface StoreStock {
  productId: string;
  productName: string;
  unit: string;
  totalQuantity: number;
}
export interface BillDetail {
  billDetailId: string;
  productId: string;
  productName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
export interface Bill {
  billId: string;
  storeId: string;
  userId: string;
  createdTime: string;
  totalAmount: number;
  note?: string;
  storeName: string;
  storeAddress?: string;
  staffName?: string;
  details: BillDetail[];
}
export interface BillHistory {
  data: Bill[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
}
export type BillAttempt =
  | { startedAt: string; status: "pending" }
  | { startedAt: string; status: "created"; billId: string };
