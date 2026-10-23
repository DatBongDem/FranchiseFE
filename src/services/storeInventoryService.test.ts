import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  storeInventoryService,
  filterInventory,
} from "./storeInventoryService";
import { allowed } from "../components/Sidebar";
const storeId = "aaaaaaaa-1111-2222-3333-444444444444";
const item = {
  productId: "p1",
  productName: "Đậu hũ",
  unit: "hộp",
  totalQuantity: 2,
};
const fetchMock = vi.fn();
const reply = (value: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(value), { status }),
  );
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it.each(["MANAGER", "STORESTAFF"] as const)(
  "loads assigned store for %s",
  async (role) => {
    reply([item]);
    expect(
      await storeInventoryService.list({ role, idStore: storeId }),
    ).toEqual([item]);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/productbatches/${storeId}/inventory`,
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
    expect(allowed("/store-inventory", role)).toBe(true);
  },
);
it.each(["ADMIN", "KITCHENSTAFF", "SUPPLYCOORDINATOR"] as const)(
  "blocks %s",
  async (role) => {
    expect(allowed("/store-inventory", role)).toBe(false);
    await expect(
      storeInventoryService.list({ role, idStore: storeId }),
    ).rejects.toThrow("Chỉ quản lý");
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it.each([undefined, "bad"])(
  "requires valid assigned store %s",
  async (idStore) => {
    await expect(
      storeInventoryService.list({ role: "MANAGER", idStore }),
    ).rejects.toThrow("chưa được gán");
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it("normalizes SQL PascalCase and decimals", async () => {
  reply([
    {
      ProductId: "p1",
      ProductName: "Đậu hũ",
      Unit: "kg",
      TotalQuantity: "1.25",
    },
  ]);
  expect(
    (await storeInventoryService.list({ role: "MANAGER", idStore: storeId }))[0]
      .totalQuantity,
  ).toBe(1.25);
});
it("accepts empty inventory", async () => {
  reply([]);
  expect(
    await storeInventoryService.list({ role: "MANAGER", idStore: storeId }),
  ).toEqual([]);
});
it.each([
  null,
  {},
  [{ ...item, totalQuantity: null }],
  [{ ...item, totalQuantity: "" }],
  [{ ...item, totalQuantity: "NaN" }],
  [{ ...item, unit: null }],
])("rejects malformed inventory", async (value) => {
  reply(value);
  await expect(
    storeInventoryService.list({ role: "MANAGER", idStore: storeId }),
  ).rejects.toThrow("không hợp lệ");
});
it("explains forbidden access", async () => {
  reply({}, 403);
  await expect(
    storeInventoryService.list({ role: "MANAGER", idStore: storeId }),
  ).rejects.toThrow("không có quyền");
});
it("does not hide server errors as empty inventory", async () => {
  reply({ message: "server error" }, 500);
  await expect(
    storeInventoryService.list({ role: "MANAGER", idStore: storeId }),
  ).rejects.toThrow("server error");
});
it("searches accent-free names and IDs", () => {
  expect(filterInventory([item], "dau hu", "", "", "name")).toEqual([item]);
  expect(filterInventory([item], "P1", "", "", "name")).toEqual([item]);
  expect(filterInventory([item], "missing", "", "", "name")).toEqual([]);
});
it("filters zero stock and units without manufacturing missing products", () => {
  const items = [
    item,
    { ...item, productId: "p2", unit: "kg", totalQuantity: 0 },
  ];
  expect(filterInventory(items, "", "available", "", "name")).toEqual([item]);
  expect(filterInventory(items, "", "empty", "kg", "name")).toEqual([items[1]]);
});
it("sorts quantities without mutating input", () => {
  const items = [item, { ...item, productId: "p2", totalQuantity: 5 }];
  expect(
    filterInventory(items, "", "", "", "quantity-desc")[0].totalQuantity,
  ).toBe(5);
  expect(
    filterInventory(items, "", "", "", "quantity-asc")[0].totalQuantity,
  ).toBe(2);
  expect(items[0]).toBe(item);
});
