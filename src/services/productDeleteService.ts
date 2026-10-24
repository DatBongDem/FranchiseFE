import { api, ApiError } from "./api";
import { productEditService, productFields } from "./productEditService";
import type { Product } from "../types/product";
import type { Role } from "../types/user";

export const productDeleteService = {
  async remove(role: Role, original: Product) {
    if (role !== "ADMIN")
      throw new Error("Chỉ quản trị viên được xóa sản phẩm.");
    const latest = await productEditService.get(role, original.productId);
    if (
      JSON.stringify(productFields(latest)) !==
        JSON.stringify(productFields(original)) ||
      latest.categoryId !== original.categoryId
    )
      throw new Error(
        "Sản phẩm đã thay đổi. Đóng và mở lại để kiểm tra trước khi xóa.",
      );
    try {
      const result = await api<{ status: number }>(
        `/product/${original.productId}`,
        { method: "DELETE" },
      );
      if (result?.status !== 0) throw new Error("Xóa thất bại.");
      try {
        await productEditService.get(role, original.productId);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 400 &&
          error.message === "Product does not exist!!!"
        )
          return;
        throw error;
      }
      throw new Error("Sản phẩm vẫn còn trong danh mục.");
    } catch {
      throw new Error(
        "Chưa xác nhận được kết quả xóa. Đóng và tải lại danh sách để kiểm tra; không tự gửi lại yêu cầu.",
      );
    }
  },
};
