import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  ingredientHistoryService,
  filterIngredientHistory,
} from "./ingredientHistoryService";
import { allowed } from "../components/Sidebar";
const item = {
  ingredientId: "i1",
  ingredientName: "Đậu hũ",
  quantityUsed: 1.25,
  unit: "kg",
};
const data = {
  items: [item],
  totalRecords: 1,
  pageNumber: 1,
  pageSize: 6,
  totalPages: 1,
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
it("requests server pagination with authentication", async () => {
  reply({ status: 0, data });
  expect(await ingredientHistoryService.list("KITCHENSTAFF")).toEqual(data);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/ingredient/ingredient-history?pageNumber=1&pageSize=6",
    expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
  );
  expect(allowed("/ingredient-history", "KITCHENSTAFF")).toBe(true);
});
it.each(["ADMIN", "MANAGER", "STORESTAFF", "SUPPLYCOORDINATOR"] as const)(
  "denies %s at route and service",
  async (role) => {
    expect(allowed("/ingredient-history", role)).toBe(false);
    await expect(ingredientHistoryService.list(role)).rejects.toThrow(
      "Chỉ nhân viên bếp",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it.each([
  [0, 6],
  [1.5, 6],
  [1, 0],
  [1, 100],
])("rejects page %s size %s", async (page, size) => {
  await expect(
    ingredientHistoryService.list("KITCHENSTAFF", page, size),
  ).rejects.toThrow("Phân trang");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("accepts empty history", async () => {
  reply({
    status: 0,
    data: { ...data, items: [], totalRecords: 0, totalPages: 0 },
  });
  expect((await ingredientHistoryService.list("KITCHENSTAFF")).items).toEqual(
    [],
  );
});
it("normalizes PascalCase decimal values and preserves repeated ingredient rows", async () => {
  reply({
    Status: 0,
    Data: {
      Items: [
        {
          IngredientId: "i1",
          IngredientName: "N/A",
          QuantityUsed: "0.25",
          Unit: "kg",
        },
        { ...item },
      ],
      TotalRecords: 2,
      PageNumber: 1,
      PageSize: 6,
      TotalPages: 1,
    },
  });
  const result = await ingredientHistoryService.list("KITCHENSTAFF");
  expect(result.items).toHaveLength(2);
  expect(result.items[0].quantityUsed).toBe(0.25);
  expect(result.items[0].ingredientName).toBe("N/A");
});
it("loads a later page with requested size", async () => {
  reply({
    status: 0,
    data: {
      ...data,
      pageNumber: 2,
      pageSize: 12,
      totalRecords: 20,
      totalPages: 2,
    },
  });
  await ingredientHistoryService.list("KITCHENSTAFF", 2, 12);
  expect(fetchMock.mock.calls[0][0]).toContain("pageNumber=2&pageSize=12");
});
it.each([
  { ...data, items: null },
  { ...data, totalRecords: -1 },
  { ...data, pageNumber: 2 },
  { ...data, totalPages: 9 },
  { ...data, items: [{ ...item, quantityUsed: null }] },
  { ...data, items: [{ ...item, quantityUsed: "" }] },
])("rejects malformed data", async (invalid) => {
  reply({ status: 0, data: invalid });
  await expect(ingredientHistoryService.list("KITCHENSTAFF")).rejects.toThrow(
    "không hợp lệ",
  );
});
it("explains denied API permission", async () => {
  reply({}, 403);
  await expect(ingredientHistoryService.list("KITCHENSTAFF")).rejects.toThrow(
    "không có quyền",
  );
});
it("preserves server failures", async () => {
  reply({ message: "server error" }, 500);
  await expect(ingredientHistoryService.list("KITCHENSTAFF")).rejects.toThrow(
    "server error",
  );
});
it("filters names without accents and exact units without aggregating rows", () => {
  const items = [item, { ...item, quantityUsed: 3 }, { ...item, unit: "g" }];
  expect(filterIngredientHistory(items, "dau hu", "kg")).toHaveLength(2);
  expect(filterIngredientHistory(items, "", "")).toHaveLength(3);
  expect(filterIngredientHistory(items, "missing", "")).toEqual([]);
  expect(items).toHaveLength(3);
});
