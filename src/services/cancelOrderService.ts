import { api, normalize } from "./api";
import { operationsService } from "./operationsService";
import type { Order } from "../types/product";
import type { User } from "../types/user";
type Actor = Pick<User, "role" | "idStore">;
export function canCancelOrder(user: Actor, order: Order) {
  if (
    ![
      "ADMIN",
      "MANAGER",
      "STORESTAFF",
      "KITCHENSTAFF",
      "SUPPLYCOORDINATOR",
    ].includes(user.role)
  )
    return false;
  if (
    ![
      "Creating",
      "Pending",
      "PickedUp",
      "WaitingForCooking",
      "Cooking",
      "Cooked",
      "TakenFrom",
      "Arrived",
    ].includes(order.status)
  )
    return false;
  return (
    !["MANAGER", "STORESTAFF"].includes(user.role) ||
    (!!user.idStore &&
      user.idStore.toLowerCase() === order.storeId?.toLowerCase())
  );
}
export async function cancelOrder(user: Actor, order: Order, reason: string) {
  if (!canCancelOrder(user, order))
    throw new Error(
      "Không thể hủy đơn này với tài khoản hoặc trạng thái hiện tại.",
    );
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(order.orderId))
    throw new Error("Mã đơn không hợp lệ.");
  // Check the visible order again before mutating; the server remains authoritative.
  const latest = (await operationsService.orders(user.role, user.idStore)).find(
    (o) => o.orderId.toLowerCase() === order.orderId.toLowerCase(),
  );
  if (!latest || !canCancelOrder(user, latest))
    throw new Error(
      "Đơn đã thay đổi hoặc không còn trong danh sách. Hãy đóng và tải lại.",
    );
  try {
    const result = normalize<Order>(
      await api(`/order/${encodeURIComponent(order.orderId)}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ cancellationReason: reason.trim() || null }),
      }),
    );
    if (
      result?.orderId?.toLowerCase() !== order.orderId.toLowerCase() ||
      result.status !== "Canceled"
    )
      throw new Error("Phản hồi hủy đơn không hợp lệ.");
    return result;
  } catch {
    // The API can return an error after persisting cancellation. Never replay PUT.
    const after = await operationsService
      .orders(user.role, user.idStore)
      .catch(() => null);
    const canceled = after?.find(
      (o) =>
        o.orderId.toLowerCase() === order.orderId.toLowerCase() &&
        o.status === "Canceled",
    );
    if (canceled) return canceled;
    throw new Error(
      "Chưa xác nhận được kết quả hủy. Hãy đóng hộp thoại và tải lại danh sách để kiểm tra trước khi thao tác tiếp.",
    );
  }
}
