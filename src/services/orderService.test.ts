import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orderService, validateQuantity } from "./orderService";
import { allowed } from "../components/Sidebar";

const orderId = "draft-1",
  storeId = "store-1";
const batch = {
  BatchId: "b1",
  ProductId: "p1",
  ProductName: "Cơm gà",
  QualityOrder: 2,
  Price: 40000,
  Unit: "phần",
};
const draft = {
  OrderId: orderId,
  StoreId: storeId,
  Status: "Creating",
  Type: "Normal",
  Note: "",
  TotalAmount: 40000,
  ProductBatches: [batch],
};
describe("create order workflow", () => {
  const fetchMock = vi.fn();
  const response = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status });
  const current = (value: unknown = draft, id = orderId) => {
    fetchMock.mockResolvedValueOnce(
      response({ hasCreatingOrder: true, orderId: id }),
    );
    fetchMock.mockResolvedValueOnce(response(value));
  };
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", { getItem: () => "token" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  it("loads the existing draft and normalizes nested batches", async () => {
    current();
    const result = await orderService.current(storeId);
    expect(result.productBatches[0]).toMatchObject({
      productId: "p1",
      qualityOrder: 2,
      price: 40000,
    });
    expect(result.totalAmount).toBe(40000);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/order/check-creating",
      "/api/order/draft-1/details",
    ]);
  });
  it("does not call APIs without an assigned store", async () => {
    await expect(orderService.current("")).rejects.toThrow("chưa được gán");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reports a missing draft without calling an unsupported create endpoint", async () => {
    fetchMock.mockResolvedValueOnce(response({ hasCreatingOrder: false }));
    await expect(orderService.current(storeId)).rejects.toThrow(
      "chưa có đơn nháp",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects a draft belonging to another store", async () => {
    current({ ...draft, StoreId: "other" });
    await expect(orderService.current(storeId)).rejects.toThrow("không thuộc");
  });
  it("stops mutations when another session replaces the draft", async () => {
    current({ ...draft, OrderId: "new-draft" }, "new-draft");
    await expect(orderService.add(orderId, storeId, "p2", 1)).rejects.toThrow(
      "phiên làm việc khác",
    );
    expect(fetchMock.mock.calls.every(([, options]) => !options.method)).toBe(
      true,
    );
  });
  it("adds products using the qualityOrder field", async () => {
    current();
    fetchMock.mockResolvedValueOnce(response({}));
    await orderService.add(orderId, storeId, "p2", 3);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/productbatches",
      expect.objectContaining({
        method: "POST",
        body: '{"productId":"p2","qualityOrder":3}',
      }),
    );
  });
  it("rejects duplicate products", async () => {
    current();
    await expect(orderService.add(orderId, storeId, "P1", 1)).rejects.toThrow(
      "đã có trong đơn",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 2147483648])(
    "rejects invalid quantity %s before network calls",
    async (quantity) => {
      await expect(
        orderService.add(orderId, storeId, "p2", quantity),
      ).rejects.toThrow("Số lượng");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("removes with explicit zero, never negative quantities", async () => {
    current();
    fetchMock.mockResolvedValueOnce(response(null));
    await orderService.setQuantity(orderId, storeId, "p1", 0);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/productbatches/p1",
      expect.objectContaining({ method: "PUT", body: '{"qualityOrder":0}' }),
    );
    expect(() => validateQuantity(-1, true)).toThrow();
  });
  it("saves PascalCase Type and Note required by the backend", async () => {
    current();
    fetchMock.mockResolvedValueOnce(response({}));
    await orderService.save(orderId, storeId, "Fast", "Không cay");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/order/draft-1",
      expect.objectContaining({
        method: "PUT",
        body: '{"Type":"Fast","Note":"Không cay"}',
      }),
    );
  });
  it("does not submit an empty order", async () => {
    current({ ...draft, ProductBatches: [] });
    await expect(
      orderService.send(orderId, storeId, "Normal", ""),
    ).rejects.toThrow("ít nhất một sản phẩm");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("saves metadata before submitting the original draft", async () => {
    current();
    current();
    fetchMock
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({}));
    await orderService.send(orderId, storeId, "Express", "Giao sớm");
    expect(
      fetchMock.mock.calls
        .filter(([, opts]) => opts.method)
        .map(([url]) => url),
    ).toEqual(["/api/order/draft-1", "/api/order/draft-1/sent-to-pending"]);
  });
  it("does not send if metadata save failed", async () => {
    current();
    current();
    fetchMock.mockResolvedValueOnce(response({ message: "Save failed" }, 400));
    await expect(
      orderService.send(orderId, storeId, "Normal", ""),
    ).rejects.toThrow("Save failed");
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("sent-to-pending")),
    ).toBe(false);
  });
  it("recognizes successful submission after a lost response without resubmitting", async () => {
    current();
    current();
    fetchMock
      .mockResolvedValueOnce(response({}))
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(response({ ...draft, Status: "Pending" }));
    await expect(
      orderService.send(orderId, storeId, "Normal", ""),
    ).resolves.toBeUndefined();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith("sent-to-pending")),
    ).toHaveLength(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/order/draft-1/details",
      expect.anything(),
    );
  });
  it("reports send failure when the order is still Creating", async () => {
    current();
    current();
    fetchMock
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ message: "Send failed" }, 400))
      .mockResolvedValueOnce(response(draft));
    await expect(
      orderService.send(orderId, storeId, "Normal", ""),
    ).rejects.toThrow("Send failed");
  });
  it("restricts direct navigation to STORESTAFF", () => {
    expect(allowed("/orders/new", "STORESTAFF")).toBe(true);
    for (const role of [
      "ADMIN",
      "MANAGER",
      "KITCHENSTAFF",
      "SUPPLYCOORDINATOR",
    ] as const)
      expect(allowed("/orders/new", role)).toBe(false);
  });
});
