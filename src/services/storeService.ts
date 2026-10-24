import { api, collection, normalize } from "./api";

export interface Store {
  storeId: string;
  storeName: string;
  address?: string;
  status?: string;
}

export const storeService = {
  getAll: async (): Promise<Store[]> =>
    collection<Store>(await api("/store")),

  getById: async (id: string): Promise<Store> =>
    normalize<Store>(await api(`/store/${encodeURIComponent(id)}`)),

  create: (storeName: string, address?: string) =>
    api("/store", {
      method: "POST",
      body: JSON.stringify({ storeName, address }),
    }),

  update: (id: string, storeName: string, address?: string) =>
    api(`/store/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ storeName, address }),
    }),

  delete: (id: string) =>
    api(`/store/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
