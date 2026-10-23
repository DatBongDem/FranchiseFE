import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cancelOrder, canCancelOrder } from "./cancelOrderService";
import { operationsService } from "./operationsService";
import type { Order } from "../types/product";
vi.mock("./operationsService", () => ({
  operationsService: { orders: vi.fn() },
}));
const user = { role: "MANAGER" as const, idStore: "store" };
const order: Order = {
  orderId: "aaaaaaaa-1111-2222-3333-444444444444",
  storeId: "store",
  status: "Pending",
  totalAmount: 20000,
};
const fetchMock = vi.fn();
const orders = vi.mocked(operationsService.orders);
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
  orders.mockResolvedValue([order]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it.each([
  "Creating",
  "Pending",
  "PickedUp",
  "WaitingForCooking",
  "Cooking",
  "Cooked",
  "TakenFrom",
  "Arrived",
])("allows %s", (status) => {
  expect(canCancelOrder(user, { ...order, status })).toBe(true);
});
it.each(["Completed", "Canceled", "Unknown"])("blocks %s", async (status) => {
  await expect(cancelOrder(user, { ...order, status }, "")).rejects.toThrow(
    "Không thể",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it("restricts store users to assigned store", () => {
  expect(canCancelOrder({ ...user, idStore: undefined }, order)).toBe(false);
  expect(canCancelOrder({ ...user, idStore: "other" }, order)).toBe(false);
  expect(canCancelOrder({ ...user, idStore: "STORE" }, order)).toBe(true);
});
it.each(["ADMIN", "KITCHENSTAFF", "SUPPLYCOORDINATOR"] as const)(
  "supports authenticated %s per API",
  (role) => {
    expect(canCancelOrder({ role }, order)).toBe(true);
  },
);
it("sends PUT with reason and validates success", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ...order, status: "Canceled" })),
  );
  expect((await cancelOrder(user, order, "  Đặt nhầm  ")).status).toBe(
    "Canceled",
  );
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/order/${order.orderId}/cancel`,
    expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ cancellationReason: "Đặt nhầm" }),
    }),
  );
});
it("permits optional blank reason", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ...order, status: "Canceled" })),
  );
  await cancelOrder(user, order, " ");
  expect(fetchMock.mock.calls[0][1].body).toBe('{"cancellationReason":null}');
});
it("does not mutate stale completed orders", async () => {
  orders.mockResolvedValue([{ ...order, status: "Completed" }]);
  await expect(cancelOrder(user, order, "")).rejects.toThrow("Đơn đã thay đổi");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not mutate missing orders", async () => {
  orders.mockResolvedValue([]);
  await expect(cancelOrder(user, order, "")).rejects.toThrow("Đơn đã thay đổi");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects invalid IDs before requests", async () => {
  await expect(
    cancelOrder(user, { ...order, orderId: "bad" }, ""),
  ).rejects.toThrow("Mã đơn");
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([400, 500])(
  "reconciles cancellation saved before HTTP %s",
  async (status) => {
    fetchMock.mockResolvedValue(new Response("{}", { status }));
    orders
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([{ ...order, status: "Canceled" }]);
    expect((await cancelOrder(user, order, "")).status).toBe("Canceled");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  },
);
it("does not replay a request after connection loss", async () => {
  fetchMock.mockRejectedValue(new Error("network"));
  await expect(cancelOrder(user, order, "")).rejects.toThrow("Chưa xác nhận");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("handles failed reconciliation without claiming success", async () => {
  fetchMock.mockRejectedValue(new Error("network"));
  orders
    .mockResolvedValueOnce([order])
    .mockRejectedValueOnce(new Error("network"));
  await expect(cancelOrder(user, order, "")).rejects.toThrow("Chưa xác nhận");
});
it("does not trust a mismatched success response", async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ ...order, orderId: "other", status: "Canceled" }),
    ),
  );
  await expect(cancelOrder(user, order, "")).rejects.toThrow("Chưa xác nhận");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
