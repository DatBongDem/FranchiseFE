import { useRef, useState } from "react";
import { useResource } from "../hooks/useResource";
import { productEditService } from "../services/productEditService";
import { productDeleteService } from "../services/productDeleteService";
import { Modal, Feedback, money } from "./ui";
import type { Role } from "../types/user";

export default function DeleteProductModal({
  id,
  role,
  onClose,
  onDeleted,
}: {
  id: string;
  role: Role;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const resource = useResource(
    () => productEditService.get(role, id),
    [role, id],
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function remove() {
    if (!confirmed || !resource.data || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await productDeleteService.remove(role, resource.data);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const p = resource.data;
  return (
    <Modal
      title="Xóa sản phẩm"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && p && (
        <div className="recipe-editor">
          <div className="detail-name">{p.productName}</div>
          <dl className="detail-list">
            <dt>Mã sản phẩm</dt>
            <dd>{p.productId}</dd>
            <dt>Danh mục</dt>
            <dd>{p.categoryName || "Chưa phân loại"}</dd>
            <dt>Giá bán</dt>
            <dd>
              {money(p.sellingPrice)} / {p.unit}
            </dd>
          </dl>
          <p>
            Sản phẩm sẽ bị ẩn khỏi danh mục chung. Thao tác này không xóa các lô
            hàng hay công thức liên quan. Giao diện hiện chưa hỗ trợ khôi phục
            sản phẩm.
          </p>
          <label className="recipe-empty-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || !!error}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Tôi xác nhận xóa sản phẩm này khỏi danh mục.
          </label>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              className="button cancel-order-button"
              disabled={!confirmed || busy || !!error || role !== "ADMIN"}
              onClick={() => void remove()}
            >
              {busy ? "Đang xóa…" : "Xóa sản phẩm"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
