import { useRef, useState, type FormEvent } from "react";
import { BookOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import DeleteRecipeModal from "../components/DeleteRecipeModal";
import { useResource } from "../hooks/useResource";
import {
  recipeService,
  validateRecipe,
  type Recipe,
  type RecipeDetails,
} from "../services/recipeService";
import { operationsService } from "../services/operationsService";
import { productService } from "../services/productService";
import {
  Feedback,
  Modal,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import type { Role } from "../types/user";
import type { Ingredient } from "../types/product";
function RecipeEditor({
  recipe,
  role,
  ingredients,
  name,
  onClose,
  onSaved,
}: {
  recipe: Recipe;
  role: Role;
  ingredients: Ingredient[];
  name: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const resource = useResource(
    () => recipeService.details(role, recipe.recipeID),
    [role, recipe.recipeID],
  );
  const [draft, setDraft] = useState<RecipeDetails>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const lock = useRef(false);
  const value = draft || resource.data;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value || !resource.data || lock.current) return;
    try {
      validateRecipe(value, ingredients);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (!value.ingredients.length && !confirmEmpty) {
      setError("Hãy xác nhận bỏ toàn bộ nguyên liệu trước khi lưu.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await recipeService.update(
        role,
        resource.data,
        value,
        recipe.productID,
        ingredients,
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Cập nhật công thức · ${name}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && value && (
        <form className="recipe-editor" onSubmit={submit}>
          <p>
            Sản phẩm: <strong>{name}</strong>. Lưu sẽ thay toàn bộ danh sách
            nguyên liệu bằng các dòng bên dưới.
          </p>
          <fieldset disabled={busy || blocked}>
            <label className="recipe-description">
              Mô tả / hướng dẫn chế biến
              <textarea
                rows={4}
                value={value.description}
                onChange={(e) =>
                  setDraft({ ...value, description: e.target.value })
                }
              />
            </label>
            <div className="section-top">
              <h3>Nguyên liệu ({value.ingredients.length})</h3>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setDraft({
                    ...value,
                    ingredients: [
                      ...value.ingredients,
                      { ingredientID: "", quantity: 1 },
                    ],
                  });
                  setConfirmEmpty(false);
                }}
              >
                <Plus size={16} /> Thêm dòng
              </button>
            </div>
            {value.ingredients.map((line, index) => {
              const selected = ingredients.find(
                (i) =>
                  i.ingredientId.toLowerCase() ===
                  line.ingredientID.toLowerCase(),
              );
              const update = (patch: Partial<typeof line>) =>
                setDraft({
                  ...value,
                  ingredients: value.ingredients.map((i, n) =>
                    n === index ? { ...i, ...patch } : i,
                  ),
                });
              return (
                <div className="recipe-line" key={index}>
                  <label>
                    Nguyên liệu {index + 1}
                    <select
                      required
                      value={line.ingredientID.toLowerCase()}
                      onChange={(e) => update({ ingredientID: e.target.value })}
                    >
                      <option value="">Chọn nguyên liệu</option>
                      {line.ingredientID && !selected && (
                        <option value={line.ingredientID.toLowerCase()}>
                          Không còn trong danh mục · {line.ingredientID}
                        </option>
                      )}
                      {ingredients.map((i) => (
                        <option
                          key={i.ingredientId}
                          value={i.ingredientId.toLowerCase()}
                          disabled={value.ingredients.some(
                            (d, n) =>
                              n !== index &&
                              d.ingredientID.toLowerCase() ===
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
                      type="number"
                      required
                      min="0.01"
                      max="999999999999.99"
                      step="0.01"
                      value={Number.isNaN(line.quantity) ? "" : line.quantity}
                      onChange={(e) =>
                        update({
                          quantity:
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Bỏ nguyên liệu ${index + 1}`}
                    onClick={() => {
                      setDraft({
                        ...value,
                        ingredients: value.ingredients.filter(
                          (_, n) => n !== index,
                        ),
                      });
                      setConfirmEmpty(false);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
            {!value.ingredients.length && (
              <label className="recipe-empty-confirm">
                <input
                  type="checkbox"
                  checked={confirmEmpty}
                  onChange={(e) => setConfirmEmpty(e.target.checked)}
                />{" "}
                Tôi xác nhận lưu công thức không có nguyên liệu.
              </label>
            )}
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
            <button className="button primary" disabled={busy || blocked}>
              {busy ? "Đang lưu…" : "Lưu công thức"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export default function RecipesPage() {
  const { user } = useAuth();
  const resource = useResource(async () => {
    const [recipes, products, ingredients] = await Promise.all([
      recipeService.list(user!.role),
      productService.list(),
      operationsService.ingredients(),
    ]);
    return { recipes, products, ingredients };
  }, [user!.role]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [editing, setEditing] = useState<Recipe>();
  const [deleting, setDeleting] = useState<Recipe>();
  const [notice, setNotice] = useState("");
  const name = (r: Recipe) =>
    resource.data?.products.find(
      (p) => p.productId.toLowerCase() === r.productID.toLowerCase(),
    )?.productName || `Sản phẩm #${r.productID.slice(0, 8)}`;
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const rows = (resource.data?.recipes || [])
    .filter((r) =>
      text(`${name(r)} ${r.description}`).includes(text(search.trim())),
    )
    .sort((a, b) => name(a).localeCompare(name(b), "vi"));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  return (
    <>
      <PageTitle
        eyebrow="CHẾ BIẾN / CÔNG THỨC"
        title="Chuẩn vị từng món ăn"
        description="Tra cứu và cập nhật định lượng nguyên liệu cho công thức sản phẩm."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Tải lại
        </button>
      </PageTitle>
      <div className="recipe-banner">
        <BookOpen size={32} />
        <div>
          <strong>Công thức nhất quán, chất lượng đồng đều</strong>
          <p>
            Chỉnh hướng dẫn chế biến, chọn nguyên liệu và định lượng theo đơn vị
            trong danh mục.
          </p>
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Danh sách công thức</h2>
          <SearchInput
            value={search}
            onChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            placeholder="Tìm tên sản phẩm, mô tả…"
          />
        </div>
        <Feedback
          loading={resource.loading}
          error={resource.error}
          empty={!rows.length}
          retry={resource.reload}
        />
        {!resource.loading && !resource.error && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>MÔ TẢ CÔNG THỨC</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * size, current * size).map((r) => (
                    <tr key={r.recipeID}>
                      <td>
                        <strong>{name(r)}</strong>
                        <small title={r.recipeID}>
                          #{r.recipeID.slice(0, 8).toUpperCase()}
                        </small>
                      </td>
                      <td className="recipe-summary">
                        {r.description || "Chưa có mô tả"}
                      </td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setNotice("");
                            setEditing(r);
                          }}
                        >
                          Cập nhật
                        </button>
                        <button
                          className="button cancel-order-button"
                          onClick={() => {
                            setNotice("");
                            setDeleting(r);
                          }}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={current}
              size={size}
              total={rows.length}
              onPage={setPage}
              onSize={(s) => {
                setSize(s);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
      {editing && resource.data && (
        <RecipeEditor
          recipe={editing}
          role={user!.role}
          ingredients={resource.data.ingredients}
          name={name(editing)}
          onClose={() => {
            setEditing(undefined);
            void resource.reload();
          }}
          onSaved={() => {
            setEditing(undefined);
            setNotice("Đã cập nhật và kiểm tra lại công thức thành công.");
            void resource.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteRecipeModal
          recipe={deleting}
          name={name(deleting)}
          role={user!.role}
          onClose={() => {
            setDeleting(undefined);
            void resource.reload();
          }}
          onDeleted={() => {
            setDeleting(undefined);
            setNotice("Đã xóa công thức và kiểm tra lại danh sách.");
            void resource.reload();
          }}
        />
      )}
    </>
  );
}
