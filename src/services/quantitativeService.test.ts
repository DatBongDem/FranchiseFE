import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  quantitativeService,
  validateQuantitative,
} from "./quantitativeService";
import { allowed } from "../components/Sidebar";
const storeId = "aaaaaaaa-1111-2222-3333-444444444444",
  productId = "bbbbbbbb-1111-2222-3333-444444444444";
const user = { role: "MANAGER" as const, idStore: storeId };
const row = { storeId, productId, productName: "Đậu", quantity: 10 };
const fetchMock = vi.fn();
const reply = (v: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(status === 204 ? null : JSON.stringify(v), { status }),
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
  "reads token store for %s",
  async (role) => {
    reply([row]);
    expect(await quantitativeService.list({ ...user, role })).toEqual([row]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/quantitative");
    expect(allowed("/quantitative", role)).toBe(true);
  },
);
it.each(["ADMIN", "KITCHENSTAFF", "SUPPLYCOORDINATOR"] as const)(
  "blocks %s",
  async (role) => {
    await expect(quantitativeService.list({ ...user, role })).rejects.toThrow(
      "Chỉ quản lý",
    );
    expect(allowed("/quantitative", role)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it.each([0, -1, 1.5, NaN, Infinity, 2147483648])("rejects quantity %s", (n) =>
  expect(() => validateQuantitative(n)).toThrow(),
);
it("accepts boundaries", () => {
  expect(() => validateQuantitative(1)).not.toThrow();
  expect(() => validateQuantitative(2147483647)).not.toThrow();
});
it("rejects missing store", async () => {
  await expect(quantitativeService.list({ role: "MANAGER" })).rejects.toThrow(
    "chưa được gán",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects cross-store response", async () => {
  reply([{ ...row, storeId: productId }]);
  await expect(quantitativeService.list(user)).rejects.toThrow("không thuộc");
});
it("accepts empty list", async () => {
  reply([]);
  expect(await quantitativeService.list(user)).toEqual([]);
});
it("handles 204 update and verifies quantity", async () => {
  reply([row]);
  reply(null, 204);
  reply([{ ...row, quantity: 20 }]);
  await quantitativeService.update(user, row, 20);
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: "PUT",
    body: '{"quantity":20}',
  });
  expect(fetchMock.mock.calls[1][0]).toBe(`/api/quantitative/${productId}`);
});
it("blocks stale edits", async () => {
  reply([{ ...row, quantity: 15 }]);
  await expect(quantitativeService.update(user, row, 20)).rejects.toThrow(
    "đã thay đổi",
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("reports missing rule", async () => {
  reply([row]);
  reply({}, 404);
  await expect(quantitativeService.update(user, row, 20)).rejects.toThrow(
    "Không còn",
  );
});
it("reconciles response loss without repeating PUT", async () => {
  reply([row]);
  fetchMock.mockRejectedValueOnce(new Error("network"));
  reply([{ ...row, quantity: 20 }]);
  await quantitativeService.update(user, row, 20);
  expect(
    fetchMock.mock.calls.filter((c) => c[1]?.method === "PUT"),
  ).toHaveLength(1);
});
it("does not claim success on readback mismatch", async () => {
  reply([row]);
  reply(null, 204);
  reply([row]);
  await expect(quantitativeService.update(user, row, 20)).rejects.toThrow(
    "Chưa xác nhận",
  );
});
it("normalizes PascalCase integers", async () => {
  reply([
    {
      StoreId: storeId,
      ProductId: productId,
      ProductName: "Đậu",
      Quantity: "10",
    },
  ]);
  expect(await quantitativeService.list(user)).toEqual([row]);
});
