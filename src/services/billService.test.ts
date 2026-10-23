import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  billService,
  BillUncertainError,
  salePrice,
  validateBillItems,
} from "./billService";
import {
  billAttemptKey,
  readBillAttempt,
  writeBillAttempt,
} from "./billAttempt";
import { allowed } from "../components/Sidebar";
const productId = "11111111-1111-1111-1111-111111111111";
const storeId = "22222222-2222-2222-2222-222222222222";
const userId = "33333333-3333-3333-3333-333333333333";
const billId = "44444444-4444-4444-4444-444444444444";
const user = { id: userId, idStore: storeId, role: "STORESTAFF" as const };
const items = [{ productId, quantity: 2 }];
const stock = [
  {
    ProductId: productId,
    ProductName: "Cơm gà",
    Unit: "phần",
    TotalQuantity: 3,
  },
];
const receipt = {
  BillId: billId,
  StoreId: storeId,
  UserId: userId,
  TotalAmount: 60000,
  Details: [
    {
      BillDetailId: "detail-1",
      ProductId: productId,
      ProductName: "Cơm gà",
      Quantity: 1,
      UnitPrice: 30000,
      TotalPrice: 30000,
    },
    {
      BillDetailId: "detail-2",
      ProductId: productId,
      ProductName: "Cơm gà",
      Quantity: 1,
      UnitPrice: 30000,
      TotalPrice: 30000,
    },
  ],
};
describe("bill API and submission recovery", () => {
  const fetchMock = vi.fn();
  let memory: Map<string, string>;
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status });
  beforeEach(() => {
    memory = new Map();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  it("loads only the assigned store inventory", async () => {
    fetchMock.mockResolvedValueOnce(json(stock));
    expect(await billService.stock(user)).toEqual([
      { productId, productName: "Cơm gà", unit: "phần", totalQuantity: 3 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/productbatches/${storeId}/inventory`,
      expect.anything(),
    );
  });
  it("uses selling price, with the same zero-price fallback as backend", () => {
    expect(salePrice({ sellingPrice: 30000, price: 20000 })).toBe(30000);
    expect(salePrice({ sellingPrice: 0, price: 20000 })).toBe(20000);
  });
  it.each([0, -1, 1.2, NaN, Infinity, 2147483648])(
    "blocks invalid quantity %s before requests",
    async (quantity) => {
      await expect(
        billService.create(user, [{ productId, quantity }], ""),
      ).rejects.toThrow("Số lượng");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("rejects an empty basket and invalid product IDs", () => {
    expect(() => validateBillItems([])).toThrow("ít nhất một");
    expect(() =>
      validateBillItems([{ productId: "invalid", quantity: 1 }]),
    ).toThrow("Mã sản phẩm");
  });
  it("rejects duplicate products rather than charging them twice", () => {
    expect(() => validateBillItems([...items, ...items])).toThrow("trùng");
  });
  it.each(["ADMIN", "MANAGER", "KITCHENSTAFF", "SUPPLYCOORDINATOR"] as const)(
    "denies create and route access to %s",
    async (role) => {
      expect(allowed("/bills", role)).toBe(false);
      await expect(
        billService.create({ ...user, role }, items, ""),
      ).rejects.toThrow("Chỉ nhân viên");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("allows cashier navigation but blocks missing store assignments", async () => {
    expect(allowed("/bills", "STORESTAFF")).toBe(true);
    await expect(
      billService.create({ ...user, idStore: undefined }, items, ""),
    ).rejects.toThrow("cửa hàng hợp lệ");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rechecks stock before POST and blocks stale basket quantities", async () => {
    fetchMock.mockResolvedValueOnce(json([{ ...stock[0], TotalQuantity: 1 }]));
    await expect(billService.create(user, items, "")).rejects.toThrow(
      "Không đủ tồn kho",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("treats a product missing from inventory as unavailable", async () => {
    fetchMock.mockResolvedValueOnce(json([]));
    await expect(billService.create(user, items, "")).rejects.toThrow(
      "Không đủ tồn kho",
    );
  });
  it("sends IDs and quantities only, normalizing the PascalCase BillId", async () => {
    fetchMock
      .mockResolvedValueOnce(json(stock))
      .mockResolvedValueOnce(json({ BillId: billId }));
    await expect(billService.create(user, items, "  Mang đi  ")).resolves.toBe(
      billId,
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/bills",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ items, note: "Mang đi" }),
      }),
    );
  });
  it("preserves 422 shortage errors for correction, without retrying POST", async () => {
    fetchMock
      .mockResolvedValueOnce(json(stock))
      .mockResolvedValueOnce(json({ message: "Insufficient stock" }, 422));
    await expect(billService.create(user, items, "")).rejects.toMatchObject({
      status: 422,
      message: "Insufficient stock",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not classify a preflight inventory failure as a submitted bill", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(
      billService.create(user, items, ""),
    ).rejects.not.toBeInstanceOf(BillUncertainError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("marks a lost POST response uncertain and never retries automatically", async () => {
    fetchMock
      .mockResolvedValueOnce(json(stock))
      .mockRejectedValueOnce(new TypeError("offline"));
    await expect(billService.create(user, items, "")).rejects.toBeInstanceOf(
      BillUncertainError,
    );
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(1);
  });
  it("marks 500 and malformed success results uncertain", async () => {
    fetchMock
      .mockResolvedValueOnce(json(stock))
      .mockResolvedValueOnce(json({}, 500));
    await expect(billService.create(user, items, "")).rejects.toBeInstanceOf(
      BillUncertainError,
    );
    fetchMock
      .mockResolvedValueOnce(json(stock))
      .mockResolvedValueOnce(json({ BillId: "" }));
    await expect(billService.create(user, items, "")).rejects.toBeInstanceOf(
      BillUncertainError,
    );
  });
  it("loads official receipt totals and preserves multiple FIFO detail lines", async () => {
    fetchMock.mockResolvedValueOnce(json(receipt));
    const result = await billService.receipt(user, billId);
    expect(result.totalAmount).toBe(60000);
    expect(result.details).toHaveLength(2);
    expect(result.details[0]).toMatchObject({
      unitPrice: 30000,
      totalPrice: 30000,
    });
  });
  it("does not recreate a bill if the print endpoint fails", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ message: "Print unavailable" }, 500),
    );
    await expect(billService.receipt(user, billId)).rejects.toThrow(
      "Print unavailable",
    );
    expect(fetchMock.mock.calls.every(([, options]) => !options.method)).toBe(
      true,
    );
  });
  it("rejects receipts from another account/store or a different ID", async () => {
    for (const override of [
      { UserId: storeId },
      { StoreId: userId },
      { BillId: userId },
    ]) {
      fetchMock.mockResolvedValueOnce(json({ ...receipt, ...override }));
      await expect(billService.receipt(user, billId)).rejects.toThrow();
    }
  });
  it("uses server pagination for the cashier's history", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ Data: [receipt], TotalRecords: 19, PageNumber: 2, PageSize: 6 }),
    );
    const result = await billService.history(user, 2, 6);
    expect(result.totalRecords).toBe(19);
    expect(result.data[0].billId).toBe(billId);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/bills/history?pageNumber=2&pageSize=6",
      expect.anything(),
    );
  });
  it("preserves a pending submission across reloads and isolates accounts", () => {
    const key = billAttemptKey(userId, storeId);
    writeBillAttempt(key, {
      status: "pending",
      startedAt: "2026-10-23T00:00:00Z",
    });
    expect(readBillAttempt(key)?.status).toBe("pending");
    expect(readBillAttempt(billAttemptKey(billId, storeId))).toBeNull();
  });
  it("retains the created bill ID until an explicit new transaction", () => {
    const key = billAttemptKey(userId, storeId);
    writeBillAttempt(key, {
      status: "created",
      startedAt: "2026-10-23T00:00:00Z",
      billId,
    });
    expect(readBillAttempt(key)).toMatchObject({ status: "created", billId });
    writeBillAttempt(key, null);
    expect(readBillAttempt(key)).toBeNull();
  });
  it("does not silently clear an unreadable submission record", () => {
    const key = billAttemptKey(userId, storeId);
    memory.set(key, "{invalid");
    expect(readBillAttempt(key)?.status).toBe("pending");
  });
});
