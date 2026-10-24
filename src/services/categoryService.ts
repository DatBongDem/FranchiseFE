import { api, normalize } from "./api";

export interface Category {
  categoryId: string;
  categoryName: string;
}

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const res = await api<{ category: Category[] }>("/category");
    const data = normalize<{ category: Category[] }>(res);
    return Array.isArray(data?.category) ? data.category : [];
  },

  create: (categoryName: string) =>
    api("/category", {
      method: "POST",
      body: JSON.stringify({ categoryName }),
    }),

  update: (id: string, categoryName: string) =>
    api(`/category/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ categoryName }),
    }),

  delete: (id: string) =>
    api(`/category/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
