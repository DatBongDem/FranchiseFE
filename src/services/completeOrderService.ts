import { api } from "./api";
import { orderService } from "./orderService";
import type { Order } from "../types/product";
import type { User } from "../types/user";
type Actor = Pick<User, "role" | "idStore">;
export function canCompleteOrder(
  user: Actor,
  order: Pick<Order, "status" | "storeId">,
) {
  return (
    user.role === "STORESTAFF" &&
    !!user.idStore &&
    order.storeId?.toLowerCase() === user.idStore.toLowerCase() &&
    order.status === "Arrived"
  );
}
export async function completeOrder(
  user: Actor,
  order: Order,
  feedback: string,
) {
  if (!canCompleteOrder(user, order))
    throw new Error(
      "Chỉ nhân viên cửa hàng được xác nhận đơn đã đến đúng cửa hàng của mình.",
    );
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(order.orderId))
    throw new Error("Mã đơn không hợp lệ.");
  const latest = await orderService.details(order.orderId, user.idStore!);
  if (
    latest.orderId.toLowerCase() !== order.orderId.toLowerCase() ||
    !canCompleteOrder(user, latest)
  )
    throw new Error(
      "Đơn đã thay đổi trạng thái. Đóng và tải lại trước khi tiếp tục.",
    );
  try {
    await api(`/order/${order.orderId}/complete`, {
      method: "PUT",
      body: JSON.stringify({ feedback: feedback.trim() || null }),
    });
  } catch {
    // Read back even after failure: the server may have committed before connection loss.
  }
  const after = await orderService
    .details(order.orderId, user.idStore!)
    .catch(() => null);
  if (
    after?.orderId.toLowerCase() === order.orderId.toLowerCase() &&
    after.status === "Completed"
  )
    return after;
  throw new Error(
    "Chưa xác nhận được kết quả nhận hàng. Đóng và tải lại để kiểm tra; không tự gửi lại yêu cầu.",
  );
}
