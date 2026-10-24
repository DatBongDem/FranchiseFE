import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  expiredInventoryService,
  validateExpiryDate,
} from "./expiredInventoryService";
import { allowed } from "../components/Sidebar";
const row = {
  productId: "p1",
  productName: "Đậu",
  unit: "kg",
  totalQuantity: 1.25,
};
const fetchMock = vi.fn();
const reply = (v: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(v), { status }));
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("sends calendar day unchanged, with auth", async () => {
  reply([row]);
  expect(await expiredInventoryService.byDate("ADMIN", "2026-10-24")).toEqual([
    row,
  ]);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/productbatches/inventory/expired-by-date/2026-10-24",
    expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
  );
  expect(allowed("/expired-inventory", "ADMIN")).toBe(true);
});
it.each([
  "MANAGER",
  "STORESTAFF",
  "KITCHENSTAFF",
  "SUPPLYCOORDINATOR",
] as const)("blocks %s at service and route", async (role) => {
  expect(allowed("/expired-inventory", role)).toBe(false);
  await expect(
    expiredInventoryService.byDate(role, "2026-10-24"),
  ).rejects.toThrow("Chỉ quản trị");
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["", "2026-02-30", "0000-01-01", "24/10/2026", "2026-10-24T00:00:00Z"])(
  "rejects invalid day %s",
  async (day) => {
    await expect(
      expiredInventoryService.byDate("ADMIN", day),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it("allows valid leap and future days", () => {
  expect(() => validateExpiryDate("2028-02-29")).not.toThrow();
});
it("accepts empty report", async () => {
  reply([]);
  expect(await expiredInventoryService.byDate("ADMIN", "2026-10-24")).toEqual(
    [],
  );
});
it("normalizes SQL fields and numeric strings", async () => {
  reply([
    { ProductId: "p1", ProductName: "Đậu", Unit: "kg", TotalQuantity: "0.125" },
  ]);
  expect(
    (await expiredInventoryService.byDate("ADMIN", "2026-10-24"))[0]
      .totalQuantity,
  ).toBe(0.125);
});
it.each([
  {},
  null,
  [{ ...row, totalQuantity: null }],
  [{ ...row, totalQuantity: "" }],
  [{ ...row, totalQuantity: 0 }],
  [{ ...row, totalQuantity: -1 }],
  [{ ...row, totalQuantity: "NaN" }],
])("rejects malformed report", async (v) => {
  reply(v);
  await expect(
    expiredInventoryService.byDate("ADMIN", "2026-10-24"),
  ).rejects.toThrow("không hợp lệ");
});
it("does not turn HTTP failures into empty reports", async () => {
  reply({ message: "server error" }, 500);
  await expect(
    expiredInventoryService.byDate("ADMIN", "2026-10-24"),
  ).rejects.toThrow("server error");
});
