import { api, ApiError, collection, normalize } from "./api";
import type { Bill, BillHistory, BillItem, StoreStock } from "../types/bill";
import type { Product } from "../types/product";
import type { User } from "../types/user";

type Cashier = Pick<User, "id" | "idStore" | "role">;
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class BillUncertainError extends Error {
  constructor() {
    super(
      "Chưa xác định được kết quả tạo hóa đơn. Hãy kiểm tra lịch sử hóa đơn trước khi thực hiện giao dịch mới.",
    );
  }
}
export function requireCashier(user: Cashier) {
  if (user.role !== "STORESTAFF")
    throw new Error("Chỉ nhân viên cửa hàng được tạo hóa đơn.");
  if (!user.idStore || !guid.test(user.idStore) || !guid.test(user.id))
    throw new Error(
      "Tài khoản chưa có thông tin cửa hàng hợp lệ. Vui lòng liên hệ quản trị viên.",
    );
}
export function salePrice(product: Pick<Product, "sellingPrice" | "price">) {
  // Match BillingService's SellingPrice || Price || 0 fallback.
  return Number(product.sellingPrice || product.price || 0);
}
export function validateBillItems(items: BillItem[]) {
  if (!items.length)
    throw new Error("Hãy thêm ít nhất một sản phẩm vào hóa đơn.");
  const ids = new Set<string>();
  for (const item of items) {
    if (!guid.test(item.productId))
      throw new Error("Mã sản phẩm không hợp lệ.");
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > 2147483647
    )
      throw new Error("Số lượng phải là số nguyên từ 1 đến 2.147.483.647.");
    const key = item.productId.toLowerCase();
    if (ids.has(key)) throw new Error("Sản phẩm bị trùng trong hóa đơn.");
    ids.add(key);
  }
}
export function validateBillStock(items: BillItem[], stock: StoreStock[]) {
  validateBillItems(items);
  for (const item of items) {
    const row = stock.find(
      (s) => s.productId.toLowerCase() === item.productId.toLowerCase(),
    );
    if (
      !row ||
      !Number.isFinite(row.totalQuantity) ||
      item.quantity > row.totalQuantity
    )
      throw new Error(
        `Không đủ tồn kho cho ${row?.productName || item.productId}. Vui lòng tải lại tồn kho và giảm số lượng.`,
      );
  }
}
export const billService = {
  async stock(user: Cashier) {
    requireCashier(user);
    return collection<StoreStock>(
      await api(
        `/productbatches/${encodeURIComponent(user.idStore!)}/inventory`,
      ),
    );
  },
  async create(
    user: Cashier,
    items: BillItem[],
    note: string,
  ): Promise<string> {
    requireCashier(user);
    validateBillItems(items);
    validateBillStock(items, await this.stock(user));
    let result: { billId?: unknown };
    try {
      result = normalize(
        await api("/bills", {
          method: "POST",
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
            note: note.trim(),
          }),
        }),
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        [400, 401, 403, 404, 422].includes(error.status)
      )
        throw error;
      throw new BillUncertainError();
    }
    if (
      !result ||
      typeof result.billId !== "string" ||
      !guid.test(result.billId)
    )
      throw new BillUncertainError();
    return result.billId;
  },
  async receipt(user: Cashier, billId: string) {
    requireCashier(user);
    if (!guid.test(billId)) throw new Error("Mã hóa đơn không hợp lệ.");
    const bill = normalize<Bill>(
      await api(`/bills/${encodeURIComponent(billId)}/print`),
    );
    if (bill?.billId?.toLowerCase() !== billId.toLowerCase())
      throw new Error("Mã hóa đơn trả về không khớp. Vui lòng tải lại.");
    if (
      bill.storeId?.toLowerCase() !== user.idStore!.toLowerCase() ||
      bill.userId?.toLowerCase() !== user.id.toLowerCase()
    )
      throw new Error("Hóa đơn không thuộc tài khoản và cửa hàng hiện tại.");
    return { ...bill, details: bill.details || [] };
  },
  async history(
    user: Cashier,
    pageNumber = 1,
    pageSize = 6,
  ): Promise<BillHistory> {
    requireCashier(user);
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      ![6, 12, 24].includes(pageSize)
    )
      throw new Error("Phân trang không hợp lệ.");
    return normalize<BillHistory>(
      await api(`/bills/history?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    );
  },
};
