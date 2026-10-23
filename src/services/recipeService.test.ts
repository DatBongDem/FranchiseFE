import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  recipeService,
  validateRecipe,
  recipeFingerprint,
  type RecipeDetails,
} from "./recipeService";
import { allowed } from "../components/Sidebar";
const id = "aaaaaaaa-1111-2222-3333-444444444444";
const product = "bbbbbbbb-1111-2222-3333-444444444444";
const ingredient = "cccccccc-1111-2222-3333-444444444444";
const catalog = [
  { ingredientId: ingredient, ingredientName: "Bột", unit: "kg" },
];
const original: RecipeDetails = {
  recipeID: id,
  description: "Cũ",
  ingredients: [{ ingredientID: ingredient, quantity: 1 }],
};
const next = {
  ...original,
  description: "Mới",
  ingredients: [{ ingredientID: ingredient, quantity: 1.25 }],
};
const fetchMock = vi.fn();
it("creates with full ingredient payload and verifies stored details", async () => {
  reply([]);
  reply(
    {
      productId: product,
      description: next.description,
      ingredients: next.ingredients,
    },
    201,
  );
  reply([{ recipeID: id, productID: product, description: next.description }]);
  reply(next);
  expect(
    (
      await recipeService.create(
        "ADMIN",
        product,
        next.description,
        next.ingredients,
        catalog,
      )
    ).recipeID,
  ).toBe(id);
  expect(fetchMock.mock.calls[1][0]).toBe("/api/recipe");
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: "POST",
    body: JSON.stringify({
      productId: product,
      description: next.description,
      ingredients: next.ingredients,
    }),
  });
});
it("blocks creating a duplicate product recipe case insensitively", async () => {
  reply([
    { recipeID: id, productID: product.toUpperCase(), description: "Existing" },
  ]);
  await expect(
    recipeService.create(
      "KITCHENSTAFF",
      product,
      "",
      next.ingredients,
      catalog,
    ),
  ).rejects.toThrow("đã có công thức");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("requires at least one ingredient before any request", async () => {
  await expect(
    recipeService.create("ADMIN", product, "", [], catalog),
  ).rejects.toThrow("ít nhất");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("requires valid product ID before any request", async () => {
  await expect(
    recipeService.create("ADMIN", "bad", "", next.ingredients, catalog),
  ).rejects.toThrow("sản phẩm hợp lệ");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects duplicate creation ingredients before any request", async () => {
  await expect(
    recipeService.create(
      "ADMIN",
      product,
      "",
      [...next.ingredients, ...next.ingredients],
      catalog,
    ),
  ).rejects.toThrow("trùng");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects unknown creation ingredient before any request", async () => {
  await expect(
    recipeService.create("ADMIN", product, "", next.ingredients, []),
  ).rejects.toThrow("danh mục");
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["MANAGER", "STORESTAFF", "SUPPLYCOORDINATOR"] as const)(
  "blocks creation by %s",
  async (role) => {
    await expect(
      recipeService.create(role, product, "", next.ingredients, catalog),
    ).rejects.toThrow("không có quyền");
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it("does not replay POST after network loss", async () => {
  reply([]);
  fetchMock.mockRejectedValueOnce(new Error("offline"));
  await expect(
    recipeService.create("ADMIN", product, "", next.ingredients, catalog),
  ).rejects.toThrow("Chưa xác nhận");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("warns about partial creation after server failure", async () => {
  reply([]);
  reply({ message: "insert failed" }, 500);
  await expect(
    recipeService.create("ADMIN", product, "", next.ingredients, catalog),
  ).rejects.toThrow("một phần");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("does not claim creation if readback ingredients differ", async () => {
  reply([]);
  reply({}, 201);
  reply([{ recipeID: id, productID: product, description: next.description }]);
  reply({ ...next, ingredients: [] });
  await expect(
    recipeService.create(
      "ADMIN",
      product,
      next.description,
      next.ingredients,
      catalog,
    ),
  ).rejects.toThrow("Chưa xác nhận");
});
it("does not claim creation if new recipe cannot be found", async () => {
  reply([]);
  reply({}, 201);
  reply([]);
  await expect(
    recipeService.create("ADMIN", product, "", next.ingredients, catalog),
  ).rejects.toThrow("Chưa xác nhận");
});
it("deletes once and verifies absence from the list", async () => {
  reply(original);
  reply("Recipe deleted successfully");
  reply([]);
  await recipeService.remove("ADMIN", original);
  expect(fetchMock.mock.calls[1][0]).toBe(`/api/recipe/${id}`);
  expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("reconciles deletion when server returned an error", async () => {
  reply(original);
  reply({ message: "error" }, 500);
  reply([]);
  await expect(
    recipeService.remove("KITCHENSTAFF", original),
  ).resolves.toBeUndefined();
  expect(
    fetchMock.mock.calls.filter((c) => c[1]?.method === "DELETE"),
  ).toHaveLength(1);
});
it("does not claim deletion when recipe remains", async () => {
  reply(original);
  reply({ message: "constraint" }, 500);
  reply([
    { recipeID: id, productID: product, description: original.description },
  ]);
  await expect(recipeService.remove("ADMIN", original)).rejects.toThrow(
    "Chưa xác nhận",
  );
});
it("does not claim deletion when verification fails", async () => {
  reply(original);
  reply("ok");
  reply({ message: "offline" }, 500);
  await expect(recipeService.remove("ADMIN", original)).rejects.toThrow(
    "Chưa xác nhận",
  );
});
it("blocks deletion after concurrent edits", async () => {
  reply({ ...original, description: "changed" });
  await expect(recipeService.remove("ADMIN", original)).rejects.toThrow(
    "đã thay đổi",
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("blocks deletion for disallowed roles without fetching", async () => {
  await expect(recipeService.remove("STORESTAFF", original)).rejects.toThrow(
    "không có quyền",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not send DELETE when details are already absent", async () => {
  reply(null, 204);
  await expect(recipeService.remove("ADMIN", original)).rejects.toThrow(
    "không còn tồn tại",
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
const reply = (data: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(status === 204 ? null : JSON.stringify(data), { status }),
  );
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => "token" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("reads recipeID and productID without assuming ingredient details in list", async () => {
  reply([
    {
      RecipeID: id,
      ProductID: product,
      Description: "Cũ",
      RecipeIngredients: [],
    },
  ]);
  const list = await recipeService.list("ADMIN");
  expect(list[0].recipeID).toBe(id);
  expect(list[0].productID).toBe(product);
});
it("loads with-ingredients and normalizes decimal quantities", async () => {
  reply({
    ...original,
    ingredients: [{ ingredientID: ingredient, quantity: "1.25" }],
  });
  expect(
    (await recipeService.details("KITCHENSTAFF", id)).ingredients[0].quantity,
  ).toBe(1.25);
  expect(fetchMock.mock.calls[0][0]).toBe(`/api/recipe/${id}/with-ingredients`);
});
it("handles deleted recipe 204", async () => {
  reply(null, 204);
  await expect(recipeService.details("ADMIN", id)).rejects.toThrow(
    "không còn tồn tại",
  );
});
it.each(["MANAGER", "STORESTAFF", "SUPPLYCOORDINATOR"] as const)(
  "denies %s at route and mutation",
  async (role) => {
    expect(allowed("/recipes", role)).toBe(false);
    await expect(
      recipeService.update(role, original, next, product, catalog),
    ).rejects.toThrow("không có quyền");
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it.each(["ADMIN", "KITCHENSTAFF"] as const)("allows %s route", (role) =>
  expect(allowed("/recipes", role)).toBe(true),
);
it("checks latest details, sends full replacement and verifies saved result", async () => {
  reply(original);
  reply("Recipe updated successfully");
  reply(next);
  expect(
    await recipeService.update("ADMIN", original, next, product, catalog),
  ).toEqual(next);
  expect(fetchMock.mock.calls[1][0]).toBe(`/api/recipe/${id}`);
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: "PUT",
    body: JSON.stringify({
      productId: product,
      description: next.description,
      ingredients: next.ingredients,
    }),
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("blocks stale edits without sending PUT", async () => {
  reply({ ...original, description: "Other user" });
  await expect(
    recipeService.update("ADMIN", original, next, product, catalog),
  ).rejects.toThrow("phiên khác");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("fingerprint ignores line order and ID casing", () => {
  expect(recipeFingerprint(original)).toBe(
    recipeFingerprint({
      ...original,
      ingredients: [{ ingredientID: ingredient.toUpperCase(), quantity: 1 }],
    }),
  );
});
it.each([0, -1, NaN, Infinity, 0.001, 1e15])(
  "rejects quantity %s",
  (quantity) => {
    expect(() =>
      validateRecipe(
        { ...next, ingredients: [{ ingredientID: ingredient, quantity }] },
        catalog,
      ),
    ).toThrow("Định lượng");
  },
);
it("rejects duplicate ingredients regardless of casing", () => {
  expect(() =>
    validateRecipe(
      {
        ...next,
        ingredients: [
          ...next.ingredients,
          { ingredientID: ingredient.toUpperCase(), quantity: 2 },
        ],
      },
      catalog,
    ),
  ).toThrow("trùng");
});
it("rejects ingredient missing from catalog before write", async () => {
  await expect(
    recipeService.update("ADMIN", original, next, product, []),
  ).rejects.toThrow("danh mục");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("supports explicit empty replacement as API permits", async () => {
  const empty = { ...next, ingredients: [] };
  reply(original);
  reply("ok");
  reply(empty);
  await recipeService.update("ADMIN", original, empty, product, catalog);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).ingredients).toEqual([]);
});
it("does not retry failed PUT and warns about partial persistence", async () => {
  reply(original);
  reply({ message: "failed" }, 500);
  await expect(
    recipeService.update("ADMIN", original, next, product, catalog),
  ).rejects.toThrow("một phần");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("does not claim success when readback differs", async () => {
  reply(original);
  reply("ok");
  reply({ ...next, ingredients: [] });
  await expect(
    recipeService.update("ADMIN", original, next, product, catalog),
  ).rejects.toThrow("Chưa xác nhận");
});
it("rejects malformed details instead of defaulting to an empty replacement", async () => {
  reply({ ...original, ingredients: null });
  await expect(recipeService.details("ADMIN", id)).rejects.toThrow(
    "không hợp lệ",
  );
});
