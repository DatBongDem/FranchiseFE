export const orderTypes = {
  Normal: "Thông thường",
  Fast: "Nhanh",
  Express: "Hỏa tốc",
} as const;
export type OrderType = keyof typeof orderTypes;
export interface DraftBatch {
  batchId: string;
  productId: string;
  productName: string;
  unit: string;
  qualityOrder: number;
  price: number;
}
export interface DraftOrder {
  orderId: string;
  storeId: string;
  status: string;
  type: OrderType;
  note: string;
  totalAmount: number;
  productBatches: DraftBatch[];
}
