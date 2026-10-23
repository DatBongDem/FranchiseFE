import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { shrinkageService } from "./shrinkageService";
import {
  expiryDay,
  filterShrinkage,
  shrinkageTotals,
  topShrinkageProducts,
  validateShrinkageFilter,
} from "../utils/shrinkage";
import { allowed } from "../components/Sidebar";
import type { ShrinkageItem } from "../types/shrinkage";
const storeId = "aaaaaaaa-1111-2222-3333-444444444444";
const user = { role: "MANAGER" as const, idStore: storeId };
const item: ShrinkageItem = {
  storeId,
  productId: "p1",
  productName: "Đậu hũ",
  expiredDate: "2026-10-01",
  expiredQuantity: 2,
  lossAmount: 20000,
};
const report = {
  summary: {
    storeId,
    calculatedAt: "2026-10-23T00:00:00Z",
    totalExpiredQuantity: 2,
    totalLossAmount: 20000,
  },
  items: [item],
};
const filter = { search: "", from: "", to: "" };
describe("store shrinkage API", () => {
  const fetchMock = vi.fn();
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status });
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", { getItem: () => "token" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  it("loads the assigned store snapshot without unsupported date parameters", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 0, data: report }));
    expect(await shrinkageService.report(user)).toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/productbatches/${storeId}/shrinkage`,
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });
  it.each([
    "ADMIN",
    "STORESTAFF",
    "KITCHENSTAFF",
    "SUPPLYCOORDINATOR",
  ] as const)(
    "blocks %s from API loading and direct route access",
    async (role) => {
      expect(allowed("/shrinkage", role)).toBe(false);
      await expect(shrinkageService.report({ ...user, role })).rejects.toThrow(
        "Chỉ quản lý",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("allows the manager route but requires an assigned store", async () => {
    expect(allowed("/shrinkage", "MANAGER")).toBe(true);
    await expect(shrinkageService.report({ role: "MANAGER" })).rejects.toThrow(
      "chưa được gán",
    );
    await expect(
      shrinkageService.report({ ...user, idStore: "invalid" }),
    ).rejects.toThrow("chưa được gán");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps valid empty snapshot totals", async () => {
    const empty = {
      summary: {
        ...report.summary,
        totalExpiredQuantity: 0,
        totalLossAmount: 0,
      },
      items: [],
    };
    fetchMock.mockResolvedValueOnce(json({ status: 0, data: empty }));
    expect(await shrinkageService.report(user)).toEqual(empty);
  });
  it("supports PascalCase responses, decimal strings, and SQL date serialization", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        Status: 0,
        Data: {
          Summary: {
            StoreId: storeId.toUpperCase(),
            CalculatedAt: report.summary.calculatedAt,
            TotalExpiredQuantity: "2",
            TotalLossAmount: "20000.75",
          },
          Items: [
            {
              StoreId: storeId,
              ProductId: "p1",
              ProductName: "Đậu hũ",
              ExpiredDate: "2026-10-01T00:00:00.000Z",
              ExpiredQuantity: "2",
              LossAmount: "20000.75",
            },
          ],
        },
      }),
    );
    const value = await shrinkageService.report(user);
    expect(value.summary.totalLossAmount).toBe(20000.75);
    expect(value.items[0].expiredDate).toBe("2026-10-01");
    expect(value.items[0].expiredQuantity).toBe(2);
  });
  it("rejects a cross-store summary even with no detail rows", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        status: 0,
        data: {
          ...report,
          summary: { ...report.summary, storeId: "other" },
          items: [],
        },
      }),
    );
    await expect(shrinkageService.report(user)).rejects.toThrow(
      "không thuộc cửa hàng",
    );
  });
  it("rejects cross-store detail rows", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        status: 0,
        data: { ...report, items: [{ ...item, storeId: "other" }] },
      }),
    );
    await expect(shrinkageService.report(user)).rejects.toThrow(
      "không thuộc cửa hàng",
    );
  });
  it("does not convert an invalid response into zero loss", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 0, data: {} }));
    await expect(shrinkageService.report(user)).rejects.toThrow(
      "báo cáo hao hụt hợp lệ",
    );
    fetchMock.mockResolvedValueOnce(
      json({
        status: 0,
        data: {
          ...report,
          summary: { ...report.summary, totalLossAmount: null },
        },
      }),
    );
    await expect(shrinkageService.report(user)).rejects.toThrow("Số liệu");
  });
  it("rejects malformed calculation timestamps and expiry dates", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        status: 0,
        data: {
          ...report,
          summary: { ...report.summary, calculatedAt: "not-a-date" },
        },
      }),
    );
    await expect(shrinkageService.report(user)).rejects.toThrow("Thời điểm");
    fetchMock.mockResolvedValueOnce(
      json({
        status: 0,
        data: { ...report, items: [{ ...item, expiredDate: "2026-02-30" }] },
      }),
    );
    await expect(shrinkageService.report(user)).rejects.toThrow(
      "không tồn tại",
    );
  });
  it("reports permission and server failures instead of rendering empty data", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "Forbidden" }, 403));
    await expect(shrinkageService.report(user)).rejects.toThrow(
      "cửa hàng được phân công",
    );
    fetchMock.mockResolvedValueOnce(json({ message: "Database error" }, 500));
    await expect(shrinkageService.report(user)).rejects.toThrow(
      "Database error",
    );
  });
});
describe("shrinkage exploration", () => {
  const items = [
    item,
    {
      ...item,
      expiredDate: "2026-10-02",
      expiredQuantity: 3,
      lossAmount: 30000,
    },
    {
      ...item,
      productId: "p2",
      productName: "Cơm gà",
      expiredDate: "2026-10-03",
      expiredQuantity: 4,
      lossAmount: 40000,
    },
  ];
  it("keeps SQL calendar dates unchanged rather than shifting timezone", () => {
    expect(expiryDay("2026-10-01T00:00:00.000Z")).toBe("2026-10-01");
    expect(expiryDay("2026-10-01")).toBe("2026-10-01");
    expect(() => expiryDay("garbage")).toThrow();
  });
  it("accepts unbounded and one-sided filters", () => {
    expect(() => validateShrinkageFilter(filter)).not.toThrow();
    expect(
      filterShrinkage(items, { ...filter, from: "2026-10-02" }, "date-asc"),
    ).toHaveLength(2);
    expect(
      filterShrinkage(items, { ...filter, to: "2026-10-01" }, "date-asc"),
    ).toHaveLength(1);
  });
  it("includes both expiry date boundaries", () => {
    expect(
      filterShrinkage(
        items,
        { ...filter, from: "2026-10-01", to: "2026-10-02" },
        "date-asc",
      ),
    ).toHaveLength(2);
    expect(
      filterShrinkage(
        items,
        { ...filter, from: "2026-10-02", to: "2026-10-02" },
        "date-asc",
      )[0].expiredQuantity,
    ).toBe(3);
  });
  it("rejects reversed or nonexistent dates", () => {
    expect(() =>
      validateShrinkageFilter({
        ...filter,
        from: "2026-10-03",
        to: "2026-10-01",
      }),
    ).toThrow();
    expect(() =>
      validateShrinkageFilter({ ...filter, from: "2026-02-29" }),
    ).toThrow();
    expect(() =>
      validateShrinkageFilter({ ...filter, from: "2024-02-29" }),
    ).not.toThrow();
  });
  it("matches Vietnamese names with or without accents", () => {
    expect(
      filterShrinkage(items, { ...filter, search: " DAU HU " }, "name"),
    ).toHaveLength(2);
    expect(
      filterShrinkage(items, { ...filter, search: "không có" }, "name"),
    ).toEqual([]);
  });
  it("sorts without changing the source snapshot", () => {
    expect(filterShrinkage(items, filter, "date-desc")[0].expiredDate).toBe(
      "2026-10-03",
    );
    expect(filterShrinkage(items, filter, "loss-desc")[0].lossAmount).toBe(
      40000,
    );
    expect(
      filterShrinkage(items, filter, "quantity-desc")[0].expiredQuantity,
    ).toBe(4);
    expect(items[0]).toBe(item);
  });
  it("aggregates the same product across dates before ranking loss", () => {
    expect(topShrinkageProducts(items)).toEqual([
      { id: "p1", name: "Đậu hũ", loss: 50000 },
      { id: "p2", name: "Cơm gà", loss: 40000 },
    ]);
  });
  it("distinguishes product count from product/date groups and filtered totals", () => {
    expect(shrinkageTotals(items)).toEqual({
      quantity: 9,
      loss: 90000,
      products: 2,
    });
    expect(
      shrinkageTotals(
        filterShrinkage(items, { ...filter, from: "2026-10-02" }, "date-asc"),
      ),
    ).toEqual({ quantity: 7, loss: 70000, products: 2 });
    expect(shrinkageTotals([])).toEqual({ quantity: 0, loss: 0, products: 0 });
  });
  it("limits rankings to five products and handles zero losses", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      ...item,
      productId: `p${i}`,
      lossAmount: i * 100,
    }));
    expect(topShrinkageProducts(many)).toHaveLength(5);
    expect(topShrinkageProducts(many)[0].loss).toBe(700);
    expect(topShrinkageProducts([{ ...item, lossAmount: 0 }])).toEqual([]);
  });
});
