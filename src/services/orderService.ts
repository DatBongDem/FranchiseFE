import { api, normalize } from "./api";
import { orderTypes, type DraftOrder, type OrderType } from "../types/order";

export function validateQuantity(quantity: number, allowZero = false) {
  if (
    !Number.isInteger(quantity) ||
    quantity < (allowZero ? 0 : 1) ||
    quantity > 2147483647
  ) {
    throw new Error("Số lượng phải là số nguyên từ 1 đến 2.147.483.647.");
  }
}

async function details(orderId: string, storeId: string): Promise<DraftOrder> {
  if (!storeId) throw new Error("Tài khoản chưa được gán cửa hàng.");
  const order = normalize<DraftOrder>(
    await api(`/order/${encodeURIComponent(orderId)}/details`),
  );
  if (order.storeId?.toLowerCase() !== storeId.toLowerCase())
    throw new Error("Đơn hàng không thuộc cửa hàng của bạn.");
  return { ...order, productBatches: order.productBatches || [] };
}

async function current(storeId: string): Promise<DraftOrder> {
  if (!storeId)
    throw new Error(
      "Tài khoản chưa được gán cửa hàng. Vui lòng liên hệ quản trị viên.",
    );
  const result = await api<{ hasCreatingOrder: boolean; orderId?: string }>(
    "/order/check-creating",
  );
  if (!result.hasCreatingOrder || !result.orderId)
    throw new Error(
      "Cửa hàng chưa có đơn nháp. Vui lòng liên hệ quản trị viên để kiểm tra dữ liệu cửa hàng.",
    );
  const order = await details(result.orderId, storeId);
  if (order.status !== "Creating")
    throw new Error("Đơn nháp đã thay đổi trạng thái. Vui lòng tải lại.");
  return order;
}

async function assertCurrent(orderId: string, storeId: string) {
  const order = await current(storeId);
  if (order.orderId.toLowerCase() !== orderId.toLowerCase())
    throw new Error(
      "Đơn nháp đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại trước khi tiếp tục.",
    );
  return order;
}

export const orderService = {
  current,
  details,
  async add(
    orderId: string,
    storeId: string,
    productId: string,
    quantity: number,
  ) {
    validateQuantity(quantity);
    const order = await assertCurrent(orderId, storeId);
    if (
      order.productBatches.some(
        (batch) => batch.productId.toLowerCase() === productId.toLowerCase(),
      )
    )
      throw new Error(
        "Sản phẩm đã có trong đơn. Hãy cập nhật số lượng tại danh sách món đã chọn.",
      );
    await api("/productbatches", {
      method: "POST",
      body: JSON.stringify({ productId, qualityOrder: quantity }),
    });
  },
  async setQuantity(
    orderId: string,
    storeId: string,
    productId: string,
    quantity: number,
  ) {
    validateQuantity(quantity, true);
    await assertCurrent(orderId, storeId);
    await api(`/productbatches/${encodeURIComponent(productId)}`, {
      method: "PUT",
      body: JSON.stringify({ qualityOrder: quantity }),
    });
  },
  async save(orderId: string, storeId: string, type: OrderType, note: string) {
    if (!Object.hasOwn(orderTypes, type))
      throw new Error("Loại đơn không hợp lệ.");
    await assertCurrent(orderId, storeId);
    // The backend update service reads PascalCase fields, unlike batch endpoints.
    await api(`/order/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: JSON.stringify({ Type: type, Note: note }),
    });
  },
  async send(orderId: string, storeId: string, type: OrderType, note: string) {
    const order = await assertCurrent(orderId, storeId);
    if (!order.productBatches.length)
      throw new Error("Hãy thêm ít nhất một sản phẩm trước khi gửi đơn.");
    order.productBatches.forEach((batch) =>
      validateQuantity(batch.qualityOrder),
    );
    await this.save(orderId, storeId, type, note);
    try {
      await api(`/order/${encodeURIComponent(orderId)}/sent-to-pending`, {
        method: "PUT",
      });
    } catch (error) {
      // A lost response can happen after the server has already submitted the order.
      // Read the original order; never submit the newly generated draft automatically.
      const after = await details(orderId, storeId).catch(() => null);
      if (!after || after.status === "Creating" || after.status === "Canceled")
        throw error;
    }
  },
};
