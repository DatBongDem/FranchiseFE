import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  productEditService,
  productFields,
  validateProductEdit,
} from "./productEditService";
const id = "aaaaaaaa-1111-2222-3333-444444444444";
const product = {
  productId: id,
  productName: "Đậu",
  categoryId: "c",
  categoryName: "Món",
  price: 100,
  sellingPrice: 200,
  unit: "hộp",
  numberOfDaysToExpire: 3,
};
const next = { ...productFields(product), productName: "Đậu mới", price: 150 };
const mock = vi.fn();
const reply = (v: unknown, status = 200) =>
  mock.mockResolvedValueOnce(new Response(JSON.stringify(v), { status }));
beforeEach(() => {
  vi.stubGlobal("fetch", mock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("loads latest product", async () => {
  reply({ status: 0, product });
  expect(await productEditService.get("ADMIN", id)).toEqual(product);
});
it.each([
  "MANAGER",
  "STORESTAFF",
  "KITCHENSTAFF",
  "SUPPLYCOORDINATOR",
] as const)("blocks %s", async (role) => {
  await expect(productEditService.update(role, product, next)).rejects.toThrow(
    "Chỉ quản trị",
  );
  expect(mock).not.toHaveBeenCalled();
});
it.each([
  { ...next, price: -1 },
  { ...next, sellingPrice: NaN },
  { ...next, price: 1.001 },
  { ...next, numberOfDaysToExpire: 1.5 },
  { ...next, productName: " " },
  { ...next, unit: "" },
])("validates edits", (v) => expect(() => validateProductEdit(v)).toThrow());
it("allows zero prices and expiry", () =>
  expect(() =>
    validateProductEdit({
      ...next,
      price: 0,
      sellingPrice: 0,
      numberOfDaysToExpire: 0,
    }),
  ).not.toThrow());
it("sends only supported fields and verifies saved values", async () => {
  reply({ status: 0, product });
  reply({ status: 0 });
  reply({ status: 0, product: { ...product, ...next } });
  await productEditService.update("ADMIN", product, next);
  expect(mock.mock.calls[1][1]).toMatchObject({
    method: "PUT",
    body: JSON.stringify(next),
  });
  expect(mock.mock.calls[1][0]).toBe(`/api/product/${id}`);
});
it("blocks stale edit", async () => {
  reply({ status: 0, product: { ...product, price: 999 } });
  await expect(
    productEditService.update("ADMIN", product, next),
  ).rejects.toThrow("phiên khác");
  expect(mock).toHaveBeenCalledTimes(1);
});
it("does not repeat failed update", async () => {
  reply({ status: 0, product });
  reply({}, 500);
  await expect(
    productEditService.update("ADMIN", product, next),
  ).rejects.toThrow("Chưa xác nhận");
  expect(mock).toHaveBeenCalledTimes(2);
});
it("rejects mismatched readback", async () => {
  reply({ status: 0, product });
  reply({ status: 0 });
  reply({ status: 0, product });
  await expect(
    productEditService.update("ADMIN", product, next),
  ).rejects.toThrow("Chưa xác nhận");
});
it("rejects wrong product response", async () => {
  reply({ status: 0, product: { ...product, productId: "other" } });
  await expect(productEditService.get("ADMIN", id)).rejects.toThrow(
    "không hợp lệ",
  );
});
it("rejects missing numeric value", async () => {
  reply({ status: 0, product: { ...product, price: null } });
  await expect(productEditService.get("ADMIN", id)).rejects.toThrow(
    "không hợp lệ",
  );
});
