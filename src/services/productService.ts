import { api, collection, ApiError } from "./api";
import type { Product, Category } from "../types/product";
export const productService = {
  async list() {
    try {
      return collection<Product>(await api("/product"), "products");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === "Does not any product!!!"
      )
        return [];
      throw error;
    }
  },
  async categories() {
    try {
      return collection<Category>(await api("/category"), "category");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === "Does not any category!!!"
      )
        return [];
      throw error;
    }
  },
  create: (product: Omit<Product, "productId" | "categoryName" | "image">) =>
    api("/product", { method: "POST", body: JSON.stringify(product) }),
};
