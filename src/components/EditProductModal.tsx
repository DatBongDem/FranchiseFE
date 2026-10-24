import { useRef, useState, type FormEvent } from "react";
import { useResource } from "../hooks/useResource";
import {
  productEditService,
  productFields,
  validateProductEdit,
  type ProductEdit,
} from "../services/productEditService";
import { Modal, Feedback } from "./ui";
import type { Role } from "../types/user";
export default function EditProductModal({
  id,
  role,
  onClose,
  onSaved,
}: {
  id: string;
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const resource = useResource(
    () => productEditService.get(role, id),
    [role, id],
  );
  const [draft, setDraft] = useState<ProductEdit>();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const value = draft || (resource.data && productFields(resource.data));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value || !resource.data || lock.current) return;
    try {
      validateProductEdit(value);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await productEditService.update(role, resource.data, value);
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
      title="Sửa thông tin sản phẩm"
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
            Danh mục: {resource.data?.categoryName || "Chưa phân loại"}. Danh
            mục và ảnh giữ nguyên.
          </p>
          <fieldset
            disabled={busy || blocked}
            style={{ border: 0, padding: 0 }}
          >
            <div className="form-grid">
              <label className="full">
                Tên sản phẩm
                <input
                  required
                  maxLength={150}
                  value={value.productName}
                  onChange={(e) =>
                    setDraft({ ...value, productName: e.target.value })
                  }
                />
              </label>
              {(["price", "sellingPrice", "numberOfDaysToExpire"] as const).map(
                (key) => (
                  <label key={key}>
                    {key === "price"
                      ? "Giá vốn (VNĐ)"
                      : key === "sellingPrice"
                        ? "Giá bán (VNĐ)"
                        : "Hạn sử dụng (ngày)"}
                    <input
                      type="number"
                      required
                      min="0"
                      step={key === "numberOfDaysToExpire" ? "1" : "0.01"}
                      max={
                        key === "numberOfDaysToExpire"
                          ? "2147483647"
                          : "999999999999.99"
                      }
                      value={Number.isNaN(value[key]) ? "" : value[key]}
                      onChange={(e) =>
                        setDraft({
                          ...value,
                          [key]:
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ),
              )}
              <label>
                Đơn vị
                <input
                  required
                  maxLength={30}
                  value={value.unit}
                  onChange={(e) => setDraft({ ...value, unit: e.target.value })}
                />
              </label>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="inline-error">
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
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
