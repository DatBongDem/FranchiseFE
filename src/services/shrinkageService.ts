import { api, ApiError, normalize } from "./api";
import type { ShrinkageReport } from "../types/shrinkage";
import type { User } from "../types/user";
import { expiryDay } from "../utils/shrinkage";
function number(value: unknown) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    value === "" ||
    (typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value)) ||
    !Number.isFinite(Number(value))
  )
    throw new Error("Số liệu hao hụt trả về không hợp lệ.");
  return Number(value);
}
export const shrinkageService = {
  async report(user: Pick<User, "role" | "idStore">): Promise<ShrinkageReport> {
    if (user.role !== "MANAGER")
      throw new Error("Chỉ quản lý cửa hàng được xem báo cáo hao hụt.");
    const storeId = user.idStore;
    if (
      !storeId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        storeId,
      )
    )
      throw new Error(
        "Tài khoản chưa được gán cửa hàng hợp lệ. Vui lòng liên hệ quản trị viên.",
      );
    let result: { status: number; data: ShrinkageReport };
    try {
      result = normalize(
        await api(`/productbatches/${encodeURIComponent(storeId)}/shrinkage`),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403)
        throw new Error(
          "Bạn không có quyền xem hao hụt cửa hàng này. Vui lòng kiểm tra cửa hàng được phân công.",
        );
      throw err;
    }
    if (
      result?.status !== 0 ||
      !result.data?.summary ||
      !Array.isArray(result.data.items)
    )
      throw new Error("Không nhận được báo cáo hao hụt hợp lệ từ máy chủ.");
    const { summary, items } = result.data;
    const sameStore = (id: unknown) =>
      typeof id === "string" && id.toLowerCase() === storeId.toLowerCase();
    if (
      !sameStore(summary.storeId) ||
      items.some((item) => !item || !sameStore(item.storeId))
    )
      throw new Error("Báo cáo không thuộc cửa hàng của bạn.");
    if (
      typeof summary.calculatedAt !== "string" ||
      !Number.isFinite(Date.parse(summary.calculatedAt))
    )
      throw new Error("Thời điểm tính hao hụt không hợp lệ.");
    return {
      summary: {
        ...summary,
        totalExpiredQuantity: number(summary.totalExpiredQuantity),
        totalLossAmount: number(summary.totalLossAmount),
      },
      items: items.map((item) => {
        if (
          typeof item.productId !== "string" ||
          typeof item.productName !== "string"
        )
          throw new Error("Thông tin sản phẩm hao hụt không hợp lệ.");
        return {
          ...item,
          expiredDate: expiryDay(item.expiredDate),
          expiredQuantity: number(item.expiredQuantity),
          lossAmount: number(item.lossAmount),
        };
      }),
    };
  },
};
