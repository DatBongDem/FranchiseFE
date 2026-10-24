import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  productBatchService,
  filterBatches,
  validateBatchDates,
  batchDay,
  type ProductBatch,
} from "./productBatchService";
const id = "aaaaaaaa-1111-2222-3333-444444444444";
const item: ProductBatch = {
  batchId: "batch1",
  productId: id,
  productName: "Đậu",
  price: 12000,
  unit: "kg",
  qualityOrder: 5,
  remainingQuantity: 2,
  status: "Cooked",
  manufacture: "2026-10-01T00:00:00Z",
  expiry: "2026-10-23T00:00:00Z",
};
const fetchMock = vi.fn();
const reply = (data: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(data), { status }),
  );
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("loads batches for exact product with auth", async () => {
  reply([item]);
  expect(await productBatchService.list("ADMIN", id)).toEqual([item]);
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/productbatches/products/${id}/batches`,
    expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
  );
});
it.each([
  "MANAGER",
  "STORESTAFF",
  "KITCHENSTAFF",
  "SUPPLYCOORDINATOR",
] as const)("blocks global batch view for %s", async (role) => {
  await expect(productBatchService.list(role, id)).rejects.toThrow(
    "Chỉ quản trị",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects invalid product ID", async () => {
  await expect(productBatchService.list("ADMIN", "bad")).rejects.toThrow(
    "Mã sản phẩm",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it("maps no batches 404 to empty list", async () => {
  reply({}, 404);
  expect(await productBatchService.list("ADMIN", id)).toEqual([]);
});
it("preserves server failures", async () => {
  reply({ message: "error" }, 500);
  await expect(productBatchService.list("ADMIN", id)).rejects.toThrow("error");
});
it("normalizes PascalCase decimal values and nullable dates", async () => {
  reply([
    {
      BatchId: "b",
      ProductId: id,
      ProductName: "Đậu",
      Price: "12.5",
      Unit: "kg",
      QualityOrder: 5,
      RemainingQuantity: 0,
      Status: "Cooked",
      Manufacture: null,
      Expiry: null,
    },
  ]);
  const rows = await productBatchService.list("ADMIN", id);
  expect(rows[0].price).toBe(12.5);
  expect(rows[0].expiry).toBeNull();
});
it.each([
  {},
  [{ ...item, productId: "other" }],
  [{ ...item, price: null }],
  [{ ...item, expiry: "2026-02-30" }],
  [{ ...item, remainingQuantity: "" }],
])("rejects malformed or cross-product data", async (value) => {
  reply(value);
  await expect(productBatchService.list("ADMIN", id)).rejects.toThrow();
});
it("filters inclusive expiry dates and excludes unknown expiry only with date filter", () => {
  const items = [item, { ...item, batchId: "b2", expiry: null }];
  expect(filterBatches(items, "", "2026-10-23", "2026-10-23", "")).toEqual([
    item,
  ]);
  expect(filterBatches(items, "", "", "", "")).toHaveLength(2);
  expect(batchDay("2026-10-23T23:00:00Z")).toBe("2026-10-23");
});
it("validates date boundaries", () => {
  expect(() => validateBatchDates("2026-10-24", "2026-10-23")).toThrow();
  expect(() => validateBatchDates("2026-02-30", "")).toThrow();
  expect(() => validateBatchDates("", "2026-10-23")).not.toThrow();
});
it("searches batch ID and filters remaining quantity without mutation", () => {
  const items = [{ ...item, batchId: "B2", remainingQuantity: 0 }, item];
  expect(filterBatches(items, "BATCH1", "", "", "available")).toEqual([item]);
  expect(filterBatches(items, "", "", "", "empty")).toEqual([items[0]]);
  expect(items[0].batchId).toBe("B2");
});
