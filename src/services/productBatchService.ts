import { api, ApiError, normalize } from "./api";
import type { Role } from "../types/user";
import { validateRevenueRange } from "../utils/revenue";
export interface ProductBatch {
  batchId: string;
  productId: string;
  productName: string;
  price: number;
  unit: string;
  qualityOrder: number;
  remainingQuantity: number;
  status: string;
  manufacture: string | null;
  expiry: string | null;
}
export function batchDay(value: string | null) {
  return value?.slice(0, 10) || "";
}
export function validateBatchDates(from: string, to: string) {
  if (from) validateRevenueRange({ from, to: from });
  if (to) validateRevenueRange({ from: to, to });
  if (from && to) validateRevenueRange({ from, to });
}
export function filterBatches(
  items: ProductBatch[],
  search: string,
  from: string,
  to: string,
  stock: string,
) {
  validateBatchDates(from, to);
  return items
    .filter(
      (i) =>
        i.batchId.toLowerCase().includes(search.trim().toLowerCase()) &&
        (!from || (!!i.expiry && batchDay(i.expiry) >= from)) &&
        (!to || (!!i.expiry && batchDay(i.expiry) <= to)) &&
        (!stock ||
          (stock === "available"
            ? i.remainingQuantity > 0
            : i.remainingQuantity <= 0)),
    )
    .sort(
      (a, b) =>
        (a.expiry || "9999").localeCompare(b.expiry || "9999") ||
        a.batchId.localeCompare(b.batchId),
    );
}
export const productBatchService = {
  async list(role: Role, productId: string): Promise<ProductBatch[]> {
    if (role !== "ADMIN")
      throw new Error(
        "Chỉ quản trị viên được xem lô sản phẩm toàn hệ thống tại trang này.",
      );
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(productId))
      throw new Error("Mã sản phẩm không hợp lệ.");
    let items;
    try {
      items = normalize<ProductBatch[]>(
        await api(`/productbatches/products/${productId}/batches`),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return [];
      throw e;
    }
    if (!Array.isArray(items)) throw new Error("Danh sách lô không hợp lệ.");
    const number = (n: unknown) => {
      if (
        (typeof n !== "number" && typeof n !== "string") ||
        String(n).trim() === "" ||
        !Number.isFinite(Number(n))
      )
        throw new Error("Số liệu lô không hợp lệ.");
      return Number(n);
    };
    const date = (d: unknown) => {
      if (d === null) return null;
      if (
        typeof d !== "string" ||
        !/^\d{4}-\d{2}-\d{2}(T|$)/.test(d) ||
        !Number.isFinite(Date.parse(d))
      )
        throw new Error("Ngày của lô không hợp lệ.");
      validateBatchDates(d.slice(0, 10), "");
      return d;
    };
    return items.map((i) => {
      if (
        !i ||
        typeof i.batchId !== "string" ||
        typeof i.productId !== "string" ||
        i.productId.toLowerCase() !== productId.toLowerCase() ||
        typeof i.productName !== "string" ||
        typeof i.unit !== "string" ||
        typeof i.status !== "string"
      )
        throw new Error("Thông tin lô không khớp sản phẩm.");
      return {
        ...i,
        price: number(i.price),
        qualityOrder: number(i.qualityOrder),
        remainingQuantity: number(i.remainingQuantity),
        manufacture: date(i.manufacture),
        expiry: date(i.expiry),
      };
    });
  },
};
