import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { productDeleteService } from "./productDeleteService";
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
it.each([
  "MANAGER",
  "STORESTAFF",
  "KITCHENSTAFF",
  "SUPPLYCOORDINATOR",
] as const)("blocks %s before requests", async (role) => {
  await expect(productDeleteService.remove(role, product)).rejects.toThrow(
    "Chỉ quản trị",
  );
  expect(mock).not.toHaveBeenCalled();
});
it("rejects invalid ids", async () => {
  await expect(
    productDeleteService.remove("ADMIN", { ...product, productId: "bad" }),
  ).rejects.toThrow("Mã sản phẩm");
  expect(mock).not.toHaveBeenCalled();
});
it("deletes once with auth and verifies exact missing response", async () => {
  reply({ status: 0, product });
  reply({ status: 0 });
  reply({ status: -1, message: "Product does not exist!!!" }, 400);
  await productDeleteService.remove("ADMIN", product);
  expect(mock).toHaveBeenCalledTimes(3);
  expect(mock.mock.calls[1]).toEqual([
    `/api/product/${id}`,
    { method: "DELETE", headers: { Authorization: "Bearer token" } },
  ]);
});
it.each([
  { ...product, productName: "Đổi tên" },
  { ...product, categoryId: "other" },
])("blocks changed product", async (latest) => {
  reply({ status: 0, product: latest });
  await expect(productDeleteService.remove("ADMIN", product)).rejects.toThrow(
    "đã thay đổi",
  );
  expect(mock).toHaveBeenCalledTimes(1);
});
it("does not delete when preflight fails", async () => {
  reply({ message: "Product does not exist!!!" }, 400);
  await expect(productDeleteService.remove("ADMIN", product)).rejects.toThrow();
  expect(mock).toHaveBeenCalledTimes(1);
});
it.each([400, 404, 500])(
  "does not treat unrelated HTTP %s as deletion proof",
  async (status) => {
    reply({ status: 0, product });
    reply({ status: 0 });
    reply({ message: "Other error" }, status);
    await expect(productDeleteService.remove("ADMIN", product)).rejects.toThrow(
      "Chưa xác nhận",
    );
    expect(mock).toHaveBeenCalledTimes(3);
  },
);
it.each([{ status: 0, product }, {}, { status: -1 }])(
  "rejects unverified readback",
  async (result) => {
    reply({ status: 0, product });
    reply({ status: 0 });
    reply(result);
    await expect(productDeleteService.remove("ADMIN", product)).rejects.toThrow(
      "Chưa xác nhận",
    );
  },
);
it("does not retry ambiguous delete", async () => {
  reply({ status: 0, product });
  mock.mockRejectedValueOnce(new TypeError("network"));
  await expect(productDeleteService.remove("ADMIN", product)).rejects.toThrow(
    "không tự gửi lại",
  );
  expect(mock).toHaveBeenCalledTimes(2);
});
it("rejects unsuccessful delete body", async () => {
  reply({ status: 0, product });
  reply({ status: -1 });
  await expect(productDeleteService.remove("ADMIN", product)).rejects.toThrow(
    "Chưa xác nhận",
  );
  expect(mock).toHaveBeenCalledTimes(2);
});
