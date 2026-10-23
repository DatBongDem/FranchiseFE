import { api, ApiError, normalize } from "./api";
import type { User } from "../types/user";
import type { BillDetail } from "../types/bill";
import { validateRevenueRange } from "../utils/revenue";

export interface StoreBill {
  billId: string;
  createdTime: string;
  totalAmount: number;
  details: BillDetail[];
}
export interface StoreBillQuery {
  from: string;
  to: string;
  page: number;
  size: number;
}
export function historyParams(q: StoreBillQuery) {
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
export function searchStoreBills(bills: StoreBill[], search: string) {
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const needle = text(search.trim());
  return bills.filter(
    (b) =>
      text(b.billId).includes(needle) ||
      b.details.some((d) => text(d.productName).includes(needle)),
  );
}
const numeric = (v: unknown) => {
  if (
    (typeof v !== "number" && typeof v !== "string") ||
    String(v).trim() === "" ||
    !Number.isFinite(Number(v))
  )
    throw new Error("Số liệu hóa đơn không hợp lệ.");
  return Number(v);
};
export const storeBillService = {
  async history(user: Pick<User, "role" | "idStore">, q: StoreBillQuery) {
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
        data: StoreBill[];
        totalRecords: number;
        pageNumber: number;
        pageSize: number;
      }>(await api(`/bills/billingHistory/${user.idStore}?${params}`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403)
        throw new Error("Bạn không có quyền xem lịch sử hóa đơn cửa hàng này.");
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
      throw new Error("Dữ liệu lịch sử hóa đơn không hợp lệ.");
    const data = result.data.map((b) => {
      if (
        !b ||
        typeof b.billId !== "string" ||
        typeof b.createdTime !== "string" ||
        !Number.isFinite(Date.parse(b.createdTime)) ||
        !Array.isArray(b.details)
      )
        throw new Error("Thông tin hóa đơn không hợp lệ.");
      return {
        ...b,
        totalAmount: numeric(b.totalAmount),
        details: b.details.map((d) => {
          if (
            !d ||
            typeof d.productName !== "string" ||
            typeof d.productId !== "string"
          )
            throw new Error("Chi tiết hóa đơn không hợp lệ.");
          return {
            ...d,
            quantity: numeric(d.quantity),
            unitPrice: numeric(d.unitPrice),
            totalPrice: numeric(d.totalPrice),
          };
        }),
      };
    });
    return { ...result, data };
  },
};
