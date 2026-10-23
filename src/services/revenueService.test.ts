import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revenueService } from "./revenueService";
import {
  filterRevenue,
  revenuePreset,
  validateRevenueRange,
  vietnamToday,
} from "../utils/revenue";
import { allowed } from "../components/Sidebar";
import type { ProductRevenue } from "../types/revenue";

const storeId = "aaaaaaaa-1111-2222-3333-444444444444";
const manager = { role: "MANAGER" as const, idStore: storeId };
const range = { from: "2026-10-01", to: "2026-10-23" };
const item: ProductRevenue = {
  storeId,
  saleDate: "2026-10-01T09:00:00Z",
  productId: "p1",
  productName: "Đậu hũ sốt cà",
  totalQuantitySold: 2,
  totalRevenue: 60000,
  totalCost: 40000,
  profit: 20000,
};
const report = {
  summary: {
    saleDate: "2026-10-01T00:00:00Z",
    totalRevenue: 60000,
    totalCost: 40000,
    totalProfit: 20000,
  },
  items: [item],
};

describe("store revenue API", () => {
  const fetchMock = vi.fn();
  const response = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status });
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", { getItem: () => "token" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  it("sends date-only parameters unchanged and uses the assigned store", async () => {
    fetchMock.mockResolvedValueOnce(response({ status: 0, data: report }));
    expect(await revenueService.report(manager, range)).toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/bills/stores/${storeId}/revenue?date=2026-10-01&endDate=2026-10-23`,
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });
  it("accepts the same start/end day", async () => {
    fetchMock.mockResolvedValueOnce(response({ status: 0, data: report }));
    await revenueService.report(manager, {
      from: "2026-10-23",
      to: "2026-10-23",
    });
    expect(fetchMock.mock.calls[0][0]).toContain(
      "date=2026-10-23&endDate=2026-10-23",
    );
  });
  it.each([
    "ADMIN",
    "STORESTAFF",
    "KITCHENSTAFF",
    "SUPPLYCOORDINATOR",
  ] as const)(
    "blocks %s according to actual backend service permissions",
    async (role) => {
      await expect(
        revenueService.report({ ...manager, role }, range),
      ).rejects.toThrow("Chỉ quản lý");
      expect(allowed("/revenue", role)).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("allows the manager route and rejects an unassigned store", async () => {
    expect(allowed("/revenue", "MANAGER")).toBe(true);
    await expect(
      revenueService.report({ role: "MANAGER" }, range),
    ).rejects.toThrow("chưa được gán");
    await expect(
      revenueService.report({ ...manager, idStore: "invalid" }, range),
    ).rejects.toThrow("chưa được gán");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects reversed date ranges without a network request", async () => {
    await expect(
      revenueService.report(manager, { from: range.to, to: range.from }),
    ).rejects.toThrow("Ngày kết thúc");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-10-00",
    "2026-1-1",
    "2026-10-01T00:00:00+07:00",
    "0000-01-01",
  ])("rejects invalid date %s", async (value) => {
    await expect(
      revenueService.report(manager, { from: value, to: range.to }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("handles leap-day boundaries correctly", () => {
    expect(() =>
      validateRevenueRange({ from: "2024-02-29", to: "2024-03-01" }),
    ).not.toThrow();
    expect(() =>
      validateRevenueRange({ from: "2100-02-29", to: "2100-03-01" }),
    ).toThrow();
  });
  it("preserves a valid empty report instead of treating it as an API failure", async () => {
    const empty = {
      summary: {
        ...report.summary,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
      },
      items: [],
    };
    fetchMock.mockResolvedValueOnce(response({ status: 0, data: empty }));
    expect(await revenueService.report(manager, range)).toEqual(empty);
  });
  it("preserves losses and normalizes decimal strings without rounding", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        status: 0,
        data: {
          summary: {
            ...report.summary,
            totalRevenue: "20000.50",
            totalCost: "40000.75",
            totalProfit: "-20000.25",
          },
          items: [
            {
              ...item,
              totalRevenue: "20000.50",
              totalCost: "40000.75",
              profit: "-20000.25",
              totalQuantitySold: "2",
            },
          ],
        },
      }),
    );
    const result = await revenueService.report(manager, range);
    expect(result.summary.totalProfit).toBe(-20000.25);
    expect(result.items[0].totalRevenue).toBe(20000.5);
    expect(result.items[0].totalQuantitySold).toBe(2);
  });
  it("normalizes PascalCase envelopes and fields", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        Status: 0,
        Data: {
          Summary: {
            SaleDate: range.from,
            TotalRevenue: 0,
            TotalCost: 0,
            TotalProfit: 0,
          },
          Items: [],
        },
      }),
    );
    expect(
      (await revenueService.report(manager, range)).summary.totalRevenue,
    ).toBe(0);
  });
  it("does not silently display zeros when the response is malformed", async () => {
    fetchMock.mockResolvedValueOnce(response({ status: 0, data: {} }));
    await expect(revenueService.report(manager, range)).rejects.toThrow(
      "báo cáo hợp lệ",
    );
    fetchMock.mockResolvedValueOnce(
      response({
        status: 0,
        data: { ...report, summary: { ...report.summary, totalRevenue: null } },
      }),
    );
    await expect(revenueService.report(manager, range)).rejects.toThrow(
      "Số liệu",
    );
  });
  it("rejects cross-store rows", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        status: 0,
        data: {
          ...report,
          items: [{ ...item, storeId: "bbbbbbbb-1111-2222-3333-444444444444" }],
        },
      }),
    );
    await expect(revenueService.report(manager, range)).rejects.toThrow(
      "không thuộc cửa hàng",
    );
  });
  it("shows an actionable permission error", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ message: "User does not have permission" }, 403),
    );
    await expect(revenueService.report(manager, range)).rejects.toThrow(
      "cửa hàng được phân công",
    );
  });
  it("propagates server errors rather than producing an empty report", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ message: "Database unavailable" }, 500),
    );
    await expect(revenueService.report(manager, range)).rejects.toThrow(
      "Database unavailable",
    );
  });
});

describe("revenue periods and product exploration", () => {
  it("uses the Vietnam calendar date even before UTC midnight", () => {
    const now = new Date("2026-10-22T18:00:00Z");
    expect(vietnamToday(now)).toBe("2026-10-23");
    expect(revenuePreset("today", now)).toEqual({
      from: "2026-10-23",
      to: "2026-10-23",
    });
  });
  it("includes exactly seven calendar days across month/year boundaries", () => {
    expect(revenuePreset("week", new Date("2026-01-02T10:00:00Z"))).toEqual({
      from: "2025-12-27",
      to: "2026-01-02",
    });
    expect(revenuePreset("month", new Date("2026-10-22T18:00:00Z"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-23",
    });
  });
  it("supports case-insensitive accent-free Vietnamese product search", () => {
    expect(filterRevenue([item], "  DAU HU  ", "name")).toEqual([item]);
    expect(filterRevenue([item], "không có", "name")).toEqual([]);
  });
  it("sorts copies without altering the complete report or its totals", () => {
    const second = {
      ...item,
      productId: "p2",
      productName: "Cơm gà",
      totalRevenue: 10000,
      profit: -2000,
      totalQuantitySold: 10,
    };
    const items = [item, second];
    expect(filterRevenue(items, "", "revenue-asc")[0].productId).toBe("p2");
    expect(filterRevenue(items, "", "profit-asc")[0].profit).toBe(-2000);
    expect(filterRevenue(items, "", "quantity-desc")[0].totalQuantitySold).toBe(
      10,
    );
    expect(items[0]).toBe(item);
    expect(report.summary.totalRevenue).toBe(60000);
  });
});
