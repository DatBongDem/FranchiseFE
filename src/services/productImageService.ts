import { api } from "./api";
import { productEditService } from "./productEditService";
import type { Role } from "../types/user";
import type { Product } from "../types/product";

export const imageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export function productImageSource(value?: string) {
  return value &&
    (/^https?:\/\//i.test(value) ||
      /^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(value))
    ? value
    : undefined;
}
export function validateProductImage(file: File) {
  if (!imageTypes.includes(file.type))
    throw new Error("Chọn ảnh JPG, PNG, WebP hoặc GIF.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Ảnh phải có dung lượng lớn hơn 0 và không quá 10 MB.");
}
export const productImageService = {
  async upload(role: Role, original: Product, file: File) {
    if (role !== "ADMIN")
      throw new Error("Chỉ quản trị viên được tải ảnh sản phẩm.");
    validateProductImage(file);
    const latest = await productEditService.get(role, original.productId);
    if (latest.image !== original.image)
      throw new Error("Ảnh đã thay đổi. Đóng và mở lại để kiểm tra.");
    const body = new FormData();
    body.append("file", file);
    try {
      const result = await api<{ status: number; imageUrl: string }>(
        `/product/${original.productId}/image`,
        { method: "PATCH", body },
      );
      if (result?.status !== 0 || !productImageSource(result.imageUrl))
        throw new Error("Phản hồi không hợp lệ.");
      const saved = await productEditService.get(role, original.productId);
      if (saved.image !== result.imageUrl)
        throw new Error("Ảnh chưa được lưu.");
      return saved;
    } catch {
      throw new Error(
        "Chưa xác nhận được kết quả tải ảnh. Đóng và tải lại sản phẩm để kiểm tra; không tự gửi lại.",
      );
    }
  },
};
