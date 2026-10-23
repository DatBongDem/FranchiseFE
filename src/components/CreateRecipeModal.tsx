import { useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "./ui";
import {
  recipeService,
  validateRecipe,
  type Recipe,
  type RecipeDetails,
} from "../services/recipeService";
import type { Product, Ingredient } from "../types/product";
import type { Role } from "../types/user";
export default function CreateRecipeModal({
  role,
  products,
  ingredients,
  recipes,
  onClose,
  onCreated,
}: {
  role: Role;
  products: Product[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const available = products.filter(
    (p) =>
      !recipes.some(
        (r) => r.productID.toLowerCase() === p.productId.toLowerCase(),
      ),
  );
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<RecipeDetails["ingredients"]>([
    { ingredientID: "", quantity: 1 },
  ]);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    try {
      if (!available.some((p) => p.productId === product))
        throw new Error("Vui lòng chọn sản phẩm chưa có công thức.");
      if (!lines.length) throw new Error("Hãy thêm ít nhất một nguyên liệu.");
      validateRecipe(
        { recipeID: product, description, ingredients: lines },
        ingredients,
      );
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await recipeService.create(
        role,
        product,
        description,
        lines,
        ingredients,
      );
      onCreated();
    } catch (e) {
      setError((e as Error).message);
      setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Tạo công thức mới"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="recipe-editor" onSubmit={submit}>
        <p>
          Mỗi sản phẩm có một công thức. Chọn nguyên liệu và định lượng theo đơn
          vị trong danh mục.
        </p>
        {!available.length && (
          <p role="status">
            Không có sản phẩm chưa có công thức. Hãy thêm sản phẩm hoặc cập nhật
            công thức hiện có.
          </p>
        )}
        {!ingredients.length && (
          <p role="status">
            Chưa có nguyên liệu. Hãy thêm nguyên liệu trước khi tạo công thức.
          </p>
        )}
        <fieldset disabled={busy || blocked}>
          <label className="recipe-description">
            Sản phẩm
            <select
              value={product}
              required
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Chọn sản phẩm chưa có công thức</option>
              {available.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.unit})
                </option>
              ))}
            </select>
          </label>
          <label className="recipe-description">
            Mô tả / hướng dẫn chế biến
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Các bước sơ chế, chế biến và lưu ý…"
            />
          </label>
          <div className="section-top">
            <h3>Nguyên liệu ({lines.length})</h3>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setLines([...lines, { ingredientID: "", quantity: 1 }])
              }
            >
              <Plus size={16} /> Thêm dòng
            </button>
          </div>
          {lines.map((line, index) => {
            const selected = ingredients.find(
              (i) =>
                i.ingredientId.toLowerCase() ===
                line.ingredientID.toLowerCase(),
            );
            const update = (patch: Partial<typeof line>) =>
              setLines(
                lines.map((l, n) => (n === index ? { ...l, ...patch } : l)),
              );
            return (
              <div className="recipe-line" key={index}>
                <label>
                  Nguyên liệu {index + 1}
                  <select
                    required
                    value={line.ingredientID}
                    onChange={(e) => update({ ingredientID: e.target.value })}
                  >
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map((i) => (
                      <option
                        key={i.ingredientId}
                        value={i.ingredientId}
                        disabled={lines.some(
                          (l, n) =>
                            n !== index &&
                            l.ingredientID.toLowerCase() ===
                              i.ingredientId.toLowerCase(),
                        )}
                      >
                        {i.ingredientName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Định lượng {selected?.unit ? `(${selected.unit})` : ""}
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="999999999999.99"
                    step="0.01"
                    value={Number.isNaN(line.quantity) ? "" : line.quantity}
                    onChange={(e) =>
                      update({
                        quantity:
                          e.target.value === "" ? NaN : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Bỏ nguyên liệu ${index + 1}`}
                  onClick={() => setLines(lines.filter((_, n) => n !== index))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </fieldset>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            className="button primary"
            disabled={
              busy || blocked || !available.length || !ingredients.length
            }
          >
            {busy ? "Đang tạo…" : "Tạo công thức"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
