import { api, ApiError, normalize } from "./api";
import type { User } from "../types/user";
import type {
  ProductRevenue,
  RevenueRange,
  RevenueReport,
  RevenueSummary,
} from "../types/revenue";
import { validateRevenueRange } from "../utils/revenue";
type Manager = Pick<User, "role" | "idStore">;
function amount(value: unknown): number {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    value === "" ||
    (typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value))
  )
    throw new Error("Số liệu doanh thu trả về không hợp lệ.");
  const result = Number(value);
  if (!Number.isFinite(result))
    throw new Error("Số liệu doanh thu trả về không hợp lệ.");
  return result;
}
export const revenueService = {
  async report(user: Manager, range: RevenueRange): Promise<RevenueReport> {
    if (user.role !== "MANAGER")
      throw new Error("Chỉ quản lý cửa hàng được xem báo cáo doanh thu.");
    if (
      !user.idStore ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.idStore,
      )
    )
      throw new Error(
        "Tài khoản chưa được gán cửa hàng hợp lệ. Vui lòng liên hệ quản trị viên.",
      );
    validateRevenueRange(range);
    const params = new URLSearchParams({ date: range.from, endDate: range.to });
    let response: { status: number; data: RevenueReport };
    try {
      response = normalize(
        await api(
          `/bills/stores/${encodeURIComponent(user.idStore)}/revenue?${params}`,
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 403)
        throw new Error(
          "Bạn không có quyền xem doanh thu cửa hàng này. Vui lòng kiểm tra lại cửa hàng được phân công.",
        );
      throw error;
    }
    if (
      response?.status !== 0 ||
      !response.data?.summary ||
      !Array.isArray(response.data.items)
    )
      throw new Error("Không nhận được dữ liệu báo cáo hợp lệ từ máy chủ.");
    const source = response.data.summary;
    const summary: RevenueSummary = {
      saleDate: source.saleDate,
      totalRevenue: amount(source.totalRevenue),
      totalCost: amount(source.totalCost),
      totalProfit: amount(source.totalProfit),
    };
    const items: ProductRevenue[] = response.data.items.map((item) => {
      if (item.storeId?.toLowerCase() !== user.idStore!.toLowerCase())
        throw new Error("Dữ liệu báo cáo không thuộc cửa hàng của bạn.");
      if (
        typeof item.productId !== "string" ||
        typeof item.productName !== "string"
      )
        throw new Error("Thông tin sản phẩm trong báo cáo không hợp lệ.");
      return {
        ...item,
        totalQuantitySold: amount(item.totalQuantitySold),
        totalRevenue: amount(item.totalRevenue),
        totalCost: amount(item.totalCost),
        profit: amount(item.profit),
      };
    });
    return { summary, items };
  },
};
