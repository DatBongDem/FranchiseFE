import { api, normalize } from "./api";
import type { Product } from "../types/product";
import type { Role } from "../types/user";
export type ProductEdit = Pick<
  Product,
  "productName" | "price" | "sellingPrice" | "unit" | "numberOfDaysToExpire"
>;
export function productFields(p: ProductEdit): ProductEdit {
  return {
    productName: p.productName,
    price: Number(p.price),
    sellingPrice: Number(p.sellingPrice),
    unit: p.unit,
    numberOfDaysToExpire: Number(p.numberOfDaysToExpire),
  };
}
export function validateProductEdit(p: ProductEdit) {
  if (
    !p.productName.trim() ||
    p.productName.length > 150 ||
    !p.unit.trim() ||
    p.unit.length > 30
  )
    throw new Error(
      "Tên (tối đa 150 ký tự) và đơn vị (tối đa 30 ký tự) không được để trống.",
    );
  for (const n of [p.price, p.sellingPrice])
    if (
      !Number.isFinite(n) ||
      n < 0 ||
      n > 999999999999.99 ||
      Math.abs(n * 100 - Math.round(n * 100)) > 0.00001
    )
      throw new Error(
        "Giá phải không âm, tối đa 999.999.999.999,99 và có tối đa 2 số thập phân.",
      );
  if (
    !Number.isInteger(p.numberOfDaysToExpire) ||
    p.numberOfDaysToExpire < 0 ||
    p.numberOfDaysToExpire > 2147483647
  )
    throw new Error(
      "Hạn sử dụng phải là số nguyên từ 0 đến 2.147.483.647 ngày.",
    );
}
function access(role: Role, id: string) {
  if (role !== "ADMIN") throw new Error("Chỉ quản trị viên được sửa sản phẩm.");
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
    throw new Error("Mã sản phẩm không hợp lệ.");
}
export const productEditService = {
  async get(role: Role, id: string): Promise<Product> {
    access(role, id);
    const r = normalize<{ status: number; product: Product }>(
      await api(`/product/${id}`),
    );
    const p = r?.product;
    if (
      r?.status !== 0 ||
      !p ||
      p.productId?.toLowerCase() !== id.toLowerCase() ||
      typeof p.productName !== "string" ||
      typeof p.unit !== "string"
    )
      throw new Error("Thông tin sản phẩm không hợp lệ.");
    for (const n of [p.price, p.sellingPrice, p.numberOfDaysToExpire])
      if (
        (typeof n !== "number" && typeof n !== "string") ||
        String(n).trim() === "" ||
        !Number.isFinite(Number(n))
      )
        throw new Error("Số liệu sản phẩm không hợp lệ.");
    return { ...p, ...productFields(p) };
  },
  async update(role: Role, original: Product, next: ProductEdit) {
    access(role, original.productId);
    validateProductEdit(next);
    const body = {
      ...next,
      productName: next.productName.trim(),
      unit: next.unit.trim(),
    };
    const latest = await this.get(role, original.productId);
    if (
      JSON.stringify(productFields(latest)) !==
      JSON.stringify(productFields(original))
    )
      throw new Error(
        "Sản phẩm đã thay đổi ở phiên khác. Đóng và mở lại trước khi sửa.",
      );
    try {
      const r = await api<{ status: number }>(
        `/product/${original.productId}`,
        { method: "PUT", body: JSON.stringify(body) },
      );
      if (r?.status !== 0) throw new Error("Lưu thất bại.");
      const saved = await this.get(role, original.productId);
      if (
        JSON.stringify(productFields(saved)) !==
        JSON.stringify(productFields(body))
      )
        throw new Error("Kết quả không khớp.");
      return saved;
    } catch {
      throw new Error(
        "Chưa xác nhận được kết quả lưu. Đóng và tải lại sản phẩm để kiểm tra; không tự gửi lại.",
      );
    }
  },
};
