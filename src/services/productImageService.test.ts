import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  productImageService,
  productImageSource,
  validateProductImage,
} from "./productImageService";
const product = {
  productId: "aaaaaaaa-1111-2222-3333-444444444444",
  productName: "Đậu",
  categoryId: "c",
  categoryName: "Món",
  price: 100,
  sellingPrice: 200,
  unit: "hộp",
  numberOfDaysToExpire: 3,
  image: "https://example.com/old.png",
};
const file = new File(["image"], "new.png", { type: "image/png" });
const mock = vi.fn();
const reply = (data: unknown, status = 200) =>
  mock.mockResolvedValueOnce(new Response(JSON.stringify(data), { status }));
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
] as const)("blocks %s", async (role) => {
  await expect(productImageService.upload(role, product, file)).rejects.toThrow(
    "Chỉ quản trị",
  );
  expect(mock).not.toHaveBeenCalled();
});
it.each(["https://example.com/new.png", "data:image/png;base64,aW1hZ2U="])(
  "uploads multipart and verifies %s",
  async (image) => {
    reply({ status: 0, product });
    reply({ status: 0, imageUrl: image });
    reply({ status: 0, product: { ...product, image } });
    expect(
      (await productImageService.upload("ADMIN", product, file)).image,
    ).toBe(image);
    const [url, options] = mock.mock.calls[1];
    expect(url).toBe(`/api/product/${product.productId}/image`);
    expect(options.method).toBe("PATCH");
    expect(options.body.get("file")).toBe(file);
    expect(options.headers).toEqual({ Authorization: "Bearer token" });
    expect(mock).toHaveBeenCalledTimes(3);
  },
);
it.each([
  new File([], "empty.png", { type: "image/png" }),
  new File(["x"], "x.svg", { type: "image/svg+xml" }),
  new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", {
    type: "image/png",
  }),
])("rejects invalid file before network", async (bad) => {
  await expect(
    productImageService.upload("ADMIN", product, bad),
  ).rejects.toThrow();
  expect(mock).not.toHaveBeenCalled();
});
it("accepts exact size limit", () =>
  expect(() =>
    validateProductImage(
      new File([new Uint8Array(10 * 1024 * 1024)], "max.png", {
        type: "image/png",
      }),
    ),
  ).not.toThrow());
it("rejects stale image", async () => {
  reply({ status: 0, product: { ...product, image: "changed" } });
  await expect(
    productImageService.upload("ADMIN", product, file),
  ).rejects.toThrow("đã thay đổi");
  expect(mock).toHaveBeenCalledTimes(1);
});
it("rejects missing product before upload", async () => {
  reply({ message: "missing" }, 400);
  await expect(
    productImageService.upload("ADMIN", product, file),
  ).rejects.toThrow();
  expect(mock).toHaveBeenCalledTimes(1);
});
it("does not retry lost upload response", async () => {
  reply({ status: 0, product });
  mock.mockRejectedValueOnce(new TypeError("network"));
  await expect(
    productImageService.upload("ADMIN", product, file),
  ).rejects.toThrow("không tự gửi lại");
  expect(mock).toHaveBeenCalledTimes(2);
});
it.each([{}, { status: -1 }, { status: 0, imageUrl: "javascript:alert(1)" }])(
  "rejects invalid upload response",
  async (result) => {
    reply({ status: 0, product });
    reply(result);
    await expect(
      productImageService.upload("ADMIN", product, file),
    ).rejects.toThrow("Chưa xác nhận");
  },
);
it("requires persisted image to match", async () => {
  reply({ status: 0, product });
  reply({ status: 0, imageUrl: "https://example.com/new.png" });
  reply({ status: 0, product });
  await expect(
    productImageService.upload("ADMIN", product, file),
  ).rejects.toThrow("Chưa xác nhận");
});
it.each([
  "javascript:alert(1)",
  "data:text/html;base64,YQ==",
  "data:image/svg+xml;base64,YQ==",
  "",
  undefined,
])("rejects unsafe image source %s", (value) =>
  expect(productImageSource(value)).toBeUndefined(),
);
