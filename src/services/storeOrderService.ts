import { api, ApiError, normalize } from "./api";
import type { User } from "../types/user";
export interface OrderHistoryDetail {
  productId: string;
  productName: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
}
import { validateRevenueRange } from "../utils/revenue";

export interface StoreOrder {
  orderId: string;
  createdTime: string | null;
  status: string;
  orderBy: string | null;
  totalAmount: number;
  details: OrderHistoryDetail[];
}
export interface StoreOrderQuery {
  from: string;
  to: string;
  page: number;
  size: number;
}
export function historyParams(q: StoreOrderQuery) {
  if (!Number.isInteger(q.page) || q.page < 1 || ![6, 12, 24].includes(q.size))
    throw new Error("Phân trang không hợp lệ.");
  if (q.from) validateRevenueRange({ from: q.from, to: q.from });
  if (q.to) validateRevenueRange({ from: q.to, to: q.to });
  if (q.from && q.to) validateRevenueRange(q);
  const params = new URLSearchParams({
    pageNumber: String(q.page),
    pageSize: String(q.size),
  });
  if (q.from) params.set("fromDate", `${q.from}T00:00:00.000+07:00`);
  if (q.to) params.set("toDate", `${q.to}T23:59:59.999+07:00`);
  return params;
}
export function searchStoreOrders(bills: StoreOrder[], search: string) {
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const needle = text(search.trim());
  return bills.filter(
    (b) =>
      text(b.orderId).includes(needle) ||
      b.details.some((d) => text(d.productName).includes(needle)),
  );
}
const numeric = (v: unknown) => {
  if (
    (typeof v !== "number" && typeof v !== "string") ||
    String(v).trim() === "" ||
    !Number.isFinite(Number(v))
  )
    throw new Error("Số liệu đơn hàng không hợp lệ.");
  return Number(v);
};
export const storeOrderService = {
  async history(user: Pick<User, "role" | "idStore">, q: StoreOrderQuery) {
    if (user.role !== "MANAGER")
      throw new Error("Chỉ quản lý cửa hàng được xem lịch sử này.");
    if (
      !user.idStore ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.idStore)
    )
      throw new Error("Tài khoản chưa được gán cửa hàng hợp lệ.");
    const params = historyParams(q);
    let result;
    try {
      result = normalize<{
        status: number;
        data: StoreOrder[];
        totalRecords: number;
        pageNumber: number;
        pageSize: number;
      }>(await api(`/order/order-history/${user.idStore}?${params}`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403)
        throw new Error(
          "Bạn không có quyền xem lịch sử đơn hàng cửa hàng này.",
        );
      throw e;
    }
    if (
      !result ||
      result.status !== 0 ||
      !Array.isArray(result.data) ||
      !Number.isInteger(result.totalRecords) ||
      result.totalRecords < 0 ||
      result.pageNumber !== q.page ||
      result.pageSize !== q.size
    )
      throw new Error("Dữ liệu lịch sử đơn hàng không hợp lệ.");
    const data = result.data.map((b) => {
      if (
        !b ||
        typeof b.orderId !== "string" ||
        (b.createdTime !== null && typeof b.createdTime !== "string") ||
        (b.createdTime !== null &&
          !Number.isFinite(Date.parse(b.createdTime))) ||
        typeof b.status !== "string" ||
        (b.orderBy !== null && typeof b.orderBy !== "string") ||
        !Array.isArray(b.details)
      )
        throw new Error("Thông tin đơn hàng không hợp lệ.");
      return {
        ...b,
        totalAmount: numeric(b.totalAmount),
        details: b.details.map((d) => {
          if (
            !d ||
            typeof d.productName !== "string" ||
            typeof d.productId !== "string"
          )
            throw new Error("Chi tiết đơn hàng không hợp lệ.");
          return {
            ...d,
            quantity: numeric(d.quantity),
            unitPrice: numeric(d.unitPrice),
          };
        }),
      };
    });
    return { ...result, data };
  },
};
