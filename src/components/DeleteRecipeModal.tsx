import { useRef, useState } from "react";
import { Feedback, Modal } from "./ui";
import { useResource } from "../hooks/useResource";
import { recipeService, type Recipe } from "../services/recipeService";
import type { Role } from "../types/user";
export default function DeleteRecipeModal({
  recipe,
  name,
  role,
  onClose,
  onDeleted,
}: {
  recipe: Recipe;
  name: string;
  role: Role;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const resource = useResource(
    () => recipeService.details(role, recipe.recipeID),
    [role, recipe.recipeID],
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function remove() {
    if (lock.current || !confirmed || !resource.data) return;
    lock.current = true;
    setBusy(true);
    try {
      await recipeService.remove(role, resource.data);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Xóa công thức"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="recipe-editor">
        <p>
          Bạn đang xóa công thức của <strong>{name}</strong>.
        </p>
        <p>Mã công thức: {recipe.recipeID}</p>
        <Feedback
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
        {!resource.loading && !resource.error && resource.data && (
          <>
            <p className="recipe-summary">
              {resource.data.description || "Chưa có mô tả"}
            </p>
            <p>
              Công thức hiện có {resource.data.ingredients.length} dòng nguyên
              liệu.
            </p>
            <label className="recipe-empty-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy || !!error}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              Tôi xác nhận xóa công thức này. Không thể hoàn tác trên giao diện.
            </label>
          </>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            {error ? "Đóng và tải lại" : "Giữ công thức"}
          </button>
          <button
            className="button cancel-order-button"
            disabled={
              !confirmed ||
              busy ||
              !!error ||
              resource.loading ||
              !!resource.error
            }
            onClick={() => void remove()}
          >
            {busy ? "Đang xóa…" : "Xóa công thức"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
