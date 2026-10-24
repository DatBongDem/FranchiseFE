import { api, normalize, ApiError } from "./api";
import type { User } from "../types/user";
export interface Quantitative {
  storeId: string;
  productId: string;
  productName: string;
  quantity: number;
}
type Actor = Pick<User, "role" | "idStore">;
const guid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function access(user: Actor) {
  if (!["MANAGER", "STORESTAFF"].includes(user.role))
    throw new Error(
      "Chỉ quản lý và nhân viên cửa hàng được sử dụng trang định mức.",
    );
  if (!user.idStore || !guid.test(user.idStore))
    throw new Error("Tài khoản chưa được gán cửa hàng hợp lệ.");
}
export function validateQuantitative(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647)
    throw new Error("Định mức phải là số nguyên từ 1 đến 2.147.483.647.");
}
export const quantitativeService = {
  async list(user: Actor): Promise<Quantitative[]> {
    access(user);
    const rows = normalize<Quantitative[]>(await api("/quantitative"));
    if (!Array.isArray(rows))
      throw new Error("Danh sách định mức không hợp lệ.");
    return rows.map((r) => {
      if (
        !r ||
        typeof r.storeId !== "string" ||
        r.storeId.toLowerCase() !== user.idStore!.toLowerCase() ||
        typeof r.productId !== "string" ||
        !guid.test(r.productId) ||
        typeof r.productName !== "string" ||
        (typeof r.quantity !== "number" && typeof r.quantity !== "string") ||
        String(r.quantity).trim() === "" ||
        !Number.isInteger(Number(r.quantity))
      )
        throw new Error(
          "Định mức trả về không hợp lệ hoặc không thuộc cửa hàng của bạn.",
        );
      return { ...r, quantity: Number(r.quantity) };
    });
  },
  async update(user: Actor, original: Quantitative, quantity: number) {
    access(user);
    validateQuantitative(quantity);
    if (
      !guid.test(original.productId) ||
      original.storeId.toLowerCase() !== user.idStore!.toLowerCase()
    )
      throw new Error("Định mức không thuộc cửa hàng của bạn.");
    const latest = (await this.list(user)).find(
      (r) => r.productId.toLowerCase() === original.productId.toLowerCase(),
    );
    if (!latest || latest.quantity !== original.quantity)
      throw new Error(
        "Định mức đã thay đổi hoặc không còn tồn tại. Đóng và tải lại trước khi sửa.",
      );
    try {
      await api(`/quantitative/${original.productId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        throw new Error(
          "Không còn định mức của sản phẩm này. Đóng và tải lại danh sách.",
        );
      if (e instanceof ApiError && [400, 401, 403].includes(e.status)) throw e;
    }
    const after = await this.list(user).catch(() => null);
    if (
      after?.find(
        (r) => r.productId.toLowerCase() === original.productId.toLowerCase(),
      )?.quantity !== quantity
    )
      throw new Error(
        "Chưa xác nhận được kết quả lưu. Đóng và tải lại để kiểm tra; không tự gửi lại.",
      );
  },
};
