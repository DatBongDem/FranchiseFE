import { api, ApiError, normalize } from "./api";
import type { Role } from "../types/user";
export interface IngredientHistoryItem {
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  unit: string;
}
export interface IngredientHistory {
  items: IngredientHistoryItem[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
export function filterIngredientHistory(
  items: IngredientHistoryItem[],
  search: string,
  unit: string,
) {
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  return items.filter(
    (i) =>
      text(i.ingredientName).includes(text(search.trim())) &&
      (!unit || i.unit === unit),
  );
}
export const ingredientHistoryService = {
  async byOrder(role: Role, orderId: string): Promise<IngredientHistoryItem[]> {
    if (role !== "KITCHENSTAFF")
      throw new Error("Chỉ nhân viên bếp được xem nguyên liệu theo đơn nấu.");
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(orderId))
      throw new Error("Mã đơn không hợp lệ.");
    let items;
    try {
      items = normalize<IngredientHistoryItem[]>(
        await api(`/ingredient/${orderId}/ingredients`),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        throw new Error("Đơn hàng không còn tồn tại. Hãy tải lại danh sách.");
      if (e instanceof ApiError && e.status === 403)
        throw new Error("Bạn không có quyền xem nguyên liệu của đơn nấu.");
      throw e;
    }
    if (!Array.isArray(items))
      throw new Error("Danh sách nguyên liệu theo đơn không hợp lệ.");
    return items.map((i) => {
      if (
        !i ||
        typeof i.ingredientId !== "string" ||
        typeof i.ingredientName !== "string" ||
        typeof i.unit !== "string" ||
        (typeof i.quantityUsed !== "number" &&
          typeof i.quantityUsed !== "string") ||
        String(i.quantityUsed).trim() === "" ||
        !Number.isFinite(Number(i.quantityUsed))
      )
        throw new Error("Chi tiết sử dụng nguyên liệu không hợp lệ.");
      return { ...i, quantityUsed: Number(i.quantityUsed) };
    });
  },
  async list(role: Role, page = 1, size = 6): Promise<IngredientHistory> {
    if (role !== "KITCHENSTAFF")
      throw new Error("Chỉ nhân viên bếp được xem lịch sử nguyên liệu.");
    if (!Number.isInteger(page) || page < 1 || ![6, 12, 24].includes(size))
      throw new Error("Phân trang không hợp lệ.");
    let result;
    try {
      result = normalize<{ status: number; data: IngredientHistory }>(
        await api(
          `/ingredient/ingredient-history?pageNumber=${page}&pageSize=${size}`,
        ),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 403)
        throw new Error("Bạn không có quyền xem lịch sử nguyên liệu.");
      throw e;
    }
    const data = result?.data;
    if (
      result?.status !== 0 ||
      !data ||
      !Array.isArray(data.items) ||
      !Number.isInteger(data.totalRecords) ||
      data.totalRecords < 0 ||
      data.pageNumber !== page ||
      data.pageSize !== size ||
      data.totalPages !== Math.ceil(data.totalRecords / size)
    )
      throw new Error("Dữ liệu lịch sử nguyên liệu không hợp lệ.");
    return {
      ...data,
      items: data.items.map((i) => {
        if (
          !i ||
          typeof i.ingredientId !== "string" ||
          typeof i.ingredientName !== "string" ||
          typeof i.unit !== "string" ||
          (typeof i.quantityUsed !== "number" &&
            typeof i.quantityUsed !== "string") ||
          String(i.quantityUsed).trim() === "" ||
          !Number.isFinite(Number(i.quantityUsed))
        )
          throw new Error("Chi tiết sử dụng nguyên liệu không hợp lệ.");
        return { ...i, quantityUsed: Number(i.quantityUsed) };
      }),
    };
  },
};
