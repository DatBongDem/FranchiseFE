import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, collection } from "./api";
import { productService } from "./productService";
import { operationsService } from "./operationsService";

describe("Franchise API contracts", () => {
  const fetchMock = vi.fn();
  const getItem = vi.fn();
  const removeItem = vi.fn();
  const dispatchEvent = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", { getItem, removeItem });
    vi.stubGlobal("window", { dispatchEvent });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  it("normalizes nested SQL records without changing status values", () => {
    expect(
      collection(
        {
          Products: [
            {
              ProductId: "p1",
              ProductBatches: [{ QualityOrder: 4, Status: "Cooking" }],
            },
          ],
        },
        "products",
      ),
    ).toEqual([
      {
        productId: "p1",
        productBatches: [{ qualityOrder: 4, status: "Cooking" }],
      },
    ]);
  });
  it("reads the actual singular category response key", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ category: [{ CategoryId: "c1", Name: "Món chính" }] }),
      ),
    );
    expect(await productService.categories()).toEqual([
      { categoryId: "c1", name: "Món chính" },
    ]);
  });
  it("treats the specific empty product response as an empty list", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Does not any product!!!" }), {
        status: 400,
      }),
    );
    expect(await productService.list()).toEqual([]);
  });
  it("does not swallow unrelated backend validation failures", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Other validation error" }), {
        status: 400,
      }),
    );
    await expect(productService.list()).rejects.toThrow(
      "Other validation error",
    );
  });
  it("attaches the current token and clears an expired session", async () => {
    getItem.mockReturnValue("test-token");
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(api("/users/me")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(removeItem).toHaveBeenCalledWith("franchise.token");
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
  it("does not expire an existing session when login credentials are rejected", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(api("/users/login")).rejects.toThrow();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
  it.each([
    ["ADMIN", "/order"],
    ["KITCHENSTAFF", "/order/orders"],
    ["SUPPLYCOORDINATOR", "/delivery"],
  ] as const)(
    "uses the authorized orders endpoint for %s",
    async (role, path) => {
      fetchMock.mockResolvedValue(new Response("[]"));
      await operationsService.orders(role);
      expect(fetchMock).toHaveBeenCalledWith(`/api${path}`, expect.any(Object));
    },
  );
  it("supports successful empty 204 mutation responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      operationsService.orderAction("order-1", "start-cooking"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/order/order-1/start-cooking",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
