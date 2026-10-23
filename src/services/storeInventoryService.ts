import { api, ApiError, normalize } from "./api";
import type { StoreStock } from "../types/bill";
import type { User } from "../types/user";
export type InventorySort = "name" | "quantity-asc" | "quantity-desc";
export function filterInventory(
  items: StoreStock[],
  search: string,
  status: string,
  unit: string,
  sort: InventorySort,
) {
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  return items
    .filter(
      (i) =>
        (text(i.productName).includes(text(search.trim())) ||
          i.productId.toLowerCase().includes(search.trim().toLowerCase())) &&
        (!unit || i.unit === unit) &&
        (!status ||
          (status === "available"
            ? i.totalQuantity > 0
            : i.totalQuantity <= 0)),
    )
    .sort(
      (a, b) =>
        (sort === "quantity-asc"
          ? a.totalQuantity - b.totalQuantity
          : sort === "quantity-desc"
            ? b.totalQuantity - a.totalQuantity
            : 0) ||
        a.productName.localeCompare(b.productName, "vi") ||
        a.productId.localeCompare(b.productId),
    );
}
export const storeInventoryService = {
  async list(user: Pick<User, "role" | "idStore">): Promise<StoreStock[]> {
    if (!["MANAGER", "STORESTAFF"].includes(user.role))
      throw new Error(
        "Chỉ quản lý và nhân viên cửa hàng được xem tồn kho tại trang này.",
      );
    if (
      !user.idStore ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.idStore)
    )
      throw new Error("Tài khoản chưa được gán cửa hàng hợp lệ.");
    let items;
    try {
      items = normalize<StoreStock[]>(
        await api(`/productbatches/${user.idStore}/inventory`),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 403)
        throw new Error("Bạn không có quyền xem tồn kho cửa hàng.");
      throw e;
    }
    if (!Array.isArray(items))
      throw new Error("Danh sách tồn kho không hợp lệ.");
    return items.map((i) => {
      if (
        !i ||
        typeof i.productId !== "string" ||
        typeof i.productName !== "string" ||
        typeof i.unit !== "string" ||
        (typeof i.totalQuantity !== "number" &&
          typeof i.totalQuantity !== "string") ||
        String(i.totalQuantity).trim() === "" ||
        !Number.isFinite(Number(i.totalQuantity))
      )
        throw new Error("Số liệu tồn kho không hợp lệ.");
      return { ...i, totalQuantity: Number(i.totalQuantity) };
    });
  },
};
