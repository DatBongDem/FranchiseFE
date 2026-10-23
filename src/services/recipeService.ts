import { api, normalize } from "./api";
import type { Role } from "../types/user";
import type { Ingredient } from "../types/product";
export interface Recipe {
  recipeID: string;
  productID: string;
  description: string;
}
export interface RecipeDetails {
  recipeID: string;
  description: string;
  ingredients: { ingredientID: string; quantity: number }[];
}
const guid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const canEditRecipe = (role: Role) =>
  role === "ADMIN" || role === "KITCHENSTAFF";
function assertRole(role: Role) {
  if (!canEditRecipe(role))
    throw new Error(
      "Tài khoản không có quyền chỉnh sửa công thức trên giao diện.",
    );
}
export function recipeFingerprint(r: RecipeDetails) {
  return JSON.stringify([
    r.description,
    [...r.ingredients]
      .map((i) => [i.ingredientID.toLowerCase(), i.quantity])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ]);
}
export function validateRecipe(r: RecipeDetails, ingredients: Ingredient[]) {
  if (!guid.test(r.recipeID) || typeof r.description !== "string")
    throw new Error("Công thức không hợp lệ.");
  const ids = new Set<string>();
  for (const i of r.ingredients) {
    const id = i.ingredientID.toLowerCase();
    if (
      !guid.test(id) ||
      !ingredients.some((item) => item.ingredientId.toLowerCase() === id)
    )
      throw new Error("Vui lòng chọn nguyên liệu trong danh mục.");
    if (ids.has(id)) throw new Error("Không được chọn trùng nguyên liệu.");
    ids.add(id);
    if (
      !Number.isFinite(i.quantity) ||
      i.quantity <= 0 ||
      i.quantity > 999999999999.99 ||
      Math.abs(i.quantity * 100 - Math.round(i.quantity * 100)) > 0.00001
    )
      throw new Error(
        "Định lượng phải lớn hơn 0, tối đa 999.999.999.999,99 và có tối đa 2 chữ số thập phân.",
      );
  }
}
export const recipeService = {
  async create(
    role: Role,
    productID: string,
    description: string,
    lines: RecipeDetails["ingredients"],
    catalog: Ingredient[],
  ) {
    assertRole(role);
    if (!guid.test(productID))
      throw new Error("Vui lòng chọn sản phẩm hợp lệ.");
    if (!lines.length)
      throw new Error("Công thức phải có ít nhất một nguyên liệu.");
    validateRecipe(
      { recipeID: productID, description, ingredients: lines },
      catalog,
    );
    const existing = await this.list(role);
    if (
      existing.some(
        (r) => r.productID.toLowerCase() === productID.toLowerCase(),
      )
    )
      throw new Error(
        "Sản phẩm đã có công thức. Đóng và tải lại để cập nhật công thức hiện có.",
      );
    try {
      // POST returns the submitted DTO, not the newly generated recipe ID.
      await api("/recipe", {
        method: "POST",
        body: JSON.stringify({
          productId: productID,
          description,
          ingredients: lines,
        }),
      });
      const created = (await this.list(role)).filter(
        (r) => r.productID.toLowerCase() === productID.toLowerCase(),
      );
      if (created.length !== 1)
        throw new Error("Không xác định được công thức mới.");
      const saved = await this.details(role, created[0].recipeID);
      if (
        recipeFingerprint(saved) !==
        recipeFingerprint({
          recipeID: saved.recipeID,
          description,
          ingredients: lines,
        })
      )
        throw new Error("Dữ liệu lưu không khớp.");
      return created[0];
    } catch {
      throw new Error(
        "Chưa xác nhận được kết quả tạo. Công thức có thể đã được lưu một phần. Đóng và tải lại danh sách để kiểm tra; không tự gửi lại.",
      );
    }
  },
  async remove(role: Role, original: RecipeDetails) {
    assertRole(role);
    const latest = await this.details(role, original.recipeID);
    if (recipeFingerprint(latest) !== recipeFingerprint(original))
      throw new Error(
        "Công thức đã thay đổi. Đóng và mở lại để kiểm tra trước khi xóa.",
      );
    try {
      await api(`/recipe/${original.recipeID}`, { method: "DELETE" });
    } catch {
      // A lost response may follow a successful deletion; never replay DELETE.
    }
    const remaining = await this.list(role).catch(() => null);
    if (
      !remaining ||
      remaining.some(
        (r) => r.recipeID.toLowerCase() === original.recipeID.toLowerCase(),
      )
    )
      throw new Error(
        "Chưa xác nhận được việc xóa. Đóng và tải lại danh sách để kiểm tra trước khi thao tác tiếp.",
      );
  },
  async list(role: Role): Promise<Recipe[]> {
    assertRole(role);
    const data = normalize<Recipe[]>(await api("/recipe"));
    if (
      !Array.isArray(data) ||
      data.some(
        (r) =>
          !r ||
          !guid.test(r.recipeID) ||
          !guid.test(r.productID) ||
          typeof r.description !== "string",
      )
    )
      throw new Error("Danh sách công thức không hợp lệ.");
    return data;
  },
  async details(role: Role, id: string): Promise<RecipeDetails> {
    assertRole(role);
    if (!guid.test(id)) throw new Error("Mã công thức không hợp lệ.");
    const data = normalize<RecipeDetails>(
      await api(`/recipe/${id}/with-ingredients`),
    );
    if (!data)
      throw new Error("Công thức không còn tồn tại. Hãy tải lại danh sách.");
    if (
      data.recipeID?.toLowerCase() !== id.toLowerCase() ||
      typeof data.description !== "string" ||
      !Array.isArray(data.ingredients)
    )
      throw new Error("Chi tiết công thức không hợp lệ.");
    return {
      ...data,
      ingredients: data.ingredients.map((i) => {
        if (
          !i ||
          !guid.test(i.ingredientID) ||
          (typeof i.quantity !== "number" && typeof i.quantity !== "string") ||
          String(i.quantity).trim() === "" ||
          !Number.isFinite(Number(i.quantity))
        )
          throw new Error("Định lượng trả về không hợp lệ.");
        return { ...i, quantity: Number(i.quantity) };
      }),
    };
  },
  async update(
    role: Role,
    original: RecipeDetails,
    next: RecipeDetails,
    productID: string,
    ingredients: Ingredient[],
  ) {
    assertRole(role);
    validateRecipe(next, ingredients);
    if (original.recipeID !== next.recipeID || !guid.test(productID))
      throw new Error("Mã công thức hoặc sản phẩm không hợp lệ.");
    const latest = await this.details(role, original.recipeID);
    if (recipeFingerprint(latest) !== recipeFingerprint(original))
      throw new Error(
        "Công thức đã được thay đổi ở phiên khác. Đóng và mở lại để tải dữ liệu mới.",
      );
    try {
      await api(`/recipe/${next.recipeID}`, {
        method: "PUT",
        body: JSON.stringify({
          productId: productID,
          description: next.description,
          ingredients: next.ingredients,
        }),
      });
      const saved = await this.details(role, next.recipeID);
      if (recipeFingerprint(saved) !== recipeFingerprint(next))
        throw new Error("Kết quả lưu không khớp.");
      return saved;
    } catch {
      throw new Error(
        "Chưa xác nhận được kết quả lưu. API có thể đã cập nhật một phần. Đóng và mở lại công thức để kiểm tra; không tự gửi lại.",
      );
    }
  },
};
