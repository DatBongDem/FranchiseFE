import { api, normalize } from "./api";
import type { Role } from "../types/user";
import type { StoreStock } from "../types/bill";
import { validateRevenueRange } from "../utils/revenue";
export function validateExpiryDate(day: string) {
  validateRevenueRange({ from: day, to: day });
}
export const expiredInventoryService = {
  async byDate(role: Role, day: string): Promise<StoreStock[]> {
    if (role !== "ADMIN")
      throw new Error(
        "Chỉ quản trị viên được xem báo cáo hết hạn toàn hệ thống tại trang này.",
      );
    validateExpiryDate(day);
    const rows = normalize<StoreStock[]>(
      await api(`/productbatches/inventory/expired-by-date/${day}`),
    );
    if (!Array.isArray(rows)) throw new Error("Báo cáo hết hạn không hợp lệ.");
    return rows.map((i) => {
      if (
        !i ||
        typeof i.productId !== "string" ||
        typeof i.productName !== "string" ||
        typeof i.unit !== "string" ||
        (typeof i.totalQuantity !== "number" &&
          typeof i.totalQuantity !== "string") ||
        String(i.totalQuantity).trim() === "" ||
        !Number.isFinite(Number(i.totalQuantity)) ||
        Number(i.totalQuantity) <= 0
      )
        throw new Error("Số liệu hàng hết hạn không hợp lệ.");
      return { ...i, totalQuantity: Number(i.totalQuantity) };
    });
  },
};
