export interface Product {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  price: number;
  sellingPrice: number;
  unit: string;
  numberOfDaysToExpire: number;
  image?: string;
}
export interface Category {
  categoryId: string;
  name: string;
}
export interface Ingredient {
  ingredientId: string;
  ingredientName: string;
  unit: string;
}
export interface Order {
  orderId: string;
  storeId: string;
  status: string;
  totalAmount: number;
  sentTime?: string;
  note?: string;
  type?: string;
  productBatches?: {
    productName: string;
    qualityOrder: number;
    unit: string;
  }[];
}
