import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { completeOrder, canCompleteOrder } from "./completeOrderService";
import { orderService } from "./orderService";
import type { DraftOrder } from "../types/order";
vi.mock("./orderService", () => ({ orderService: { details: vi.fn() } }));
const user = { role: "STORESTAFF" as const, idStore: "store" };
const order = {
  orderId: "aaaaaaaa-1111-2222-3333-444444444444",
  storeId: "store",
  status: "Arrived",
  totalAmount: 20000,
};
const details = vi.mocked(orderService.details);
const fetchMock = vi.fn();
const draft = (status: string): DraftOrder => ({
  ...order,
  status,
  type: "Normal",
  note: "",
  productBatches: [],
});
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
  details
    .mockResolvedValueOnce(draft("Arrived"))
    .mockResolvedValueOnce(draft("Completed"));
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ message: "Order marked as completed successfully." }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("sends feedback and verifies completed state", async () => {
  expect((await completeOrder(user, order, "  Đủ hàng  ")).status).toBe(
    "Completed",
  );
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/order/${order.orderId}/complete`,
    expect.objectContaining({ method: "PUT", body: '{"feedback":"Đủ hàng"}' }),
  );
  expect(details).toHaveBeenCalledTimes(2);
});
it("sends optional empty feedback as null in required body", async () => {
  await completeOrder(user, order, " ");
  expect(fetchMock.mock.calls[0][1].body).toBe('{"feedback":null}');
});
it.each(["ADMIN", "MANAGER", "KITCHENSTAFF", "SUPPLYCOORDINATOR"] as const)(
  "blocks %s",
  async (role) => {
    expect(canCompleteOrder({ ...user, role }, order)).toBe(false);
    await expect(completeOrder({ ...user, role }, order, "")).rejects.toThrow(
      "Chỉ nhân viên",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it.each([
  "Creating",
  "Pending",
  "PickedUp",
  "WaitingForCooking",
  "Cooking",
  "Cooked",
  "TakenFrom",
  "Completed",
  "Canceled",
])("blocks status %s", (status) =>
  expect(canCompleteOrder(user, { ...order, status })).toBe(false),
);
it("requires assigned matching store, case insensitive", () => {
  expect(canCompleteOrder({ ...user, idStore: undefined }, order)).toBe(false);
  expect(canCompleteOrder({ ...user, idStore: "other" }, order)).toBe(false);
  expect(canCompleteOrder({ ...user, idStore: "STORE" }, order)).toBe(true);
});
it("rejects invalid order ID", async () => {
  await expect(
    completeOrder(user, { ...order, orderId: "bad" }, ""),
  ).rejects.toThrow("Mã đơn");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("blocks stale status before PUT", async () => {
  details.mockReset().mockResolvedValue(draft("Canceled"));
  await expect(completeOrder(user, order, "")).rejects.toThrow("đã thay đổi");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("blocks wrong identity from detail response", async () => {
  details
    .mockReset()
    .mockResolvedValue({ ...draft("Arrived"), orderId: "other" });
  await expect(completeOrder(user, order, "")).rejects.toThrow("đã thay đổi");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not submit if loading latest detail fails", async () => {
  details.mockReset().mockRejectedValue(new Error("offline"));
  await expect(completeOrder(user, order, "")).rejects.toThrow("offline");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("reconciles lost response without repeating PUT", async () => {
  fetchMock.mockRejectedValue(new Error("offline"));
  expect((await completeOrder(user, order, "")).status).toBe("Completed");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("reconciles HTTP failure after committed update", async () => {
  fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
  expect((await completeOrder(user, order, "")).status).toBe("Completed");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("does not claim success if still Arrived", async () => {
  details.mockReset().mockResolvedValue(draft("Arrived"));
  await expect(completeOrder(user, order, "")).rejects.toThrow("Chưa xác nhận");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("does not claim success when verification is unavailable", async () => {
  details
    .mockReset()
    .mockResolvedValueOnce(draft("Arrived"))
    .mockRejectedValueOnce(new Error("offline"));
  await expect(completeOrder(user, order, "")).rejects.toThrow("Chưa xác nhận");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
