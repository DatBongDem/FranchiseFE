import { api, collection } from "./api";
import type { Ingredient, Order } from "../types/product";
import type { Role, User } from "../types/user";
export const operationsService = {
  orders: async (role: Role, storeId?: string) => {
    const storeScoped = role === "STORESTAFF" || role === "MANAGER";
    if (storeScoped && !storeId) {
      throw new Error(
        "Tài khoản chưa được gán cửa hàng. Vui lòng liên hệ quản trị viên.",
      );
    }
    const orders = collection<Order>(
      await api(
        role === "SUPPLYCOORDINATOR"
          ? "/delivery"
          : role === "KITCHENSTAFF"
            ? "/order/orders"
            : "/order",
      ),
    );
    return storeScoped
      ? orders.filter(
          (order) => order.storeId?.toLowerCase() === storeId!.toLowerCase(),
        )
      : orders;
  },
  ingredients: async () => collection<Ingredient>(await api("/ingredient")),
  createIngredient: (ingredientName: string, unit: string) =>
    api("/ingredient", {
      method: "POST",
      body: JSON.stringify({ ingredientName, unit }),
    }),
  users: async () => collection<User>(await api("/users")),
  toggleUser: (id: string) =>
    api(`/users/${encodeURIComponent(id)}/toggle-status`, { method: "PUT" }),
  orderAction: (id: string, action: string, delivery = false) =>
    api(
      `/${delivery ? "delivery" : "order"}/${encodeURIComponent(id)}/${action}`,
      { method: "PUT" },
    ),
};
