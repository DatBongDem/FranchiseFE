import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  historyParams,
  searchStoreOrders,
  storeOrderService,
  type StoreOrder,
} from "./storeOrderService";
import { allowed } from "../components/Sidebar";
const storeId = "aaaaaaaa-1111-2222-3333-444444444444";
const user = { role: "MANAGER" as const, idStore: storeId };
const q = { from: "", to: "", page: 1, size: 6 };
const bill: StoreOrder = {
  orderId: "bill-1",
  createdTime: "2026-10-22T20:00:00Z",
  totalAmount: 40000,
  status: "Completed",
  orderBy: "staff",
  details: [
    {
      batchId: "d1",
      productId: "p1",
      productName: "Đậu hũ",
      quantity: 2,
      unitPrice: 20000,
    },
  ],
};
const response = {
  status: 0,
  pageNumber: 1,
  pageSize: 6,
  totalRecords: 1,
  data: [bill],
};
const fetchMock = vi.fn();
it("accepts unsent drafts with no sender or sent time", async () => {
  reply({
    ...response,
    data: [
      {
        ...bill,
        createdTime: null,
        orderBy: null,
        status: "Creating",
        details: [],
      },
    ],
  });
  const result = await storeOrderService.history(user, q);
  expect(result.data[0].createdTime).toBeNull();
  expect(result.data[0].orderBy).toBeNull();
});
it("rejects invalid sent time instead of displaying a misleading date", async () => {
  reply({ ...response, data: [{ ...bill, createdTime: "invalid" }] });
  await expect(storeOrderService.history(user, q)).rejects.toThrow(
    "không hợp lệ",
  );
});
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
const reply = (value: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(value), { status }),
  );
it("requests the assigned store and server pagination with auth", async () => {
  reply(response);
  expect(await storeOrderService.history(user, q)).toEqual(response);
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/order/order-history/${storeId}?pageNumber=1&pageSize=6`,
    expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
  );
});
it.each(["ADMIN", "STORESTAFF", "KITCHENSTAFF", "SUPPLYCOORDINATOR"] as const)(
  "denies %s at service and route",
  async (role) => {
    expect(allowed("/store-orders", role)).toBe(false);
    await expect(
      storeOrderService.history({ ...user, role }, q),
    ).rejects.toThrow("Chỉ quản lý");
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it("requires assigned store", async () => {
  expect(allowed("/store-orders", "MANAGER")).toBe(true);
  await expect(
    storeOrderService.history({ role: "MANAGER" }, q),
  ).rejects.toThrow("chưa được gán");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("sends inclusive full Vietnam days including UTC rollover", () => {
  const p = historyParams({
    ...q,
    from: "2026-10-23",
    to: "2026-10-23",
    page: 2,
    size: 12,
  });
  expect(new Date(p.get("fromDate")!).toISOString()).toBe(
    "2026-10-22T17:00:00.000Z",
  );
  expect(new Date(p.get("toDate")!).toISOString()).toBe(
    "2026-10-23T16:59:59.999Z",
  );
  expect(p.get("pageNumber")).toBe("2");
});
it("allows open ended dates and omits blank filters", () => {
  expect(historyParams(q).has("fromDate")).toBe(false);
  expect(historyParams({ ...q, to: "2026-10-23" }).has("fromDate")).toBe(false);
  expect(historyParams({ ...q, from: "2026-10-23" }).has("toDate")).toBe(false);
});
it.each([
  { ...q, page: 0 },
  { ...q, page: 1.5 },
  { ...q, size: 0 },
  { ...q, from: "2026-02-30" },
  { ...q, from: "2026-10-24", to: "2026-10-23" },
])("rejects invalid request %j before fetch", async (input) => {
  await expect(storeOrderService.history(user, input)).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("accepts empty history", async () => {
  reply({ ...response, totalRecords: 0, data: [] });
  expect((await storeOrderService.history(user, q)).data).toEqual([]);
});
it("normalizes PascalCase and decimal SQL values without collapsing batch lines", async () => {
  reply({
    Status: 0,
    PageNumber: 1,
    PageSize: 6,
    TotalRecords: 1,
    Data: [
      {
        OrderId: "b",
        CreatedTime: bill.createdTime,
        Status: "Completed",
        OrderBy: "staff",
        TotalAmount: "80000",
        Details: [...bill.details, ...bill.details],
      },
    ],
  });
  const result = await storeOrderService.history(user, q);
  expect(result.data[0].totalAmount).toBe(80000);
  expect(result.data[0].details).toHaveLength(2);
});
it.each([
  { ...response, status: 1 },
  { ...response, totalRecords: -1 },
  { ...response, pageNumber: 2 },
  { ...response, data: null },
  { ...response, data: [{ ...bill, totalAmount: null }] },
  { ...response, data: [{ ...bill, details: null }] },
])("rejects malformed API data", async (value) => {
  reply(value);
  await expect(storeOrderService.history(user, q)).rejects.toThrow();
});
it("explains denied permission", async () => {
  reply({ message: "Forbidden" }, 403);
  await expect(storeOrderService.history(user, q)).rejects.toThrow(
    "không có quyền",
  );
});
it("preserves HTTP failures", async () => {
  reply({ message: "Server unavailable" }, 500);
  await expect(storeOrderService.history(user, q)).rejects.toThrow(
    "Server unavailable",
  );
});
it("searches ID and Vietnamese product names without changing the page data", () => {
  expect(searchStoreOrders([bill], "dau hu")).toEqual([bill]);
  expect(searchStoreOrders([bill], "BILL-1")).toEqual([bill]);
  expect(searchStoreOrders([bill], "missing")).toEqual([]);
  expect(bill.details).toHaveLength(1);
});
